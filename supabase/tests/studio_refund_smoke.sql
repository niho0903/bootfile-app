-- Run only after all Studio migrations on an empty Studio schema.
-- This transaction exercises database transitions with synthetic IDs. It calls
-- no payment provider and always rolls back every fixture and event.
begin;

do $$
declare
  v_id uuid := gen_random_uuid();
  v_old uuid := gen_random_uuid();
  v_unpaid uuid := gen_random_uuid();
  v_capped uuid := gen_random_uuid();
  v_lease uuid;
  v_stale_lease uuid;
  v_requested_at timestamptz;
  v_order public.studio_orders%rowtype;
  v_count integer;
begin
  if exists(select 1 from public.studio_orders) then
    raise exception 'Refund smoke requires an empty Studio schema; no customer rows were modified.';
  end if;
  if has_function_privilege('anon','public.studio_request_refund(uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.studio_claim_refund(uuid)','EXECUTE')
    or has_function_privilege('anon','public.studio_record_refund_status(text,text,text,text,integer,text)','EXECUTE')
    or not has_function_privilege('service_role','public.studio_finish_refund(uuid,uuid,text,text,text)','EXECUTE') then
    raise exception 'Refund RPC role boundary is wrong';
  end if;

  insert into public.studio_orders(id,intake,intake_hash,request_key_hash,request_ip_hash,request_email_hash,access_token_hash,
    created_at,paid_at,payment_status,status,stripe_payment_intent_id,lease_token,lease_expires_at)
  values(v_id,'{"acceptedTerms":true,"email":"refund-smoke@example.invalid"}',repeat('a',64),repeat('1',64),repeat('b',64),repeat('c',64),repeat('d',64),
    now()-interval '2 hours',now()-interval '1 hour','paid','generating','pi_refund_smoke_main',gen_random_uuid(),now()+interval '1 minute');

  select * into v_order from public.studio_request_refund(v_id);
  if v_order.refund_status <> 'pending' or v_order.status <> 'cancelled'
    or v_order.lease_token is not null or v_order.lease_expires_at is not null then
    raise exception 'Refund request did not fence generation';
  end if;
  v_requested_at := v_order.refund_requested_at;
  perform public.studio_request_refund(v_id);
  if (select count(*) from public.studio_order_events where order_id=v_id and event_type='refund_requested') <> 1 then
    raise exception 'Refund request replay was not idempotent';
  end if;

  select * into v_order from public.studio_claim_refund(v_id);
  if v_order.refund_attempts <> 1 or v_order.refund_lease_token is null then raise exception 'First refund claim failed'; end if;
  v_stale_lease := v_order.refund_lease_token;
  select count(*) into v_count from public.studio_claim_refund(v_id);
  if v_count <> 0 then raise exception 'An active refund lease was claimed twice'; end if;
  if public.studio_finish_refund(v_id,gen_random_uuid(),'re_refund_smoke_main','completed') then
    raise exception 'Wrong refund lease completed work';
  end if;
  update public.studio_orders set refund_lease_expires_at=now()-interval '1 second' where id=v_id;
  if public.studio_finish_refund(v_id,v_stale_lease,'re_refund_smoke_main','completed') then
    raise exception 'Expired refund lease completed work';
  end if;
  select * into v_order from public.studio_claim_refund(v_id);
  v_lease := v_order.refund_lease_token;
  if v_lease is null or v_lease=v_stale_lease or v_order.refund_attempts <> 2 then
    raise exception 'Expired refund lease was not recovered';
  end if;
  if public.studio_finish_refund(v_id,v_stale_lease,'re_refund_smoke_main','completed') then
    raise exception 'Stale refund worker overwrote a new claim';
  end if;
  if not public.studio_finish_refund(v_id,v_lease,'re_refund_smoke_main','pending','provider_refund_requires_action') then
    raise exception 'Current refund worker could not persist pending status';
  end if;
  if not exists(select 1 from public.studio_orders where id=v_id and payment_status='paid' and refunded_amount=0
    and refund_status='pending' and refund_last_error_code='provider_refund_requires_action' and refund_requested_at=v_requested_at) then
    raise exception 'Pending refund was presented as completed';
  end if;

  -- Polling a known provider refund must not consume another create attempt.
  update public.studio_orders set refund_next_attempt_at=now()-interval '1 second' where id=v_id;
  select * into v_order from public.studio_claim_refund(v_id);
  if v_order.refund_attempts <> 2 then raise exception 'Provider status polling burned a refund creation attempt'; end if;
  if not public.studio_finish_refund(v_id,v_order.refund_lease_token,'re_refund_smoke_main','completed') then
    raise exception 'Provider-confirmed refund could not complete';
  end if;
  if not exists(select 1 from public.studio_orders where id=v_id and refund_status='completed' and payment_status='refunded' and refunded_amount=4900) then
    raise exception 'Completed refund did not update payment state';
  end if;
  perform public.studio_record_refund_status('evt_refund_smoke_pending','pi_refund_smoke_main','re_refund_smoke_main','pending',4900);
  if (select refund_status from public.studio_orders where id=v_id) <> 'completed' then
    raise exception 'Delayed pending event reopened completed refund';
  end if;
  perform public.studio_record_refund_status('evt_refund_smoke_failure','pi_refund_smoke_main','re_refund_smoke_main','failed',4900);
  perform public.studio_record_refund_status('evt_refund_smoke_old_success','pi_refund_smoke_main','re_refund_smoke_main','completed',4900);
  if not exists(select 1 from public.studio_orders where id=v_id and refund_status='failed' and payment_status='paid'
    and refunded_amount=0 and refund_last_error_code='provider_refund_failed') then
    raise exception 'Provider failure was hidden by stale success';
  end if;
  perform public.studio_record_refund_status('evt_refund_smoke_old_success','pi_refund_smoke_main','re_refund_smoke_main','completed',4900);
  if (select count(*) from public.studio_order_events where provider_event_id='evt_refund_smoke_old_success') <> 1 then
    raise exception 'Refund event replay was not idempotent';
  end if;

  insert into public.studio_orders(id,intake,intake_hash,request_key_hash,request_ip_hash,request_email_hash,access_token_hash,
    created_at,paid_at,payment_status,status,stripe_payment_intent_id)
  values(v_old,'{}',repeat('a',64),repeat('2',64),repeat('b',64),repeat('c',64),repeat('d',64),
    now()-interval '9 days',now()-interval '8 days','paid','queued','pi_refund_smoke_old'),
    (v_unpaid,'{}',repeat('a',64),repeat('3',64),repeat('b',64),repeat('c',64),repeat('d',64),
    now(),null,'awaiting_payment','awaiting_payment',null);
  begin
    perform public.studio_request_refund(v_old);
    raise exception 'Expected seven-day policy rejection';
  exception when raise_exception then
    if sqlerrm <> 'studio_refund_not_eligible' then raise; end if;
  end;
  begin
    perform public.studio_request_refund(v_unpaid);
    raise exception 'Expected unpaid-order rejection';
  exception when raise_exception then
    if sqlerrm <> 'studio_refund_not_eligible' then raise; end if;
  end;
  update public.studio_orders set paid_at=now()+interval '1 minute' where id=v_old;
  begin
    perform public.studio_request_refund(v_old);
    raise exception 'Expected future-payment rejection';
  exception when raise_exception then
    if sqlerrm <> 'studio_refund_not_eligible' then raise; end if;
  end;

  insert into public.studio_orders(id,intake,intake_hash,request_key_hash,request_ip_hash,request_email_hash,access_token_hash,
    created_at,paid_at,payment_status,status,stripe_payment_intent_id)
  values(v_capped,'{}',repeat('a',64),repeat('4',64),repeat('b',64),repeat('c',64),repeat('d',64),
    now()-interval '2 hours',now()-interval '1 hour','paid','queued','pi_refund_smoke_capped');
  perform public.studio_request_refund(v_capped);
  for i in 1..3 loop
    select * into v_order from public.studio_claim_refund(v_capped);
    if v_order.refund_attempts <> i then raise exception 'Refund creation attempt count is wrong'; end if;
    update public.studio_orders set refund_lease_expires_at=now()-interval '1 second' where id=v_capped;
  end loop;
  select count(*) into v_count from public.studio_claim_refund(v_capped);
  if v_count <> 0 or not exists(select 1 from public.studio_orders where id=v_capped and refund_status='failed'
    and refund_attempts=3 and refund_last_error_code='refund_requires_review') then
    raise exception 'Ambiguous refund creation was retried without a bound';
  end if;
  -- A signed current provider success may resolve local ambiguity, but cannot
  -- resolve a provider-declared terminal failure (tested above).
  perform public.studio_record_refund_status('evt_refund_smoke_recovered','pi_refund_smoke_capped','re_refund_smoke_recovered','completed',4900);
  if (select refund_status from public.studio_orders where id=v_capped) <> 'completed' then
    raise exception 'Current provider truth could not resolve local ambiguity';
  end if;
end;
$$;

rollback;
