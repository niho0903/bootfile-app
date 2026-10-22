-- Customer-requested refunds only. No API accepts a destination or an arbitrary amount.
alter table public.studio_orders
  add column refund_lease_token uuid,
  add column refund_lease_expires_at timestamptz,
  add constraint studio_refund_lease_pair check ((refund_lease_token is null) = (refund_lease_expires_at is null));
create index studio_orders_refund_queue_idx on public.studio_orders(refund_next_attempt_at)
  where refund_status = 'pending';

create function public.studio_request_refund(p_order_id uuid)
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

create function public.studio_claim_refund(p_order_id uuid)
returns setof public.studio_orders language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  select * into v_order from public.studio_orders where id = p_order_id for update skip locked;
  if not found or v_order.refund_status <> 'pending'
    or v_order.refund_next_attempt_at > now()
    or v_order.refund_lease_expires_at > now() then return; end if;
  if v_order.refund_requested_at is null or v_order.paid_at is null
    or v_order.refund_requested_at < v_order.paid_at
    or v_order.refund_requested_at > v_order.paid_at + interval '7 days'
    or v_order.payment_status = 'disputed'
    or (v_order.refund_attempts >= 3 and v_order.stripe_refund_id is null)
    or v_order.refund_requested_at < now() - interval '30 days' then
    update public.studio_orders set refund_status = 'failed',
      refund_last_error_code = 'refund_requires_review', refund_lease_token = null,
      refund_lease_expires_at = null, updated_at = now() where id = p_order_id;
    insert into public.studio_order_events(order_id, event_type) values(p_order_id, 'refund_needs_attention');
    return;
  end if;
  update public.studio_orders set refund_lease_token = gen_random_uuid(),
    refund_lease_expires_at = now() + interval '3 minutes',
    refund_attempts = case when stripe_refund_id is null then least(3, refund_attempts + 1) else refund_attempts end,
    updated_at = now() where id = p_order_id returning * into v_order;
  insert into public.studio_order_events(order_id, event_type) values(p_order_id, 'refund_check_started');
  return next v_order;
end;
$$;

create function public.studio_finish_refund(
  p_order_id uuid, p_lease_token uuid, p_provider_id text, p_status text, p_error_code text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_status not in ('pending','completed','failed')
    or (p_status = 'completed' and p_provider_id is null)
    or (p_provider_id is not null and p_provider_id !~ '^(re|pyr)_') then
    raise exception 'studio_invalid_refund_result';
  end if;
  update public.studio_orders set
    stripe_refund_id = coalesce(stripe_refund_id, p_provider_id), refund_status = p_status,
    payment_status = case when p_status = 'completed' and payment_status <> 'disputed' then 'refunded' else payment_status end,
    refunded_amount = case when p_status = 'completed' then 4900 else refunded_amount end,
    refund_last_error_code = p_error_code,
    refund_next_attempt_at = now() + case when p_provider_id is null then interval '5 minutes' else interval '1 hour' end,
    refund_lease_token = null, refund_lease_expires_at = null, status = 'cancelled', updated_at = now()
    where id = p_order_id and refund_status = 'pending' and refund_lease_token = p_lease_token
      and refund_lease_expires_at > now()
      and (stripe_refund_id is null or p_provider_id is null or stripe_refund_id = p_provider_id);
  if not found then return false; end if;
  insert into public.studio_order_events(order_id, event_type, metadata)
    values(p_order_id, 'refund_' || p_status, jsonb_build_object('error_code', p_error_code));
  return true;
end;
$$;

-- Signed provider status notifications may arrive after a previously successful API response.
create function public.studio_record_refund_status(
  p_event_id text, p_payment_intent_id text, p_provider_id text, p_status text, p_amount integer, p_error_code text default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_order public.studio_orders%rowtype;
begin
  if p_status not in ('pending','completed','failed') or p_amount <> 4900
    or p_provider_id !~ '^(re|pyr)_' then return false; end if;
  select * into v_order from public.studio_orders where stripe_payment_intent_id = p_payment_intent_id for update;
  if not found then return false; end if;
  if exists(select 1 from public.studio_order_events where provider_event_id = p_event_id) then return true; end if;
  if v_order.stripe_refund_id is not null and v_order.stripe_refund_id <> p_provider_id then return false; end if;
  if v_order.refund_status in ('completed','failed') and p_status = 'pending' then
    insert into public.studio_order_events(order_id, provider_event_id, event_type)
      values(v_order.id, p_event_id, 'refund_stale_pending_ignored');
    return true;
  end if;
  if v_order.refund_status = 'failed' and v_order.refund_last_error_code = 'provider_refund_failed'
    and p_status = 'completed' then
    insert into public.studio_order_events(order_id, provider_event_id, event_type)
      values(v_order.id, p_event_id, 'refund_stale_success_ignored');
    return true;
  end if;
  update public.studio_orders set stripe_refund_id = p_provider_id, refund_status = p_status,
    payment_status = case
      when payment_status = 'disputed' then 'disputed'
      when p_status = 'completed' then 'refunded'
      when p_status = 'failed' then 'paid'
      else payment_status end,
    refunded_amount = case when p_status = 'completed' then 4900 when p_status = 'failed' then 0 else refunded_amount end,
    refund_last_error_code = case when p_status = 'failed' then 'provider_refund_failed' else p_error_code end,
    refund_lease_token = null, refund_lease_expires_at = null,
    status = 'cancelled', lease_token = null, lease_expires_at = null, updated_at = now()
    where id = v_order.id;
  insert into public.studio_order_events(order_id, provider_event_id, event_type)
    values(v_order.id, p_event_id, 'refund_provider_' || p_status);
  return true;
end;
$$;

revoke all on function public.studio_request_refund(uuid) from public, anon, authenticated;
revoke all on function public.studio_claim_refund(uuid) from public, anon, authenticated;
revoke all on function public.studio_finish_refund(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.studio_record_refund_status(text,text,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.studio_request_refund(uuid) to service_role;
grant execute on function public.studio_claim_refund(uuid) to service_role;
grant execute on function public.studio_finish_refund(uuid,uuid,text,text,text) to service_role;
grant execute on function public.studio_record_refund_status(text,text,text,text,integer,text) to service_role;
