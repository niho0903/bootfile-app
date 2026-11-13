-- Admits the paid Brand & AI Kit (brand-foundation-paid-v1) beside marketing-setup-v1.
-- Additive: no row is rewritten, every existing function keeps its signature, and a
-- marketing-setup-v1 order behaves exactly as before. New orders of the new version bind
-- their model budget when they are created and carry a usage ledger.
-- Roll back with supabase/rollbacks/20261113185211_studio_product_versions_v1.sql, which refuses to
-- run once an order of the new version exists.

-- 1. Two product versions. Amount and currency stay fixed at 4900 usd for both.
alter table public.studio_orders drop constraint studio_orders_product_version_check;
alter table public.studio_orders add constraint studio_orders_product_version_check
  check (product_version in ('marketing-setup-v1','brand-foundation-paid-v1'));

-- 2. A saved output must be the schema its own product version defines. A missing
-- schemaVersion no longer passes as NULL. The largest valid Brand Kit (every field at its
-- validated maximum, in a three-byte script) measures about 101 KB, so that version gets
-- its own size bound with headroom; the Marketing Setup bound is unchanged.
alter table public.studio_orders drop constraint studio_orders_output_check;
alter table public.studio_orders add constraint studio_orders_output_check check (
  output is null or (jsonb_typeof(output) = 'object' and (
    (product_version = 'marketing-setup-v1' and coalesce(output->>'schemaVersion','') = '1'
      and octet_length(output::text) <= 100000)
    or (product_version = 'brand-foundation-paid-v1' and coalesce(output->>'schemaVersion','') = 'brand-foundation-paid-v1'
      and octet_length(output::text) <= 150000))));

-- 3. Per-order model budget and usage ledger. NULL means "not metered": marketing-setup-v1
-- orders keep their original bounds and are never backfilled with invented numbers.
alter table public.studio_orders
  add column model_call_limit integer,
  add column model_cost_limit_microusd bigint,
  add column model_calls integer,
  add column model_input_tokens bigint,
  add column model_output_tokens bigint,
  add column model_cost_microusd bigint,
  add column model_cost_estimated boolean,
  add constraint studio_model_budget_bound check (
    (model_call_limit is null and model_cost_limit_microusd is null and model_calls is null
      and model_input_tokens is null and model_output_tokens is null and model_cost_microusd is null
      and model_cost_estimated is null)
    or (model_call_limit is not null and model_cost_limit_microusd is not null and model_calls is not null
      and model_input_tokens is not null and model_output_tokens is not null and model_cost_microusd is not null
      and model_cost_estimated is not null and model_call_limit between 1 and 3
      and model_cost_limit_microusd between 1 and 5000000 and model_calls >= 0
      and model_input_tokens >= 0 and model_output_tokens >= 0 and model_cost_microusd >= 0)),
  add constraint studio_model_budget_required
    check (product_version = 'marketing-setup-v1' or model_call_limit is not null);

create function public.studio_product_versions() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('version','studio-product-versions-v1',
    'products', jsonb_build_array('marketing-setup-v1','brand-foundation-paid-v1'));
$$;

-- Usage arrives as JSON assembled from a provider response. Read it defensively: a malformed
-- value must never stop a paid output from being saved.
create function public.studio_usage_number(p_usage jsonb, p_key text) returns bigint
language plpgsql immutable security invoker set search_path = '' as $$
declare v_value numeric;
begin
  if p_usage is null or jsonb_typeof(p_usage) <> 'object' or jsonb_typeof(p_usage->p_key) is distinct from 'number' then return null; end if;
  v_value := (p_usage->>p_key)::numeric;
  if v_value < 0 or v_value > 100000000 then return null; end if;
  return floor(v_value)::bigint;
exception when others then return null;
end;
$$;

