-- Additive studio schema. All access is through server-held service-role credentials.
-- No policies or grants expose intake, capabilities, payment IDs, or outputs to browser roles.
create table public.studio_orders (
  id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  intake jsonb not null check (jsonb_typeof(intake) = 'object' and octet_length(intake::text) <= 24000),
  intake_hash text not null check (intake_hash ~ '^[a-f0-9]{64}$'),
  request_key_hash text not null unique check (request_key_hash ~ '^[a-f0-9]{64}$'),
  request_ip_hash text not null check (request_ip_hash ~ '^[a-f0-9]{64}$'),
  request_email_hash text not null check (request_email_hash ~ '^[a-f0-9]{64}$'),
  access_token_hash text not null check (access_token_hash ~ '^[a-f0-9]{64}$'),
  product_version text not null default 'marketing-setup-v1' check (product_version = 'marketing-setup-v1'),
  amount_total integer not null default 4900 check (amount_total = 4900),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_checkout_session_id text unique,
  checkout_expires_at timestamptz not null default (date_trunc('second',now()) + interval '1 hour'),
  stripe_payment_intent_id text unique,
  payment_status text not null default 'awaiting_payment' check (payment_status in ('awaiting_payment','paid','expired','refunded','disputed')),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','queued','generating','ready','needs_attention','cancelled')),
  generation_attempts integer not null default 0 check (generation_attempts between 0 and 3),
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  error_detail text,
  output jsonb check (output is null or (jsonb_typeof(output) = 'object' and output->>'schemaVersion' = '1' and octet_length(output::text) <= 100000)),
  paid_at timestamptz,
  ready_at timestamptz,
  refund_status text not null default 'none' check (refund_status in ('none','pending','completed','failed')),
  refund_requested_at timestamptz,
  stripe_refund_id text unique,
  refunded_amount integer not null default 0 check (refunded_amount between 0 and 4900),
  refund_attempts integer not null default 0 check (refund_attempts between 0 and 3),
  refund_next_attempt_at timestamptz not null default now(),
  refund_last_error_code text,
  check (status <> 'ready' or output is not null),
  check ((lease_token is null) = (lease_expires_at is null))
);

create table public.studio_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.studio_orders(id) on delete cascade,
  provider_event_id text unique,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 10000),
  created_at timestamptz not null default now()
);

create table public.studio_deliveries (
  order_id uuid primary key references public.studio_orders(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  lease_token uuid,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  provider_message_id text,
  last_error_code text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lease_token is null) = (lease_expires_at is null))
);

create index studio_orders_generation_queue_idx on public.studio_orders (next_attempt_at, paid_at) where status in ('queued','generating');
create index studio_orders_ip_rate_idx on public.studio_orders (request_ip_hash, created_at);
create index studio_orders_email_rate_idx on public.studio_orders (request_email_hash, created_at);
create index studio_orders_created_idx on public.studio_orders (created_at);
create index studio_orders_payment_idx on public.studio_orders (payment_status, created_at);
create index studio_orders_unbound_expiry_idx on public.studio_orders (checkout_expires_at)
  where payment_status = 'awaiting_payment' and stripe_checkout_session_id is null;
create index studio_order_events_order_idx on public.studio_order_events (order_id, created_at);
create index studio_order_events_budget_idx on public.studio_order_events (created_at) where event_type = 'generation_started';
create index studio_deliveries_pending_idx on public.studio_deliveries (next_attempt_at) where status in ('pending','sending');

alter table public.studio_orders enable row level security;
alter table public.studio_order_events enable row level security;
alter table public.studio_deliveries enable row level security;
revoke all on public.studio_orders, public.studio_order_events, public.studio_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.studio_orders, public.studio_order_events, public.studio_deliveries to service_role;
revoke all on sequence public.studio_order_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.studio_order_events_id_seq to service_role;

create function public.studio_health() returns jsonb language sql security invoker set search_path = '' as $$
  select jsonb_build_object('version', 'studio-fulfillment-v1');
$$;

-- A submitted brief reserves all three possible provider attempts before a payable URL exists.
-- Known Stripe sessions retain that reservation until the provider confirms expiration/failure;
-- delayed payments can still succeed after the nominal checkout expiration time.
create function public.studio_capacity_status(p_daily_limit integer default 20)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with capacity as (
    select least(greatest(coalesce(p_daily_limit,20),1),100) as daily_limit,
      (select count(*) from public.studio_order_events where event_type = 'generation_started'
        and created_at > now() - interval '24 hours') as spent,
      (select coalesce(sum(case
        when payment_status = 'awaiting_payment' and status = 'awaiting_payment' then 3
        when payment_status = 'paid' and refund_status = 'none' and output is null
          and status in ('queued','generating') then 3 - generation_attempts
        else 0 end),0) from public.studio_orders) as reserved
  ) select jsonb_build_object('limit',daily_limit,'spent',spent,'reserved',reserved,
      'remaining',greatest(daily_limit - spent - reserved,0),
      'checkout_available',daily_limit - spent - reserved >= 3) from capacity;
