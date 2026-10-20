-- Run after the migrations on an empty studio schema or disposable database.
-- No provider, email, checkout, charge, or refund is called. All fixtures roll back.
-- The explicit empty-table guard prevents this queue test from touching customer work.
begin;

do $$
declare
  v_id uuid := '11111111-1111-4111-8111-111111111111';
  v_other uuid := '22222222-2222-4222-8222-222222222222';
  v_pending_refund uuid := '33333333-3333-4333-8333-333333333333';
  v_expiring_draft uuid := '44444444-4444-4444-8444-444444444444';
  v_held_session uuid := '55555555-5555-4555-8555-555555555555';
  v_lease_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_lease_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_order public.studio_orders%rowtype;
  v_count integer;
  v_changed boolean;
  v_capacity jsonb;
  v_paid_at timestamptz := now() - interval '2 days' + interval '1 minute';
  v_intake jsonb := '{"businessName":"SQL Test Business","businessDescription":"Synthetic fixture only; never fulfilled.","audience":"Synthetic readers","offer":"A synthetic test offer","goal":"Test delivery correctness","approvedFacts":"This is a synthetic test fixture.","callToAction":"Do not contact anyone.","voiceSample":"","constraints":"No provider calls.","email":"test@example.invalid","platform":"chatgpt","acceptedTerms":true}'::jsonb;
  v_output jsonb := '{"schemaVersion":1,"businessBrief":{},"email":{},"socialPosts":[],"reusableWorkflow":{},"qualityChecklist":[],"validation":{"requiresHumanReview":true}}'::jsonb;
