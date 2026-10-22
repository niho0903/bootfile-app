-- Explicit, optional customer reports. No free text, email, provider data, or raw
-- capability is copied here. Core order/fulfillment state remains unchanged.
create table public.studio_feedback (
  order_id uuid primary key references public.studio_orders(id) on delete cascade,
  usefulness text check (usefulness in ('useful','not_useful')),
  used_at timestamptz,
  reused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (usefulness is not null or used_at is not null or reused_at is not null),
  check (reused_at is null or (used_at is not null and reused_at >= used_at))
);

-- A bounded request ledger prevents retries from changing later feedback.
create table public.studio_feedback_requests (
  order_id uuid not null references public.studio_orders(id) on delete cascade,
  request_key_hash text not null check (request_key_hash ~ '^[a-f0-9]{64}$'),
  event text not null check (event in ('useful','not_useful','used','reused')),
  created_at timestamptz not null default now(),
  primary key (order_id,request_key_hash)
);

comment on column public.studio_feedback.used_at is 'First explicit customer report of use; this is the report time, not independently observed use.';
comment on column public.studio_feedback.reused_at is 'First explicit customer report of reuse; no retention or business outcome is inferred.';

alter table public.studio_feedback enable row level security;
alter table public.studio_feedback_requests enable row level security;
revoke all on public.studio_feedback,public.studio_feedback_requests from public,anon,authenticated;
grant select,insert,update,delete on public.studio_feedback,public.studio_feedback_requests to service_role;

create function public.studio_read_feedback(p_order_id uuid,p_access_token_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.studio_orders%rowtype;
  v_feedback public.studio_feedback%rowtype;
begin
  -- Share the order lock with the refund path: a committed refund always blocks
  -- both reading and writing feedback, including an otherwise valid replay.
  select * into v_order from public.studio_orders where id = p_order_id for share;
  if not found or p_access_token_hash is null or v_order.access_token_hash <> p_access_token_hash
    or v_order.status <> 'ready' or v_order.payment_status <> 'paid' or v_order.output is null
    or v_order.refund_status <> 'none' or v_order.refund_requested_at is not null then
    return jsonb_build_object('outcome','unavailable');
  end if;
  select * into v_feedback from public.studio_feedback where order_id = p_order_id;
  return jsonb_build_object('outcome','available','feedback',jsonb_build_object(
    'usefulness',v_feedback.usefulness,'usedAt',v_feedback.used_at,
    'reusedAt',v_feedback.reused_at,'updatedAt',v_feedback.updated_at));
end;
$$;

create function public.studio_record_feedback(
  p_order_id uuid,p_access_token_hash text,p_request_key_hash text,p_event text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.studio_orders%rowtype;
  v_previous_event text;
  v_count integer;
  v_recent integer;
  v_now timestamptz := now();
begin
  if p_event is null or p_event not in ('useful','not_useful','used','reused')
    or p_request_key_hash is null or p_request_key_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('outcome','invalid_request');
  end if;
  select * into v_order from public.studio_orders where id = p_order_id for update;
  if not found or p_access_token_hash is null or v_order.access_token_hash <> p_access_token_hash
    or v_order.status <> 'ready' or v_order.payment_status <> 'paid' or v_order.output is null
    or v_order.refund_status <> 'none' or v_order.refund_requested_at is not null then
    return jsonb_build_object('outcome','unavailable');
  end if;
  select event into v_previous_event from public.studio_feedback_requests
    where order_id = p_order_id and request_key_hash = p_request_key_hash;
  if found then
    if v_previous_event <> p_event then return jsonb_build_object('outcome','idempotency_conflict'); end if;
    return public.studio_read_feedback(p_order_id,p_access_token_hash) || jsonb_build_object('outcome','replayed');
  end if;
  select count(*),count(*) filter(where created_at >= v_now - interval '1 hour')
    into v_count,v_recent from public.studio_feedback_requests where order_id = p_order_id;
  if v_count >= 128 or v_recent >= 30 then return jsonb_build_object('outcome','rate_limited'); end if;

  insert into public.studio_feedback_requests(order_id,request_key_hash,event)
    values(p_order_id,p_request_key_hash,p_event);
  insert into public.studio_feedback(order_id,usefulness,used_at,reused_at)
    values(p_order_id,case when p_event in ('useful','not_useful') then p_event end,
      case when p_event in ('used','reused') then v_now end,
      case when p_event = 'reused' then v_now end)
    on conflict(order_id) do update set
      usefulness = case when p_event in ('useful','not_useful') then p_event else studio_feedback.usefulness end,
      used_at = case when p_event in ('used','reused') then coalesce(studio_feedback.used_at,v_now) else studio_feedback.used_at end,
      reused_at = case when p_event = 'reused' then coalesce(studio_feedback.reused_at,v_now) else studio_feedback.reused_at end,
      updated_at = case when
        (p_event in ('useful','not_useful') and studio_feedback.usefulness is distinct from p_event)
        or (p_event in ('used','reused') and studio_feedback.used_at is null)
        or (p_event = 'reused' and studio_feedback.reused_at is null)
        then v_now else studio_feedback.updated_at end;
  return public.studio_read_feedback(p_order_id,p_access_token_hash) || jsonb_build_object('outcome','saved');
end;
$$;

-- Cohort is the first ready timestamp, not feedback date or page views. Later
-- refunds stay in the cohort and do not erase previously reported feedback.
create function public.get_studio_feedback_metrics(p_since timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'cohort_since',p_since,'cohort_before',now(),
    'ready_orders',count(o.id),
    'feedback_orders',count(f.order_id),
    'usefulness_responses',count(f.order_id) filter(where f.usefulness is not null),
    'useful_orders',count(f.order_id) filter(where f.usefulness = 'useful'),
    'not_useful_orders',count(f.order_id) filter(where f.usefulness = 'not_useful'),
    'first_use_orders',count(f.order_id) filter(where f.used_at is not null),
    'reuse_orders',count(f.order_id) filter(where f.reused_at is not null))
  from public.studio_orders o left join public.studio_feedback f on f.order_id = o.id
  where o.ready_at >= p_since and o.ready_at < now();
$$;

revoke all on function public.studio_read_feedback(uuid,text) from public,anon,authenticated;
revoke all on function public.studio_record_feedback(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.get_studio_feedback_metrics(timestamptz) from public,anon,authenticated;
grant execute on function public.studio_read_feedback(uuid,text) to service_role;
grant execute on function public.studio_record_feedback(uuid,text,text,text) to service_role;
grant execute on function public.get_studio_feedback_metrics(timestamptz) to service_role;