$$;

-- No URL is returned before its session ID is durably bound. An orphan session uses the
-- same fixed expiration, so it cannot remain payable after this draft reservation is released.
create function public.studio_release_expired_drafts()
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  perform pg_advisory_xact_lock(682714302);
  with released as (
    update public.studio_orders set payment_status = 'expired', status = 'cancelled', updated_at = now()
      where payment_status = 'awaiting_payment' and status = 'awaiting_payment'
        and stripe_checkout_session_id is null and checkout_expires_at <= now()
      returning id
  ) insert into public.studio_order_events(order_id,event_type)
    select id,'unbound_checkout_expired' from released;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The first advisory lock makes abuse limits and request replay atomic. The second is shared
-- with worker claims, so spent calls plus worst-case remaining commitments cannot exceed the cap.
create function public.studio_create_order(
  p_id uuid, p_intake jsonb, p_intake_hash text, p_request_key_hash text,
  p_ip_hash text, p_email_hash text, p_access_token_hash text, p_daily_limit integer default 20
) returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  perform pg_advisory_xact_lock(682714301);
  select * into v_order from public.studio_orders where request_key_hash = p_request_key_hash;
  if found then
    if v_order.intake_hash <> p_intake_hash then raise exception 'studio_idempotency_conflict'; end if;
    return next v_order; return;
  end if;
  if (select count(*) from public.studio_orders where request_ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.studio_orders where request_email_hash = p_email_hash and created_at > now() - interval '1 hour') >= 3
    or (select count(*) from public.studio_orders where created_at > now() - interval '24 hours') >= 200 then
    raise exception 'studio_rate_limited';
  end if;
  if jsonb_typeof(p_intake) <> 'object' or coalesce(p_intake->>'acceptedTerms','') <> 'true' then raise exception 'studio_invalid_intake'; end if;
  perform pg_advisory_xact_lock(682714302);
  perform public.studio_release_expired_drafts();
  if not (public.studio_capacity_status(p_daily_limit)->>'checkout_available')::boolean then
    raise exception 'studio_temporarily_full';
  end if;
  insert into public.studio_orders(id, intake, intake_hash, request_key_hash, request_ip_hash, request_email_hash, access_token_hash)
    values(p_id, p_intake, p_intake_hash, p_request_key_hash, p_ip_hash, p_email_hash, p_access_token_hash) returning * into v_order;
  insert into public.studio_order_events(order_id, event_type) values(p_id, 'order_created');
  return next v_order;
end;
$$;