-- One provider call on a metered order, fenced by the caller's lease. A cost that was not
-- reported as measured marks the order's total as estimated; it is never stored as a clean zero.
create function public.studio_add_model_usage(p_order_id uuid, p_lease_token uuid, p_usage jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype; v_cost bigint := public.studio_usage_number(p_usage,'cost_microusd');
  v_reported boolean := v_cost is not null and coalesce(p_usage->>'cost_basis','') = 'reported';
begin
  update public.studio_orders set
    model_calls = model_calls + 1,
    model_input_tokens = model_input_tokens + coalesce(public.studio_usage_number(p_usage,'input_tokens'),0),
    model_output_tokens = model_output_tokens + coalesce(public.studio_usage_number(p_usage,'output_tokens'),0),
    model_cost_microusd = model_cost_microusd + coalesce(v_cost,0),
    model_cost_estimated = model_cost_estimated or not v_reported, updated_at = now()
    where id = p_order_id and lease_token = p_lease_token and status = 'generating' and model_call_limit is not null
    returning * into v_order;
  if not found then return false; end if;
  insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'model_usage_recorded',
    jsonb_build_object('call',v_order.model_calls,'cost_microusd',v_cost,'reported',v_reported,
      'model',left(coalesce(p_usage->>'model',''),100)));
  if v_order.model_calls > v_order.model_call_limit or v_order.model_cost_microusd > v_order.model_cost_limit_microusd then
    insert into public.studio_order_events(order_id,event_type,metadata) values(p_order_id,'model_budget_breached',
      jsonb_build_object('calls',v_order.model_calls,'cost_microusd',v_order.model_cost_microusd));
  end if;
  return true;
end;
$$;

-- Same admission, replay and capacity rules as studio_create_order, for the versioned product only.
create function public.studio_create_versioned_order(
  p_id uuid, p_product_version text, p_intake jsonb, p_intake_hash text, p_request_key_hash text,
  p_ip_hash text, p_email_hash text, p_access_token_hash text,
  p_model_call_limit integer, p_model_cost_limit_microusd bigint, p_daily_limit integer default 20
) returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  if p_product_version is distinct from 'brand-foundation-paid-v1' then raise exception 'studio_product_version_invalid'; end if;
  perform pg_advisory_xact_lock(682714301);
  select * into v_order from public.studio_orders where request_key_hash = p_request_key_hash;
  if found then
    if v_order.intake_hash <> p_intake_hash or v_order.product_version <> p_product_version then raise exception 'studio_idempotency_conflict'; end if;
    return next v_order; return;
  end if;
  if (select count(*) from public.studio_orders where request_ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from public.studio_orders where request_email_hash = p_email_hash and created_at > now() - interval '1 hour') >= 3
    or (select count(*) from public.studio_orders where created_at > now() - interval '24 hours') >= 200 then
    raise exception 'studio_rate_limited';
  end if;
  if jsonb_typeof(p_intake) is distinct from 'object' or coalesce(p_intake->>'acceptedTerms','') <> 'true'
    or coalesce(p_intake->>'approvedBackbrief','') <> 'true'
    or coalesce(p_intake->>'productVersion','') <> p_product_version
    or coalesce(p_intake->>'approvalSnapshotSha256','') !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_intake->'brand') is distinct from 'object' then raise exception 'studio_invalid_intake'; end if;
  if p_model_call_limit is null or p_model_cost_limit_microusd is null then raise exception 'studio_model_budget_required'; end if;
  perform pg_advisory_xact_lock(682714302);
  perform public.studio_release_expired_drafts();
  if not (public.studio_capacity_status(p_daily_limit)->>'checkout_available')::boolean then
    raise exception 'studio_temporarily_full';
  end if;
  insert into public.studio_orders(id, product_version, intake, intake_hash, request_key_hash, request_ip_hash,
      request_email_hash, access_token_hash, model_call_limit, model_cost_limit_microusd, model_calls,
      model_input_tokens, model_output_tokens, model_cost_microusd, model_cost_estimated)
    values(p_id, p_product_version, p_intake, p_intake_hash, p_request_key_hash, p_ip_hash, p_email_hash,
      p_access_token_hash, p_model_call_limit, p_model_cost_limit_microusd, 0, 0, 0, 0, false) returning * into v_order;
  insert into public.studio_order_events(order_id, event_type, metadata)
    values(p_id, 'order_created', jsonb_build_object('product_version', p_product_version));
  return next v_order;
end;
$$;

