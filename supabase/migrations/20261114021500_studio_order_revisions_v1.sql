-- One revision for a paid Brand & AI Kit order (brand-foundation-paid-v1).
-- Additive: an order's intake, approval digest and first output are never rewritten, and every
-- existing function keeps its signature. A revision is its own row, one per order. Its provider
-- calls are added to the order's existing usage ledger and count toward the daily generation cap.
-- Roll back with supabase/rollbacks/20261114021500_studio_order_revisions_v1.sql, which refuses to
-- run once a revision exists.

-- 1. A marker on the order, set once when its revision is requested. NULL means none.
alter table public.studio_orders add column revision_requested_at timestamptz;

-- 2. The revision. One row per order is the allowance. Its limits are bound when it is requested.
create table public.studio_order_revisions (
  order_id uuid primary key references public.studio_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  intake jsonb not null check (jsonb_typeof(intake) = 'object' and octet_length(intake::text) <= 24000),
  intake_hash text not null check (intake_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'queued' check (status in ('queued','generating','ready','needs_attention')),
  attempts integer not null default 0,
  call_limit integer not null check (call_limit between 1 and 2),
  order_cost_limit_microusd bigint not null check (order_cost_limit_microusd between 1 and 5000000),
  calls_recorded integer not null default 0 check (calls_recorded >= 0),
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  output jsonb check (output is null or (jsonb_typeof(output) = 'object'
    and coalesce(output->>'schemaVersion','') = 'brand-foundation-paid-v1' and octet_length(output::text) <= 150000)),
  ready_at timestamptz,
  constraint studio_revision_attempts_bound check (attempts between 0 and call_limit),
  constraint studio_revision_ready_has_output check (status <> 'ready' or output is not null),
  constraint studio_revision_lease_pair check ((lease_token is null) = (lease_expires_at is null))
);
create index studio_order_revisions_queue_idx on public.studio_order_revisions (next_attempt_at) where status in ('queued','generating');
alter table public.studio_order_revisions enable row level security;
revoke all on public.studio_order_revisions from public, anon, authenticated;
grant select, insert, update, delete on public.studio_order_revisions to service_role;

create function public.studio_order_revisions_contract() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('version','studio-order-revisions-v1','product','brand-foundation-paid-v1','window_days',7,'max_calls',2);
$$;

-- 3. Capacity. Unchanged except that a revision waiting to run reserves the calls it may still make,
-- so spent calls plus worst-case remaining commitments still cannot exceed the daily cap.
create or replace function public.studio_capacity_status(p_daily_limit integer default 20)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with capacity as (
    select least(greatest(coalesce(p_daily_limit,20),1),100) as daily_limit,
      (select count(*) from public.studio_order_events where event_type = 'generation_started'
        and created_at > now() - interval '24 hours') as spent,
      (select coalesce(sum(case
        when payment_status = 'awaiting_payment' and status = 'awaiting_payment' then 3
        when payment_status = 'paid' and refund_status = 'none' and output is null
          and status in ('queued','generating') then 3 - generation_attempts
        else 0 end),0) from public.studio_orders)
      + (select coalesce(sum(r.call_limit - r.attempts),0) from public.studio_order_revisions r
          join public.studio_orders o on o.id = r.order_id
          where r.status in ('queued','generating') and r.output is null
            and o.payment_status = 'paid' and o.refund_status = 'none' and o.status = 'ready') as reserved
  ) select jsonb_build_object('limit',daily_limit,'spent',spent,'reserved',reserved,
      'remaining',greatest(daily_limit - spent - reserved,0),
      'checkout_available',daily_limit - spent - reserved >= 3) from capacity;
$$;

-- 4. Request. The advisory lock is the one worker claims take, held before the order row, so the
-- capacity check and the reservation are atomic. Seven days run from the delivery email, or from
-- the moment the kit was ready when no email was sent. The same answers are not a revision.
create function public.studio_request_revision(
  p_order_id uuid, p_intake jsonb, p_intake_hash text,
  p_call_limit integer, p_order_cost_limit_microusd bigint, p_daily_limit integer default 20
) returns setof public.studio_order_revisions language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype; v_revision public.studio_order_revisions%rowtype; v_delivered timestamptz;
begin
  perform pg_advisory_xact_lock(682714302);
  select * into v_order from public.studio_orders where id = p_order_id for update;
  if not found then raise exception 'studio_order_missing'; end if;
  select * into v_revision from public.studio_order_revisions where order_id = p_order_id;
  if found then
    if v_revision.intake_hash <> p_intake_hash then raise exception 'studio_revision_already_used'; end if;
    return next v_revision; return;
  end if;
  select coalesce((select d.sent_at from public.studio_deliveries d where d.order_id = p_order_id), v_order.ready_at) into v_delivered;
  if v_order.product_version <> 'brand-foundation-paid-v1' or v_order.status <> 'ready' or v_order.output is null
    or v_order.payment_status <> 'paid' or v_order.refund_status <> 'none' or v_order.model_call_limit is null
    or v_delivered is null or v_delivered > now() or v_delivered < now() - interval '7 days' then
    raise exception 'studio_revision_not_eligible';
  end if;
  if jsonb_typeof(p_intake) is distinct from 'object' or coalesce(p_intake->>'acceptedTerms','') <> 'true'
    or coalesce(p_intake->>'approvedBackbrief','') <> 'true'
    or coalesce(p_intake->>'productVersion','') <> v_order.product_version
    or coalesce(p_intake->>'approvalSnapshotSha256','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_intake->'brand') is distinct from 'object'
    or coalesce(p_intake->>'email','') = ''
    or p_intake->>'email' is distinct from v_order.intake->>'email' then raise exception 'studio_invalid_intake'; end if;
  if p_intake->>'approvalSnapshotSha256' = coalesce(v_order.intake->>'approvalSnapshotSha256','') then
    raise exception 'studio_revision_unchanged';
  end if;
  if p_call_limit is null or p_order_cost_limit_microusd is null or p_call_limit not between 1 and 2
    or p_order_cost_limit_microusd not between 1 and 5000000 then raise exception 'studio_model_budget_required'; end if;
  if (public.studio_capacity_status(p_daily_limit)->>'remaining')::integer < p_call_limit then
    raise exception 'studio_temporarily_full';
  end if;
  insert into public.studio_order_revisions(order_id, intake, intake_hash, call_limit, order_cost_limit_microusd)
    values(p_order_id, p_intake, p_intake_hash, p_call_limit, p_order_cost_limit_microusd) returning * into v_revision;
  update public.studio_orders set revision_requested_at = now(), updated_at = now() where id = p_order_id;
  insert into public.studio_order_events(order_id, event_type, metadata) values(p_order_id, 'revision_requested',
    jsonb_build_object('call_limit', p_call_limit, 'order_cost_limit_microusd', p_order_cost_limit_microusd));
  return next v_revision;
end;
$$;

-- 5. Claim. Same lock and daily cap as an order claim. Each attempt is a 'generation_started' event,
-- marked as a revision, so it is counted as spent capacity like any other provider attempt.
create function public.studio_claim_revision(p_lease_token uuid, p_daily_limit integer default 20)
returns setof public.studio_order_revisions language plpgsql security invoker set search_path = '' as $$
declare v_revision public.studio_order_revisions%rowtype;
begin
  perform pg_advisory_xact_lock(682714302);
  with exhausted as (
    update public.studio_order_revisions set status = 'needs_attention', lease_token = null, lease_expires_at = null,
      last_error_code = 'revision_attempts_exhausted', updated_at = now()
    where status = 'generating' and lease_expires_at <= now() and attempts >= call_limit
    returning order_id
  ) insert into public.studio_order_events(order_id,event_type) select order_id,'revision_needs_attention' from exhausted;
  if (select count(*) from public.studio_order_events where event_type = 'generation_started' and created_at > now() - interval '24 hours') >= least(greatest(coalesce(p_daily_limit,20),1),100) then return; end if;
  select r.* into v_revision from public.studio_order_revisions r join public.studio_orders o on o.id = r.order_id
    where o.payment_status = 'paid' and o.refund_status = 'none' and o.status = 'ready'
      and r.attempts < r.call_limit and r.output is null and r.next_attempt_at <= now()
      and (r.status = 'queued' or (r.status = 'generating' and r.lease_expires_at <= now()))
    order by r.created_at asc for update of r skip locked limit 1;
  if not found then return; end if;
  update public.studio_order_revisions set status = 'generating', attempts = attempts + 1,
    lease_token = p_lease_token, lease_expires_at = now() + interval '3 minutes', updated_at = now()
    where order_id = v_revision.order_id returning * into v_revision;
  insert into public.studio_order_events(order_id,event_type,metadata)
    values(v_revision.order_id,'generation_started',jsonb_build_object('attempt',v_revision.attempts,'revision',true));
  return next v_revision;
end;
$$;

-- 6. One provider call for a revision, fenced by the revision's lease and added to the order's own
-- ledger. A call past either bound limit is kept truthfully and flagged, never rejected.
create function public.studio_add_revision_usage(p_order_id uuid, p_lease_token uuid, p_usage jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_revision public.studio_order_revisions%rowtype; v_order public.studio_orders%rowtype;
  v_cost bigint := public.studio_usage_number(p_usage,'cost_microusd');
  v_reported boolean := v_cost is not null and coalesce(p_usage->>'cost_basis','') = 'reported';
begin
  update public.studio_order_revisions set calls_recorded = calls_recorded + 1, updated_at = now()
    where order_id = p_order_id and lease_token = p_lease_token and status = 'generating'
    returning * into v_revision;
  if not found then return false; end if;
  update public.studio_orders set
    model_calls = model_calls + 1,
    model_input_tokens = model_input_tokens + coalesce(public.studio_usage_number(p_usage,'input_tokens'),0),
    model_output_tokens = model_output_tokens + coalesce(public.studio_usage_number(p_usage,'output_tokens'),0),
    model_cost_microusd = model_cost_microusd + coalesce(v_cost,0),
    model_cost_estimated = model_cost_estimated or not v_reported, updated_at = now()
    where id = p_order_id and model_call_limit is not null
    returning * into v_order;
  if not found then
    insert into public.studio_order_events(order_id,event_type) values(p_order_id,'revision_ledger_missing');
    return true;
  end if;
  insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'model_usage_recorded',
    jsonb_build_object('call',v_order.model_calls,'cost_microusd',v_cost,'reported',v_reported,
      'model',left(coalesce(p_usage->>'model',''),100),'revision',true));
  if v_revision.calls_recorded > v_revision.call_limit or v_order.model_cost_microusd > v_revision.order_cost_limit_microusd then
    insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'model_budget_breached',
      jsonb_build_object('calls',v_order.model_calls,'cost_microusd',v_order.model_cost_microusd,'revision',true));
  end if;
  return true;
end;
$$;

-- 7. Finish. The revised kit is saved on the revision row; the order's first output stays as it was.
create function public.studio_finish_revision(p_order_id uuid, p_lease_token uuid, p_output jsonb, p_usage jsonb default '{}'::jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_output) is distinct from 'object'
    or p_output->>'schemaVersion' is distinct from 'brand-foundation-paid-v1'
    or not (p_output ?& array['price','foundation','synthesis','provenance','requiresCustomerReview'])
    or p_output->>'requiresCustomerReview' is distinct from 'true'
    or jsonb_typeof(p_output->'foundation') is distinct from 'object'
    or jsonb_typeof(p_output->'synthesis') is distinct from 'object' then raise exception 'studio_invalid_output'; end if;
  perform public.studio_add_revision_usage(p_order_id, p_lease_token, p_usage);
  update public.studio_order_revisions set output = p_output, status = 'ready', ready_at = now(), updated_at = now(),
    lease_token = null, lease_expires_at = null, last_error_code = null
    where order_id = p_order_id and lease_token = p_lease_token and lease_expires_at > now()
      and status = 'generating' and output is null
      and exists(select 1 from public.studio_orders o where o.id = p_order_id
        and o.payment_status = 'paid' and o.refund_status = 'none' and o.status = 'ready');
  if not found then return false; end if;
  insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'revision_completed',p_usage);
  return true;