-- The caller has verified Stripe's signature AND retrieved the authoritative session.
-- Stripe IDs, the local order, the fixed SKU, and the paid amount must all agree.
create function public.studio_record_payment(
  p_order_id uuid, p_event_id text, p_session_id text, p_payment_intent_id text,
  p_amount integer, p_currency text, p_product_version text, p_paid_at timestamptz,
  p_refund_status text default 'none', p_refund_id text default null,
  p_refunded_amount integer default 0, p_refund_error_code text default null, p_disputed boolean default false
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  select * into v_order from public.studio_orders where id = p_order_id for update;
  if not found then raise exception 'studio_order_missing'; end if;
  if v_order.amount_total <> p_amount or v_order.currency <> p_currency or v_order.product_version <> p_product_version
    or p_amount <> 4900 or p_currency <> 'usd' or p_product_version <> 'marketing-setup-v1'
    or p_session_id is null or p_payment_intent_id is null
    or p_paid_at is null or p_paid_at < v_order.created_at - interval '5 minutes' or p_paid_at > now() + interval '5 minutes'
    or p_refund_status not in ('none','pending','completed','failed')
    or p_refunded_amount < 0 or p_refunded_amount > 4900
    or (p_refund_status = 'completed' and p_refunded_amount <> 4900)
    or (v_order.stripe_checkout_session_id is not null and v_order.stripe_checkout_session_id <> p_session_id)
    or (v_order.stripe_payment_intent_id is not null and v_order.stripe_payment_intent_id <> p_payment_intent_id) then
    raise exception 'studio_payment_mismatch';
  end if;
  if exists(select 1 from public.studio_order_events where provider_event_id = p_event_id) then return false; end if;
  if v_order.payment_status in ('refunded','disputed') or v_order.refund_status <> 'none' then return false; end if;
  update public.studio_orders set
    stripe_checkout_session_id = p_session_id, stripe_payment_intent_id = p_payment_intent_id,
    payment_status = case when p_disputed then 'disputed' when p_refund_status = 'completed' then 'refunded' else 'paid' end,
    paid_at = least(coalesce(paid_at, p_paid_at), p_paid_at),
    refund_status = p_refund_status, stripe_refund_id = coalesce(stripe_refund_id,p_refund_id),
    refunded_amount = greatest(refunded_amount,p_refunded_amount), refund_last_error_code = p_refund_error_code,
    status = case when p_disputed or p_refund_status = 'failed' then 'needs_attention'
      when p_refund_status in ('pending','completed') then 'cancelled'
      when status in ('awaiting_payment','cancelled') then 'queued' else status end,
    lease_token = case when p_disputed or p_refund_status <> 'none' then null else lease_token end,
    lease_expires_at = case when p_disputed or p_refund_status <> 'none' then null else lease_expires_at end,
    next_attempt_at = case when payment_status <> 'paid' then now() else next_attempt_at end,
    updated_at = now()
    where id = p_order_id;
  insert into public.studio_order_events(order_id, provider_event_id, event_type, metadata)
    values(p_order_id, p_event_id, 'payment_confirmed', jsonb_build_object('amount',p_amount,'currency',p_currency));
  if p_disputed or p_refund_status <> 'none' then
    insert into public.studio_order_events(order_id,event_type,metadata)
      values(p_order_id,'reversal_observed_before_fulfillment',jsonb_build_object('disputed',p_disputed,'refund_status',p_refund_status));
  end if;
  return true;
end;
$$;

create function public.studio_record_expired(p_order_id uuid, p_session_id text, p_event_id text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.studio_orders set payment_status = 'expired', status = 'cancelled', updated_at = now()
    where id = p_order_id and stripe_checkout_session_id = p_session_id and payment_status = 'awaiting_payment';
  if not found then return false; end if;
  insert into public.studio_order_events(order_id, provider_event_id, event_type)
    values(p_order_id, p_event_id, 'checkout_expired') on conflict (provider_event_id) do nothing;
  return true;
end;
$$;

create function public.studio_record_reversal(p_payment_intent_id text, p_event_id text, p_kind text, p_amount_refunded integer default 0)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype; v_full_refund boolean;
begin
  if p_kind not in ('refund','dispute') then raise exception 'studio_invalid_reversal'; end if;
  select * into v_order from public.studio_orders where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then return false; end if;
  if exists(select 1 from public.studio_order_events where provider_event_id = p_event_id) then return false; end if;
  -- A tracked full refund gets lifecycle truth from refund.* events, including later failure.
  -- A delayed charge event must not overwrite a confirmed refund failure with an older success read.
  if p_kind = 'refund' and v_order.refund_status = 'failed' and v_order.refund_last_error_code = 'provider_refund_failed' then return false; end if;
  v_full_refund := p_kind = 'refund' and p_amount_refunded >= v_order.amount_total and v_order.stripe_refund_id is null;
  update public.studio_orders set
    refunded_amount = greatest(refunded_amount, least(greatest(p_amount_refunded, 0), amount_total)),
    payment_status = case when p_kind = 'dispute' then 'disputed' when v_full_refund then 'refunded' else payment_status end,
    refund_status = case when v_full_refund then 'completed' else refund_status end,
    status = case when p_kind = 'dispute' then 'needs_attention' when v_full_refund then 'cancelled' else status end,
    lease_token = case when p_kind = 'dispute' or v_full_refund then null else lease_token end,
    lease_expires_at = case when p_kind = 'dispute' or v_full_refund then null else lease_expires_at end,
    updated_at = now() where id = v_order.id;
  if p_kind = 'dispute' or v_full_refund then
    update public.studio_deliveries set status = 'failed', lease_token = null, lease_expires_at = null,
      last_error_code = 'payment_reversed', updated_at = now() where order_id = v_order.id and status <> 'sent';
  end if;
  insert into public.studio_order_events(order_id, provider_event_id, event_type, metadata)
    values(v_order.id, p_event_id, case when p_kind = 'dispute' then 'payment_disputed' else 'payment_refund_recorded' end,
      jsonb_build_object('amount_refunded', greatest(p_amount_refunded,0)));
  return true;
end;
$$;

-- Lease fencing prevents two workers from finalizing the same order. Crashed claims expire.
-- A rolling 24-hour event ledger bounds provider calls across all application instances.
create function public.studio_claim_order(p_lease_token uuid, p_daily_limit integer default 20)
returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  perform pg_advisory_xact_lock(682714302);
  with exhausted as (
    update public.studio_orders set status = 'needs_attention', lease_token = null, lease_expires_at = null,
      last_error_code = 'generation_attempts_exhausted', updated_at = now()
    where status = 'generating' and lease_expires_at <= now() and generation_attempts >= 3
    returning id
  ) insert into public.studio_order_events(order_id,event_type) select id,'generation_needs_attention' from exhausted;
  if (select count(*) from public.studio_order_events where event_type = 'generation_started' and created_at > now() - interval '24 hours') >= least(greatest(coalesce(p_daily_limit,20),1),100) then return; end if;
  select * into v_order from public.studio_orders
    where payment_status = 'paid' and refund_status = 'none' and generation_attempts < 3 and output is null
      and next_attempt_at <= now() and (status = 'queued' or (status = 'generating' and lease_expires_at <= now()))
    order by paid_at asc for update skip locked limit 1;
  if not found then return; end if;
  update public.studio_orders set status = 'generating', generation_attempts = generation_attempts + 1,
    lease_token = p_lease_token, lease_expires_at = now() + interval '3 minutes', updated_at = now()
    where id = v_order.id returning * into v_order;
  insert into public.studio_order_events(order_id,event_type,metadata)
    values(v_order.id,'generation_started',jsonb_build_object('attempt',v_order.generation_attempts));
  return next v_order;
end;
$$;

create function public.studio_finish_generation(p_order_id uuid, p_lease_token uuid, p_output jsonb, p_usage jsonb default '{}'::jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if jsonb_typeof(p_output) <> 'object' or p_output->>'schemaVersion' <> '1'
    or not (p_output ?& array['businessBrief','email','socialPosts','reusableWorkflow','qualityChecklist','validation']) then raise exception 'studio_invalid_output'; end if;
  update public.studio_orders set output = p_output, status = 'ready', ready_at = now(), updated_at = now(),
    lease_token = null, lease_expires_at = null, last_error_code = null, error_detail = null
    where id = p_order_id and lease_token = p_lease_token and lease_expires_at > now()
      and status = 'generating' and payment_status = 'paid' and refund_status = 'none' and output is null;
  if not found then return false; end if;
  insert into public.studio_deliveries(order_id) values(p_order_id) on conflict (order_id) do nothing;
  insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'generation_completed',p_usage);
  return true;
end;
$$;

create function public.studio_fail_generation(p_order_id uuid, p_lease_token uuid, p_error_code text)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_status text;
begin
  update public.studio_orders set status = case when generation_attempts >= 3 then 'needs_attention' else 'queued' end,
    next_attempt_at = now() + case when generation_attempts = 1 then interval '2 minutes' else interval '10 minutes' end,
    lease_token = null, lease_expires_at = null, last_error_code = left(p_error_code,100), updated_at = now()
    where id = p_order_id and lease_token = p_lease_token and status = 'generating'
    returning status into v_status;
  if not found then return 'lease_lost'; end if;
  insert into public.studio_order_events(order_id,event_type,metadata)
    values(p_order_id,case when v_status = 'needs_attention' then 'generation_needs_attention' else 'generation_retry_scheduled' end,jsonb_build_object('code',left(p_error_code,100)));
  return v_status;
end;
$$;

create function public.studio_claim_delivery(p_lease_token uuid)
returns setof public.studio_deliveries language plpgsql security invoker set search_path = '' as $$
declare v_delivery public.studio_deliveries%rowtype;
begin
  -- Resend idempotency lasts 24h. Stop ambiguous retries before that window expires.
  with exhausted as (
    update public.studio_deliveries set status = 'failed', lease_token = null, lease_expires_at = null,
      last_error_code = case when first_attempt_at < now() - interval '23 hours' then 'delivery_receipt_needs_review' else 'delivery_attempts_exhausted' end,
      updated_at = now()
    where status in ('pending','sending') and (lease_expires_at is null or lease_expires_at <= now())
      and (attempts >= 3 or first_attempt_at < now() - interval '23 hours') returning order_id,last_error_code
  ) insert into public.studio_order_events(order_id,event_type,metadata)
    select order_id,'delivery_needs_attention',jsonb_build_object('code',last_error_code) from exhausted;
  select d.* into v_delivery from public.studio_deliveries d join public.studio_orders o on o.id = d.order_id
    where o.status = 'ready' and o.payment_status = 'paid' and o.refund_status = 'none'
      and d.attempts < 3 and d.next_attempt_at <= now()
      and (d.status = 'pending' or (d.status = 'sending' and d.lease_expires_at <= now()))
      and (d.first_attempt_at is null or d.first_attempt_at >= now() - interval '23 hours')
    order by d.created_at asc for update of d skip locked limit 1;
  if not found then return; end if;
  update public.studio_deliveries set status = 'sending', attempts = attempts + 1, first_attempt_at = coalesce(first_attempt_at,now()),
    lease_token = p_lease_token, lease_expires_at = now() + interval '90 seconds', updated_at = now()
    where order_id = v_delivery.order_id returning * into v_delivery;
  return next v_delivery;
end;
$$;

create function public.studio_finish_delivery(p_order_id uuid,p_lease_token uuid,p_provider_message_id text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.studio_deliveries set status = 'sent', provider_message_id = p_provider_message_id, sent_at = now(),
    lease_token = null, lease_expires_at = null, last_error_code = null, updated_at = now()
    where order_id = p_order_id and lease_token = p_lease_token and status = 'sending' and lease_expires_at > now();
  if not found then return false; end if;
  insert into public.studio_order_events(order_id,event_type) values(p_order_id,'delivery_sent');
  return true;
end;
$$;

create function public.studio_fail_delivery(p_order_id uuid,p_lease_token uuid,p_error_code text)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_status text;
begin
  update public.studio_deliveries set status = case when attempts >= 3 then 'failed' else 'pending' end,
    next_attempt_at = now() + case when attempts = 1 then interval '2 minutes' else interval '10 minutes' end,
    lease_token = null, lease_expires_at = null, last_error_code = left(p_error_code,100), updated_at = now()
    where order_id = p_order_id and lease_token = p_lease_token and status = 'sending' returning status into v_status;
  if not found then return 'lease_lost'; end if;
  insert into public.studio_order_events(order_id,event_type,metadata)
    values(p_order_id,case when v_status = 'failed' then 'delivery_needs_attention' else 'delivery_retry_scheduled' end,jsonb_build_object('code',left(p_error_code,100)));
  return v_status;
end;
$$;

-- Functions default to PUBLIC execute; revoke that explicitly, including role-specific grants.
revoke all on function public.studio_health() from public, anon, authenticated;
revoke all on function public.studio_capacity_status(integer) from public, anon, authenticated;
revoke all on function public.studio_release_expired_drafts() from public, anon, authenticated;
revoke all on function public.studio_create_order(uuid,jsonb,text,text,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.studio_record_payment(uuid,text,text,text,integer,text,text,timestamptz,text,text,integer,text,boolean) from public, anon, authenticated;
revoke all on function public.studio_record_expired(uuid,text,text) from public, anon, authenticated;
revoke all on function public.studio_record_reversal(text,text,text,integer) from public, anon, authenticated;
revoke all on function public.studio_claim_order(uuid,integer) from public, anon, authenticated;
revoke all on function public.studio_finish_generation(uuid,uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.studio_fail_generation(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.studio_claim_delivery(uuid) from public, anon, authenticated;
revoke all on function public.studio_finish_delivery(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.studio_fail_delivery(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.studio_health() to service_role;
grant execute on function public.studio_capacity_status(integer) to service_role;
grant execute on function public.studio_release_expired_drafts() to service_role;
grant execute on function public.studio_create_order(uuid,jsonb,text,text,text,text,text,integer) to service_role;
grant execute on function public.studio_record_payment(uuid,text,text,text,integer,text,text,timestamptz,text,text,integer,text,boolean) to service_role;
grant execute on function public.studio_record_expired(uuid,text,text) to service_role;
grant execute on function public.studio_record_reversal(text,text,text,integer) to service_role;
grant execute on function public.studio_claim_order(uuid,integer) to service_role;
grant execute on function public.studio_finish_generation(uuid,uuid,jsonb,jsonb) to service_role;
grant execute on function public.studio_fail_generation(uuid,uuid,text) to service_role;
grant execute on function public.studio_claim_delivery(uuid) to service_role;
grant execute on function public.studio_finish_delivery(uuid,uuid,text) to service_role;
grant execute on function public.studio_fail_delivery(uuid,uuid,text) to service_role;