begin
  if exists(select 1 from public.studio_orders) then raise exception 'Smoke test requires an empty studio schema; no customer rows were modified.'; end if;

  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('studio_orders','studio_order_events','studio_deliveries') and not c.relrowsecurity) then raise exception 'RLS is not enabled'; end if;
  if has_table_privilege('anon','public.studio_orders','SELECT') or has_table_privilege('authenticated','public.studio_orders','SELECT') then raise exception 'Browser role can read orders'; end if;
  if has_function_privilege('anon','public.studio_claim_order(uuid,integer)','EXECUTE') or has_function_privilege('authenticated','public.studio_record_payment(uuid,text,text,text,integer,text,text,timestamptz,text,text,integer,text,boolean)','EXECUTE') then raise exception 'Browser role can execute fulfillment RPC'; end if;
  if has_function_privilege('anon','public.studio_capacity_status(integer)','EXECUTE')
    or has_function_privilege('authenticated','public.studio_create_order(uuid,jsonb,text,text,text,text,text,integer)','EXECUTE')
    or has_function_privilege('anon','public.studio_release_expired_drafts()','EXECUTE') then raise exception 'Browser role can bypass the admission limit'; end if;
  if not has_function_privilege('service_role','public.studio_claim_order(uuid,integer)','EXECUTE') then raise exception 'Service role cannot claim work'; end if;

  select * into v_order from public.studio_create_order(v_id,v_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),3);
  if v_order.id <> v_id then raise exception 'Order creation did not persist'; end if;
  if v_order.checkout_expires_at <> date_trunc('second',now()) + interval '1 hour' then raise exception 'Checkout expiration is not fixed and bounded'; end if;
  v_capacity := public.studio_capacity_status(3);
  if (v_capacity->>'spent')::integer <> 0 or (v_capacity->>'reserved')::integer <> 3
    or (v_capacity->>'remaining')::integer <> 0 or (v_capacity->>'checkout_available')::boolean then raise exception 'The payable draft did not reserve all possible provider attempts'; end if;
  select * into v_order from public.studio_create_order(v_other,v_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('f',64),3);
  if v_order.id <> v_id or (select count(*) from public.studio_orders) <> 1 then raise exception 'Request replay created another order'; end if;
  if (public.studio_capacity_status(3)->>'reserved')::integer <> 3 then raise exception 'Request replay reserved capacity twice'; end if;
  begin
    perform public.studio_create_order(v_other,v_intake,repeat('a',64),repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64),3);
    raise exception 'Expected checkout admission to stop at reserved capacity';
  exception when raise_exception then
    if sqlerrm <> 'studio_temporarily_full' then raise; end if;
  end;
  if (select count(*) from public.studio_orders) <> 1 then raise exception 'A capacity rejection left a payable draft'; end if;
  begin
    perform public.studio_create_order(v_other,v_intake,repeat('f',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64));
    raise exception 'Expected idempotency conflict';
  exception when raise_exception then
    if sqlerrm <> 'studio_idempotency_conflict' then raise; end if;
  end;

  perform public.studio_create_order(v_expiring_draft,v_intake,repeat('a',64),repeat(md5('draft-request'),2),repeat(md5('draft-ip'),2),repeat(md5('draft-email'),2),repeat('e',64),6);
  update public.studio_orders set checkout_expires_at=now()-interval '1 second' where id=v_expiring_draft;
  v_count := public.studio_release_expired_drafts();
  v_capacity := public.studio_capacity_status(6);
  if v_count <> 1 or (v_capacity->>'reserved')::integer <> 3 then raise exception 'An expired unbound draft kept its capacity'; end if;
  perform public.studio_create_order(v_held_session,v_intake,repeat('a',64),repeat(md5('held-request'),2),repeat(md5('held-ip'),2),repeat(md5('held-email'),2),repeat('e',64),6);
  update public.studio_orders set stripe_checkout_session_id='cs_sql_held',checkout_expires_at=now()-interval '1 second' where id=v_held_session;
  v_count := public.studio_release_expired_drafts();
  v_capacity := public.studio_capacity_status(6);
  if v_count <> 0 or (v_capacity->>'reserved')::integer <> 6 then raise exception 'A known Stripe session was released without provider confirmation'; end if;
  v_changed := public.studio_record_expired(v_held_session,'cs_sql_held','evt_sql_held_expired');
  v_capacity := public.studio_capacity_status(6);
  if not v_changed or (v_capacity->>'reserved')::integer <> 3 then raise exception 'Provider-confirmed expiration did not release capacity'; end if;

  update public.studio_orders set created_at=now()-interval '2 days' where id=v_id;

  select count(*) into v_count from public.studio_claim_order(v_lease_a,20);
  if v_count <> 0 then raise exception 'Unpaid order was claimable'; end if;
  begin
    perform public.studio_record_payment(v_id,'evt_wrong_amount','cs_studio_sql','pi_studio_sql',499,'usd','marketing-setup-v1',now());
    raise exception 'Expected amount mismatch';
  exception when raise_exception then
    if sqlerrm <> 'studio_payment_mismatch' then raise; end if;
  end;
  v_changed := public.studio_record_payment(v_id,'evt_studio_sql_paid','cs_studio_sql','pi_studio_sql',4900,'usd','marketing-setup-v1',v_paid_at);
  if not v_changed then raise exception 'Valid payment was not persisted'; end if;
  if not exists(select 1 from public.studio_orders where id=v_id and paid_at=v_paid_at) then raise exception 'Delayed reconciliation changed the actual payment time'; end if;
  v_changed := public.studio_record_payment(v_id,'evt_studio_sql_paid','cs_studio_sql','pi_studio_sql',4900,'usd','marketing-setup-v1',now());
  if v_changed or (select count(*) from public.studio_order_events where event_type='payment_confirmed') <> 1 then raise exception 'Payment replay was not idempotent'; end if;

  select * into v_order from public.studio_claim_order(v_lease_a,20);
  if v_order.id <> v_id or v_order.generation_attempts <> 1 then raise exception 'First claim failed'; end if;
  v_capacity := public.studio_capacity_status(3);
  if (v_capacity->>'spent')::integer <> 1 or (v_capacity->>'reserved')::integer <> 2
    or (v_capacity->>'checkout_available')::boolean then raise exception 'A worker claim did not consume exactly one reserved attempt'; end if;
  select count(*) into v_count from public.studio_claim_order(v_lease_b,20);
  if v_count <> 0 then raise exception 'Active lease was claimed twice'; end if;
  if public.studio_finish_generation(v_id,v_lease_b,v_output,'{}') then raise exception 'Wrong lease completed an order'; end if;

  update public.studio_orders set lease_expires_at=now()-interval '1 second' where id=v_id;
  select * into v_order from public.studio_claim_order(v_lease_b,20);
  if v_order.id <> v_id or v_order.generation_attempts <> 2 then raise exception 'Crashed lease was not recovered'; end if;
  if public.studio_finish_generation(v_id,v_lease_a,v_output,'{}') then raise exception 'Stale worker overwrote a new lease'; end if;
  if not public.studio_finish_generation(v_id,v_lease_b,v_output,'{}') then raise exception 'Current worker could not commit'; end if;
  v_capacity := public.studio_capacity_status(3);
  if (v_capacity->>'spent')::integer <> 2 or (v_capacity->>'reserved')::integer <> 0
    or (v_capacity->>'remaining')::integer <> 1 or (v_capacity->>'checkout_available')::boolean then raise exception 'Completion did not release only unused retries'; end if;
  if not exists(select 1 from public.studio_orders where id=v_id and status='ready' and output is not null)
    or not exists(select 1 from public.studio_deliveries where order_id=v_id and status='pending') then raise exception 'Output and delivery outbox were not committed together'; end if;
  select count(*) into v_count from public.studio_claim_order(v_lease_a,20);
  if v_count <> 0 then raise exception 'Delivered output was regenerated'; end if;

  select count(*) into v_count from public.studio_claim_delivery(v_lease_a);
  if v_count <> 1 then raise exception 'Ready output did not become deliverable'; end if;
  select count(*) into v_count from public.studio_claim_delivery(v_lease_b);
  if v_count <> 0 then raise exception 'Email lease was claimed twice'; end if;
  update public.studio_deliveries set first_attempt_at=now()-interval '24 hours',lease_expires_at=now()-interval '1 second' where order_id=v_id;
  select count(*) into v_count from public.studio_claim_delivery(v_lease_b);
  if v_count <> 0 or not exists(select 1 from public.studio_deliveries where order_id=v_id and status='failed' and last_error_code='delivery_receipt_needs_review') then raise exception 'Email retried beyond the provider idempotency window'; end if;

  perform public.studio_create_order(v_other,v_intake,repeat('a',64),repeat('1',64),repeat('2',64),repeat('3',64),repeat('4',64));
  perform public.studio_record_payment(v_other,'evt_studio_sql_paid_2','cs_studio_sql_2','pi_studio_sql_2',4900,'usd','marketing-setup-v1',now());
  select count(*) into v_count from public.studio_claim_order(v_lease_a,2);
  if v_count <> 0 then raise exception 'Global rolling generation cap was ignored'; end if;
  for i in 1..3 loop
    select * into v_order from public.studio_claim_order(v_lease_a,20);
    if v_order.id <> v_other or v_order.generation_attempts <> i then raise exception 'Retry claim attempt count is wrong'; end if;
    update public.studio_orders set lease_expires_at=now()-interval '1 second',next_attempt_at=now()-interval '1 second' where id=v_other;
  end loop;
  select count(*) into v_count from public.studio_claim_order(v_lease_b,20);
  if v_count <> 0 or not exists(select 1 from public.studio_orders where id=v_other and status='needs_attention' and generation_attempts=3) then raise exception 'Retries were not bounded'; end if;

  update public.studio_orders set refund_status='failed' where id=v_other;
  if public.studio_record_payment(v_other,'evt_late_failed_refund','cs_studio_sql_2','pi_studio_sql_2',4900,'usd','marketing-setup-v1',now()) then raise exception 'A payment replay reopened a failed refund'; end if;

  perform public.studio_create_order(v_pending_refund,v_intake,repeat('a',64),repeat('5',64),repeat('6',64),repeat('7',64),repeat('8',64));
  perform public.studio_record_payment(v_pending_refund,'evt_refunded_before_checkout','cs_sql_pending_refund','pi_sql_pending_refund',4900,'usd','marketing-setup-v1',now(),'pending','re_sql_pending',0,'provider_refund_requires_action',false);
  select count(*) into v_count from public.studio_claim_order(v_lease_a,20);
  if v_count <> 0 or not exists(select 1 from public.studio_orders where id=v_pending_refund and status='cancelled' and refund_status='pending') then raise exception 'A refund observed before checkout became claimable'; end if;

  for i in 1..5 loop
    perform public.studio_create_order(gen_random_uuid(),v_intake,repeat('a',64),repeat(md5('request-'||i::text),2),repeat('9',64),repeat(md5('email-'||i::text),2),repeat('a',64),100);
  end loop;
  begin
    perform public.studio_create_order(gen_random_uuid(),v_intake,repeat('a',64),repeat(md5('sixth-request'),2),repeat('9',64),repeat(md5('sixth-email'),2),repeat('a',64),100);
    raise exception 'Expected durable order rate limit';
  exception when raise_exception then
    if sqlerrm <> 'studio_rate_limited' then raise; end if;
  end;

  perform public.studio_record_reversal('pi_studio_sql','evt_studio_sql_refund','refund',4900);
  if not exists(select 1 from public.studio_orders where id=v_id and payment_status='refunded' and refund_status='completed' and status='cancelled') then raise exception 'Refund did not stop fulfillment'; end if;
  if public.studio_record_payment(v_id,'evt_studio_sql_late_payment','cs_studio_sql','pi_studio_sql',4900,'usd','marketing-setup-v1',now()) then raise exception 'Late payment replay reopened a refunded order'; end if;
end;
$$;

rollback;