end;
$$;

-- 8. A failed attempt. One that reached the provider is metered first. After the last allowed
-- attempt the revision needs a person; the customer's first kit is untouched either way.
create function public.studio_fail_revision(p_order_id uuid, p_lease_token uuid, p_error_code text, p_usage jsonb default null)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_status text;
begin
  if p_usage is not null then perform public.studio_add_revision_usage(p_order_id, p_lease_token, p_usage); end if;
  update public.studio_order_revisions set status = case when attempts >= call_limit then 'needs_attention' else 'queued' end,
    next_attempt_at = now() + interval '2 minutes', lease_token = null, lease_expires_at = null,
    last_error_code = left(p_error_code,100), updated_at = now()
    where order_id = p_order_id and lease_token = p_lease_token and status = 'generating'
    returning status into v_status;
  if not found then return 'lease_lost'; end if;
  insert into public.studio_order_events(order_id,event_type,metadata)
    values(p_order_id,case when v_status = 'needs_attention' then 'revision_needs_attention' else 'revision_retry_scheduled' end,jsonb_build_object('code',left(p_error_code,100)));
  return v_status;
end;
$$;

-- 9. The measurement behind the stop condition in the decision log: more than 40 percent of the
-- first 25 paid Brand & AI Kit orders using their revision. Counts only; no order is identified.
create function public.studio_revision_measure() returns jsonb language sql stable security invoker set search_path = '' as $$
  with paid as (
    select o.id, row_number() over (order by o.paid_at, o.id) as n from public.studio_orders o
      where o.product_version = 'brand-foundation-paid-v1' and o.paid_at is not null
  ), counted as (
    select (select count(*) from paid) as paid_orders,
      (select count(*) from public.studio_order_revisions) as revisions,
      (select count(*) from paid p where p.n <= 25) as first_orders,
      (select count(*) from paid p join public.studio_order_revisions r on r.order_id = p.id where p.n <= 25) as first_revisions
  ) select jsonb_build_object('version','studio-revision-measure-v1','paid_orders',paid_orders,'revisions',revisions,
      'first_25_orders',first_orders,'first_25_revisions',first_revisions,
      'review_first_draft_quality',first_revisions * 100 > 40 * 25) from counted;
$$;

revoke all on function public.studio_order_revisions_contract() from public, anon, authenticated;
revoke all on function public.studio_request_revision(uuid,jsonb,text,integer,bigint,integer) from public, anon, authenticated;
revoke all on function public.studio_claim_revision(uuid,integer) from public, anon, authenticated;
revoke all on function public.studio_add_revision_usage(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.studio_finish_revision(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.studio_fail_revision(uuid,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.studio_revision_measure() from public, anon, authenticated;
grant execute on function public.studio_order_revisions_contract() to service_role;
grant execute on function public.studio_request_revision(uuid,jsonb,text,integer,bigint,integer) to service_role;
grant execute on function public.studio_claim_revision(uuid,integer) to service_role;
grant execute on function public.studio_add_revision_usage(uuid,uuid,jsonb) to service_role;
grant execute on function public.studio_finish_revision(uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function public.studio_fail_revision(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.studio_revision_measure() to service_role;
