-- Run after the studio_order_revisions_v1 migration on an empty studio schema or disposable database.
-- No provider, email, checkout, charge, or refund is called. All fixtures roll back.
-- The explicit empty-table guard prevents this test from touching customer work.
begin;

do $$
declare
  v_a uuid := '11111111-1111-4111-8111-111111111111';
  v_b uuid := '22222222-2222-4222-8222-222222222222';
  v_c uuid := '33333333-3333-4333-8333-333333333333';
  v_d uuid := '44444444-4444-4444-8444-444444444444';
  v_e uuid := '55555555-5555-4555-8555-555555555555';
  v_legacy uuid := '66666666-6666-4666-8666-666666666666';
  v_missing uuid := '77777777-7777-4777-8777-777777777777';
  v_lease_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_lease_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_lease_c uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_order public.studio_orders%rowtype;
  v_before public.studio_orders%rowtype;
  v_revision public.studio_order_revisions%rowtype;
  v_status text;
  v_changed boolean;
  v_fn text;
  v_reserved integer;
  v_version text := 'brand-foundation-paid-v1';
  v_intake jsonb := ('{"productVersion":"brand-foundation-paid-v1","brand":{"businessName":"SQL Test Brand"},"email":"test@example.invalid","acceptedTerms":true,"approvedBackbrief":true,"approvalSnapshotSha256":"' || repeat('9',64) || '"}')::jsonb;
  v_revised jsonb := ('{"productVersion":"brand-foundation-paid-v1","brand":{"businessName":"SQL Test Brand, revised"},"email":"test@example.invalid","acceptedTerms":true,"approvedBackbrief":true,"approvalSnapshotSha256":"' || repeat('8',64) || '"}')::jsonb;
  v_legacy_intake jsonb := '{"businessName":"SQL Test Business","businessDescription":"Synthetic fixture only; never fulfilled.","audience":"Synthetic readers","offer":"A synthetic test offer","goal":"Test delivery correctness","approvedFacts":"This is a synthetic test fixture.","callToAction":"Do not contact anyone.","voiceSample":"","constraints":"No provider calls.","email":"test@example.invalid","platform":"chatgpt","acceptedTerms":true}'::jsonb;
  v_output jsonb := '{"schemaVersion":"brand-foundation-paid-v1","price":{"amount":4900},"foundation":{},"synthesis":{},"provenance":"Synthetic fixture.","requiresCustomerReview":true}'::jsonb;
  v_revised_output jsonb := '{"schemaVersion":"brand-foundation-paid-v1","price":{"amount":4900},"foundation":{"revised":true},"synthesis":{},"provenance":"Synthetic fixture, revised.","requiresCustomerReview":true}'::jsonb;
  v_legacy_output jsonb := '{"schemaVersion":1,"businessBrief":{},"email":{},"socialPosts":[],"reusableWorkflow":{},"qualityChecklist":[],"validation":{"requiresHumanReview":true}}'::jsonb;
  v_usage jsonb := '{"model":"claude-haiku-4-5-20251001","input_tokens":2000,"output_tokens":1000,"cost_microusd":7000,"cost_basis":"reported"}'::jsonb;
