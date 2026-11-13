-- Rollback for 20261113185211_studio_product_versions_v1. Restores the exact prior functions and
-- constraints. It refuses to run once an order of the new product version exists: at that
-- point disable the new checkout flag and repair forward instead.
begin;
do $$ begin
  if exists(select 1 from public.studio_orders where product_version <> 'marketing-setup-v1') then
    raise exception 'Rollback refused: orders of a later product version exist.';
  end if;
end $$;
drop function public.studio_create_versioned_order(uuid,text,jsonb,text,text,text,text,text,integer,bigint,integer);
drop function public.studio_fail_metered_generation(uuid,uuid,text,jsonb);
drop function public.studio_product_versions();
create or replace function public.studio_finish_generation(p_order_id uuid, p_lease_token uuid, p_output jsonb, p_usage jsonb default '{}'::jsonb)
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
drop function public.studio_add_model_usage(uuid,uuid,jsonb);
drop function public.studio_usage_number(jsonb,text);
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
create or replace function public.studio_request_refund(p_order_id uuid)
returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  select * into v_order from public.studio_orders where id = p_order_id for update;
  if not found then raise exception 'studio_order_missing'; end if;
  if v_order.refund_status <> 'none' then return next v_order; return; end if;
  if v_order.payment_status <> 'paid' or v_order.paid_at is null or v_order.paid_at > now()
    or v_order.paid_at < now() - interval '7 days' or v_order.amount_total <> 4900
    or v_order.currency <> 'usd' or v_order.product_version <> 'marketing-setup-v1'
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
alter table public.studio_orders
  drop constraint studio_model_budget_required, drop constraint studio_model_budget_bound,
  drop column model_call_limit, drop column model_cost_limit_microusd, drop column model_calls,
  drop column model_input_tokens, drop column model_output_tokens, drop column model_cost_microusd,
  drop column model_cost_estimated;
alter table public.studio_orders drop constraint studio_orders_output_check;
alter table public.studio_orders add constraint studio_orders_output_check
  check (output is null or (jsonb_typeof(output) = 'object' and output->>'schemaVersion' = '1' and octet_length(output::text) <= 100000));
alter table public.studio_orders drop constraint studio_orders_product_version_check;
alter table public.studio_orders add constraint studio_orders_product_version_check
  check (product_version = 'marketing-setup-v1');
commit;