-- Unchanged except that the paid product version may be either admitted version. The order's
-- own persisted version must still equal the version the payment was made for.
create or replace function public.studio_record_payment(
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
    or p_amount <> 4900 or p_currency <> 'usd' or p_product_version not in ('marketing-setup-v1','brand-foundation-paid-v1')
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

-- The output must match the schema of the order's persisted version; usage is added to the ledger
-- before the fenced commit, so a call that was made is counted even if the commit loses its lease.
create or replace function public.studio_finish_generation(p_order_id uuid, p_lease_token uuid, p_output jsonb, p_usage jsonb default '{}'::jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_version text;
begin
  select product_version into v_version from public.studio_orders where id = p_order_id for update;
  if not found then return false; end if;
  if jsonb_typeof(p_output) is distinct from 'object' then raise exception 'studio_invalid_output'; end if;
  if v_version = 'marketing-setup-v1' then
    if p_output->>'schemaVersion' is distinct from '1'
      or not (p_output ?& array['businessBrief','email','socialPosts','reusableWorkflow','qualityChecklist','validation']) then raise exception 'studio_invalid_output'; end if;
  elsif v_version = 'brand-foundation-paid-v1' then
    if p_output->>'schemaVersion' is distinct from 'brand-foundation-paid-v1'
      or not (p_output ?& array['price','foundation','synthesis','provenance','requiresCustomerReview'])
      or p_output->>'requiresCustomerReview' is distinct from 'true'
      or jsonb_typeof(p_output->'foundation') is distinct from 'object'
      or jsonb_typeof(p_output->'synthesis') is distinct from 'object' then raise exception 'studio_invalid_output'; end if;
  else raise exception 'studio_invalid_output'; end if;
  perform public.studio_add_model_usage(p_order_id, p_lease_token, p_usage);
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

-- A failed attempt that reached the provider still cost something. Record it, then apply the
-- unchanged retry and needs-attention rules.
create function public.studio_fail_metered_generation(p_order_id uuid, p_lease_token uuid, p_error_code text, p_usage jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  perform public.studio_add_model_usage(p_order_id, p_lease_token, p_usage);
  return public.studio_fail_generation(p_order_id, p_lease_token, p_error_code);
end;
$$;

-- The seven-day customer refund applies to both products.
create or replace function public.studio_request_refund(p_order_id uuid)
returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  select * into v_order from public.studio_orders where id = p_order_id for update;
  if not found then raise exception 'studio_order_missing'; end if;
  if v_order.refund_status <> 'none' then return next v_order; return; end if;
  if v_order.payment_status <> 'paid' or v_order.paid_at is null or v_order.paid_at > now()
    or v_order.paid_at < now() - interval '7 days' or v_order.amount_total <> 4900
    or v_order.currency <> 'usd' or v_order.product_version not in ('marketing-setup-v1','brand-foundation-paid-v1')
    or v_order.stripe_payment_intent_id is null then
    raise exception 'studio_refund_not_eligible';
  end if;
  update public.studio_orders set refund_status = 'pending', refund_requested_at = now(),
    refund_next_attempt_at = now(), refund_attempts = 0, refund_last_error_code = null,
    status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
    where id = p_order_id returning * into v_order;
  insert into public.studio_order_events(order_id, event_type) values(p_order_id, 'refund_requested');
  return next v_order;
end;
$$;

revoke all on function public.studio_product_versions() from public, anon, authenticated;
revoke all on function public.studio_usage_number(jsonb,text) from public, anon, authenticated;
revoke all on function public.studio_add_model_usage(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.studio_create_versioned_order(uuid,text,jsonb,text,text,text,text,text,integer,bigint,integer) from public, anon, authenticated;
revoke all on function public.studio_fail_metered_generation(uuid,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.studio_product_versions() to service_role;
grant execute on function public.studio_usage_number(jsonb,text) to service_role;
grant execute on function public.studio_add_model_usage(uuid,uuid,jsonb) to service_role;
grant execute on function public.studio_create_versioned_order(uuid,text,jsonb,text,text,text,text,text,integer,bigint,integer) to service_role;
grant execute on function public.studio_fail_metered_generation(uuid,uuid,text,jsonb) to service_role;