begin
  if exists(select 1 from public.studio_orders) then raise exception 'Smoke test requires an empty studio schema; no customer rows were modified.'; end if;

  -- Browser roles cannot reach any new function or the table; the replaced capacity function keeps its revocation.
  foreach v_fn in array array[
    'public.studio_order_revisions_contract()', 'public.studio_request_revision(uuid,jsonb,text,integer,bigint,integer)',
    'public.studio_claim_revision(uuid,integer)', 'public.studio_add_revision_usage(uuid,uuid,jsonb)',
    'public.studio_finish_revision(uuid,uuid,jsonb,jsonb)', 'public.studio_fail_revision(uuid,uuid,text,jsonb)',
    'public.studio_revision_measure()', 'public.studio_capacity_status(integer)'] loop
    if has_function_privilege('anon', v_fn, 'EXECUTE') or has_function_privilege('authenticated', v_fn, 'EXECUTE') then raise exception 'Browser role can execute %', v_fn; end if;
    if not has_function_privilege('service_role', v_fn, 'EXECUTE') then raise exception 'Service role cannot execute %', v_fn; end if;
  end loop;
  if has_table_privilege('anon','public.studio_order_revisions','SELECT') or has_table_privilege('authenticated','public.studio_order_revisions','SELECT')
    or not (select relrowsecurity from pg_class where oid = 'public.studio_order_revisions'::regclass) then raise exception 'The revision table is reachable from a browser role'; end if;
  if public.studio_order_revisions_contract() <> '{"version":"studio-order-revisions-v1","product":"brand-foundation-paid-v1","window_days":7,"max_calls":2}'::jsonb then raise exception 'Revision contract is wrong'; end if;

  -- Fixtures: A is a delivered Brand Kit, B is unpaid, the legacy order is a delivered Marketing Setup.
  perform public.studio_create_versioned_order(v_a,v_version,v_intake,repeat('a',64),repeat('1',64),repeat('2',64),repeat('3',64),repeat('e',64),3,350000,50);
  if not public.studio_record_payment(v_a,'evt_a','cs_a','pi_a',4900,'usd',v_version,now()) then raise exception 'Fixture payment A failed'; end if;
  perform public.studio_claim_order(v_lease_a, 50);
  if not public.studio_finish_generation(v_a, v_lease_a, v_output, v_usage) then raise exception 'Fixture generation A failed'; end if;
  perform public.studio_create_versioned_order(v_b,v_version,v_intake,repeat('a',64),repeat('4',64),repeat('5',64),repeat('6',64),repeat('e',64),3,350000,50);
  perform public.studio_create_order(v_legacy,v_legacy_intake,repeat('b',64),repeat('7',64),repeat('8',64),repeat('9',64),repeat('e',64),50);
  if not public.studio_record_payment(v_legacy,'evt_legacy','cs_legacy','pi_legacy',4900,'usd','marketing-setup-v1',now()) then raise exception 'Fixture payment for the legacy order failed'; end if;
  perform public.studio_claim_order(v_lease_a, 50);
  if not public.studio_finish_generation(v_legacy, v_lease_a, v_legacy_output, '{}'::jsonb) then raise exception 'Fixture generation for the legacy order failed'; end if;
  select * into v_before from public.studio_orders where id = v_a;
  if v_before.status <> 'ready' or v_before.revision_requested_at is not null or v_before.model_calls <> 1 or v_before.model_cost_microusd <> 7000 then raise exception 'Fixture A is not a delivered kit with one metered call'; end if;

  -- Only a delivered, paid, unrefunded Brand Kit inside its window can ask, with changed and approved answers and a bound budget.
  begin perform public.studio_request_revision(v_missing,v_revised,repeat('c',64),2,600000,50); raise exception 'Expected a missing order to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_order_missing%' then raise; end if; end;
  begin perform public.studio_request_revision(v_legacy,v_revised,repeat('c',64),2,600000,50); raise exception 'Expected a Marketing Setup order to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_not_eligible%' then raise; end if; end;
  begin perform public.studio_request_revision(v_b,v_revised,repeat('c',64),2,600000,50); raise exception 'Expected an unpaid order to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_not_eligible%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_intake,repeat('c',64),2,600000,50); raise exception 'Expected unchanged answers to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_unchanged%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_revised || '{"email":"other@example.invalid"}'::jsonb,repeat('c',64),2,600000,50); raise exception 'Expected a changed delivery address to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_intake%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_revised - 'approvedBackbrief',repeat('c',64),2,600000,50); raise exception 'Expected unapproved answers to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_intake%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('c',64),null,null,50); raise exception 'Expected a revision without a bound budget to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_model_budget_required%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('c',64),3,600000,50); raise exception 'Expected more than two further calls to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_model_budget_required%' then raise; end if; end;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('c',64),2,600000,1); raise exception 'Expected a full day to refuse the request without using the allowance';
  exception when raise_exception then if sqlerrm not like '%studio_temporarily_full%' then raise; end if; end;

  -- Seven days run from the delivery email when one was sent, otherwise from the moment the kit was ready.
  update public.studio_orders set ready_at = now() - interval '8 days' where id = v_a;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('c',64),2,600000,50); raise exception 'Expected a kit ready eight days ago with no email to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_not_eligible%' then raise; end if; end;
  update public.studio_deliveries set status = 'sent', sent_at = now() - interval '8 days' where order_id = v_a;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('c',64),2,600000,50); raise exception 'Expected a kit emailed eight days ago to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_not_eligible%' then raise; end if; end;
  update public.studio_deliveries set sent_at = now() - interval '6 days' where order_id = v_a;
  if exists(select 1 from public.studio_order_revisions) or (select revision_requested_at from public.studio_orders where id = v_a) is not null then raise exception 'A refused request left a revision behind'; end if;

  -- The request: one row, limits bound, calls reserved, and the order's own answers and kit left exactly as they were.
  v_reserved := (public.studio_capacity_status(50)->>'reserved')::integer;
  select * into v_revision from public.studio_request_revision(v_a,v_revised,repeat('c',64),2,600000,50);
  select * into v_order from public.studio_orders where id = v_a;
  if v_revision.order_id <> v_a or v_revision.status <> 'queued' or v_revision.attempts <> 0 or v_revision.call_limit <> 2
    or v_revision.order_cost_limit_microusd <> 600000 or v_revision.calls_recorded <> 0 or v_revision.output is not null
    or v_revision.intake <> v_revised then raise exception 'Revision was not saved with its limits'; end if;
  if v_order.revision_requested_at is null or v_order.intake <> v_before.intake or v_order.intake_hash <> v_before.intake_hash
    or v_order.output <> v_before.output or v_order.status <> 'ready' or v_order.model_call_limit <> 3
    or v_order.model_cost_limit_microusd <> 350000 or v_order.model_calls <> 1 then raise exception 'The request changed the order beyond its marker'; end if;
  if (public.studio_capacity_status(50)->>'reserved')::integer <> v_reserved + 2 then raise exception 'A waiting revision did not reserve its two calls'; end if;
  if (select count(*) from public.studio_order_events where order_id = v_a and event_type = 'revision_requested') <> 1 then raise exception 'The request was not journaled once'; end if;

  -- One per order: the same request replays, a different one is refused.
  select * into v_revision from public.studio_request_revision(v_a,v_revised,repeat('c',64),2,600000,50);
  if (select count(*) from public.studio_order_revisions) <> 1
    or (select count(*) from public.studio_order_events where order_id = v_a and event_type = 'revision_requested') <> 1 then raise exception 'A replayed request created another revision'; end if;
  begin perform public.studio_request_revision(v_a,v_revised,repeat('d',64),2,600000,50); raise exception 'Expected a second, different revision to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_revision_already_used%' then raise; end if; end;

  -- Attempt 1: claimed once, counted as a provider attempt, and a failure that reached the provider lands in the order's ledger.
  select * into v_revision from public.studio_claim_revision(v_lease_a, 1);
  if v_revision.order_id is not null then raise exception 'A revision was claimed past the daily cap'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_a, 50);
  if v_revision.order_id <> v_a or v_revision.attempts <> 1 or v_revision.status <> 'generating' then raise exception 'Revision was not claimed'; end if;
  if (select count(*) from public.studio_order_events where order_id = v_a and event_type = 'generation_started' and metadata->>'revision' = 'true') <> 1 then raise exception 'A revision attempt was not counted as spent capacity'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_b, 50);
  if v_revision.order_id is not null then raise exception 'A leased revision was claimed twice'; end if;
  if public.studio_add_revision_usage(v_a, v_lease_b, v_usage) then raise exception 'Usage was accepted without the current lease'; end if;
  v_status := public.studio_fail_revision(v_a, v_lease_a, 'brand_output_ungrounded',
    '{"model":"claude-haiku-4-5-20251001","input_tokens":2400,"output_tokens":1300,"cost_microusd":9000,"cost_basis":"reported"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_a;
  select * into v_revision from public.studio_order_revisions where order_id = v_a;
  if v_status <> 'queued' or v_order.model_calls <> 2 or v_order.model_cost_microusd <> 16000 or v_order.model_cost_estimated
    or v_revision.calls_recorded <> 1 or v_revision.last_error_code <> 'brand_output_ungrounded' or v_revision.lease_token is not null then raise exception 'A failed revision attempt was not metered exactly'; end if;
  if public.studio_fail_revision(v_a, v_lease_a, 'again', null) <> 'lease_lost' then raise exception 'A released lease could still fail the revision'; end if;

  -- Attempt 2: waits for its retry time, refuses another product's output, then saves the revised kit beside the first.
  select * into v_revision from public.studio_claim_revision(v_lease_b, 50);
  if v_revision.order_id is not null then raise exception 'A retry was claimed before its time'; end if;
  update public.studio_order_revisions set next_attempt_at = now() - interval '1 second' where order_id = v_a;
  select * into v_revision from public.studio_claim_revision(v_lease_b, 50);
  if v_revision.order_id <> v_a or v_revision.attempts <> 2 then raise exception 'Retry was not claimed'; end if;
  begin perform public.studio_finish_revision(v_a, v_lease_b, v_legacy_output, '{}'::jsonb); raise exception 'Expected a Marketing Setup output to be refused for a revision';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_output%' then raise; end if; end;
  v_changed := public.studio_finish_revision(v_a, v_lease_b, v_revised_output,
    '{"model":"claude-sonnet-4-6","input_tokens":null,"output_tokens":900,"cost_microusd":111000,"cost_basis":"worst_case"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_a;
  select * into v_revision from public.studio_order_revisions where order_id = v_a;
  if not v_changed or v_revision.status <> 'ready' or v_revision.output <> v_revised_output or v_revision.ready_at is null
    or v_revision.lease_token is not null or v_revision.calls_recorded <> 2 then raise exception 'The revised kit was not saved'; end if;
  if v_order.output <> v_before.output or v_order.intake <> v_before.intake or v_order.status <> 'ready'
    or v_order.model_calls <> 3 or v_order.model_cost_microusd <> 127000 or not v_order.model_cost_estimated then raise exception 'The first kit changed, or the shared ledger is wrong'; end if;
  if (select count(*) from public.studio_order_events where order_id = v_a and event_type = 'model_usage_recorded' and metadata->>'revision' = 'true') <> 2
    or exists(select 1 from public.studio_order_events where order_id = v_a and event_type = 'model_budget_breached')
    or (select count(*) from public.studio_order_events where order_id = v_a and event_type = 'revision_completed') <> 1 then raise exception 'Revision events are wrong for an in-budget order'; end if;
  if (public.studio_capacity_status(50)->>'reserved')::integer <> v_reserved then raise exception 'A finished revision still reserves capacity'; end if;
  if public.studio_finish_revision(v_a, v_lease_b, v_revised_output, '{}'::jsonb) then raise exception 'A finished revision was finished twice'; end if;
  if (select model_calls from public.studio_orders where id = v_a) <> 3 then raise exception 'A replayed finish was metered again'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_c, 50);
  if v_revision.order_id is not null then raise exception 'A finished revision was claimed again'; end if;
  if (select count(*) from public.studio_deliveries where order_id = v_a) <> 1 then raise exception 'A revision changed the delivery ledger'; end if;

  -- A revision can never hold another version's output, pass its own call limit, or be ready without a kit.
  begin update public.studio_order_revisions set output = v_legacy_output where order_id = v_a; raise exception 'Expected a check violation: revision took a Marketing Setup output';
  exception when check_violation then null; end;
  begin update public.studio_order_revisions set attempts = 3 where order_id = v_a; raise exception 'Expected a check violation: attempts above the call limit';
  exception when check_violation then null; end;
  begin update public.studio_order_revisions set call_limit = 3 where order_id = v_a; raise exception 'Expected a check violation: call limit above two';
  exception when check_violation then null; end;
  begin update public.studio_order_revisions set output = null where order_id = v_a; raise exception 'Expected a check violation: ready without a kit';
  exception when check_violation then null; end;
  begin insert into public.studio_order_revisions(order_id, intake, intake_hash, call_limit, order_cost_limit_microusd) values(v_a, v_revised, repeat('d',64), 2, 600000); raise exception 'Expected a second revision row to be refused';
  exception when unique_violation then null; end;

  -- C: one allowed call, a tight ceiling. The breach is kept truthfully and flagged, the revision needs a person, the first kit stays.
  perform public.studio_create_versioned_order(v_c,v_version,v_intake,repeat('a',64),repeat('a',64),repeat('b',64),repeat('c',64),repeat('e',64),3,350000,50);
  if not public.studio_record_payment(v_c,'evt_c','cs_c','pi_c',4900,'usd',v_version,now()) then raise exception 'Fixture payment C failed'; end if;
  perform public.studio_claim_order(v_lease_a, 50);
  if not public.studio_finish_generation(v_c, v_lease_a, v_output, v_usage) then raise exception 'Fixture generation C failed'; end if;
  perform public.studio_request_revision(v_c,v_revised,repeat('c',64),1,10,50);
  select * into v_revision from public.studio_claim_revision(v_lease_a, 50);
  if v_revision.order_id <> v_c then raise exception 'Revision C was not claimed'; end if;
  v_status := public.studio_fail_revision(v_c, v_lease_a, 'brand_model_provider_error', '{"cost_microusd":5000,"cost_basis":"worst_case"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_c;
  if v_status <> 'needs_attention' or v_order.status <> 'ready' or v_order.output <> v_output or v_order.model_cost_microusd <> 12000
    or (select count(*) from public.studio_order_events where order_id = v_c and event_type = 'model_budget_breached' and metadata->>'revision' = 'true') <> 1
    or (select count(*) from public.studio_order_events where order_id = v_c and event_type = 'revision_needs_attention') <> 1 then raise exception 'An exhausted, over-budget revision was not recorded and flagged'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_b, 50);
  if v_revision.order_id is not null then raise exception 'A revision that needs attention was claimed again'; end if;

  -- D: a refund after the request stops the revision before any provider call and frees its reservation.
  perform public.studio_create_versioned_order(v_d,v_version,v_intake,repeat('a',64),repeat('d',64),repeat('e',64),repeat('f',64),repeat('e',64),3,350000,50);
  if not public.studio_record_payment(v_d,'evt_d','cs_d','pi_d',4900,'usd',v_version,now()) then raise exception 'Fixture payment D failed'; end if;
  perform public.studio_claim_order(v_lease_a, 50);
  if not public.studio_finish_generation(v_d, v_lease_a, v_output, v_usage) then raise exception 'Fixture generation D failed'; end if;
  v_reserved := (public.studio_capacity_status(50)->>'reserved')::integer;
  perform public.studio_request_revision(v_d,v_revised,repeat('c',64),2,600000,50);
  if (public.studio_capacity_status(50)->>'reserved')::integer <> v_reserved + 2 then raise exception 'Revision D did not reserve its calls'; end if;
  select * into v_order from public.studio_request_refund(v_d);
  if v_order.refund_status <> 'pending' then raise exception 'Fixture refund D failed'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_a, 50);
  if v_revision.order_id is not null then raise exception 'A revision was claimed for an order being refunded'; end if;
  if (public.studio_capacity_status(50)->>'reserved')::integer <> v_reserved then raise exception 'A refunded order still reserves revision capacity'; end if;

  -- E: a lease that expires. The late result is metered but not saved, and the last allowed attempt then needs a person.
  perform public.studio_create_versioned_order(v_e,v_version,v_intake,repeat('a',64),repeat('0',64),repeat('1',64),repeat('2',64),repeat('e',64),3,350000,50);
  if not public.studio_record_payment(v_e,'evt_e','cs_e','pi_e',4900,'usd',v_version,now()) then raise exception 'Fixture payment E failed'; end if;
  perform public.studio_claim_order(v_lease_a, 50);
  if not public.studio_finish_generation(v_e, v_lease_a, v_output, v_usage) then raise exception 'Fixture generation E failed'; end if;
  perform public.studio_request_revision(v_e,v_revised,repeat('c',64),1,600000,50);
  select * into v_revision from public.studio_claim_revision(v_lease_c, 50);
  if v_revision.order_id <> v_e then raise exception 'Revision E was not claimed'; end if;
  update public.studio_order_revisions set lease_expires_at = now() - interval '1 second' where order_id = v_e;
  if public.studio_finish_revision(v_e, v_lease_c, v_revised_output, v_usage) then raise exception 'A result was saved after its lease expired'; end if;
  if (select model_calls from public.studio_orders where id = v_e) <> 2 or (select output from public.studio_order_revisions where order_id = v_e) is not null then raise exception 'A late result was not metered, or was saved'; end if;
  select * into v_revision from public.studio_claim_revision(v_lease_a, 50);
  select * into v_revision from public.studio_order_revisions where order_id = v_e;
  if v_revision.status <> 'needs_attention' or v_revision.last_error_code <> 'revision_attempts_exhausted' or v_revision.lease_token is not null then raise exception 'An expired last attempt was not sent for attention'; end if;

  -- The measurement counts and identifies no one. Four paid kits, four revisions, far below the review line.
  if public.studio_revision_measure() <> '{"version":"studio-revision-measure-v1","paid_orders":4,"revisions":4,"first_25_orders":4,"first_25_revisions":4,"review_first_draft_quality":false}'::jsonb then raise exception 'Revision measure is wrong: %', public.studio_revision_measure(); end if;

  -- marketing-setup-v1 is untouched.
  select * into v_order from public.studio_orders where id = v_legacy;
  if v_order.revision_requested_at is not null or v_order.status <> 'ready' or v_order.model_calls is not null
    or exists(select 1 from public.studio_order_revisions where order_id = v_legacy) then raise exception 'A Marketing Setup order was touched by revisions'; end if;
end $$;

rollback;
