-- Run after the studio_product_versions_v1 migration on an empty studio schema or disposable database.
-- No provider, email, checkout, charge, or refund is called. All fixtures roll back.
-- The explicit empty-table guard prevents this test from touching customer work.
begin;

do $$
declare
  v_brand uuid := '11111111-1111-4111-8111-111111111111';
  v_legacy uuid := '22222222-2222-4222-8222-222222222222';
  v_tight uuid := '33333333-3333-4333-8333-333333333333';
  v_other uuid := '44444444-4444-4444-8444-444444444444';
  v_lease_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_lease_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  v_lease_c uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  v_order public.studio_orders%rowtype;
  v_status text;
  v_changed boolean;
  v_fn text;
  v_brand_version text := 'brand-foundation-paid-v1';
  v_brand_intake jsonb := ('{"productVersion":"brand-foundation-paid-v1","brand":{"businessName":"SQL Test Brand"},"email":"test@example.invalid","acceptedTerms":true,"approvedBackbrief":true,"approvalSnapshotSha256":"' || repeat('9',64) || '"}')::jsonb;
  v_legacy_intake jsonb := '{"businessName":"SQL Test Business","businessDescription":"Synthetic fixture only; never fulfilled.","audience":"Synthetic readers","offer":"A synthetic test offer","goal":"Test delivery correctness","approvedFacts":"This is a synthetic test fixture.","callToAction":"Do not contact anyone.","voiceSample":"","constraints":"No provider calls.","email":"test@example.invalid","platform":"chatgpt","acceptedTerms":true}'::jsonb;
  v_brand_output jsonb := '{"schemaVersion":"brand-foundation-paid-v1","price":{"amount":4900},"foundation":{},"synthesis":{},"provenance":"Synthetic fixture.","requiresCustomerReview":true}'::jsonb;
  v_legacy_output jsonb := '{"schemaVersion":1,"businessBrief":{},"email":{},"socialPosts":[],"reusableWorkflow":{},"qualityChecklist":[],"validation":{"requiresHumanReview":true}}'::jsonb;
begin
  if exists(select 1 from public.studio_orders) then raise exception 'Smoke test requires an empty studio schema; no customer rows were modified.'; end if;

  -- Browser roles cannot reach any new function; replaced functions keep their revocation.
  foreach v_fn in array array[
    'public.studio_product_versions()', 'public.studio_usage_number(jsonb,text)',
    'public.studio_add_model_usage(uuid,uuid,jsonb)', 'public.studio_fail_metered_generation(uuid,uuid,text,jsonb)',
    'public.studio_create_versioned_order(uuid,text,jsonb,text,text,text,text,text,integer,bigint,integer)',
    'public.studio_finish_generation(uuid,uuid,jsonb,jsonb)', 'public.studio_request_refund(uuid)',
    'public.studio_record_payment(uuid,text,text,text,integer,text,text,timestamptz,text,text,integer,text,boolean)'] loop
    if has_function_privilege('anon', v_fn, 'EXECUTE') or has_function_privilege('authenticated', v_fn, 'EXECUTE') then raise exception 'Browser role can execute %', v_fn; end if;
    if not has_function_privilege('service_role', v_fn, 'EXECUTE') then raise exception 'Service role cannot execute %', v_fn; end if;
  end loop;
  if public.studio_product_versions() <> '{"version":"studio-product-versions-v1","products":["marketing-setup-v1","brand-foundation-paid-v1"]}'::jsonb then raise exception 'Product version contract is wrong'; end if;

  -- Untrusted usage values are read defensively.
  if public.studio_usage_number('{"n":12.9}','n') <> 12 or public.studio_usage_number('{"n":"12"}','n') is not null
    or public.studio_usage_number('{"n":-1}','n') is not null or public.studio_usage_number('{"n":1e30}','n') is not null
    or public.studio_usage_number('[]','n') is not null or public.studio_usage_number(null,'n') is not null then raise exception 'Usage numbers are not read defensively'; end if;

  -- Creation admits only the versioned product, a complete approved intake, and a bound budget.
  begin
    perform public.studio_create_versioned_order(v_brand,'marketing-setup-v1',v_legacy_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),3,350000,20);
    raise exception 'Expected the versioned path to refuse marketing-setup-v1';
  exception when raise_exception then if sqlerrm not like '%studio_product_version_invalid%' then raise; end if; end;
  begin
    perform public.studio_create_versioned_order(v_brand,v_brand_version,v_brand_intake - 'approvedBackbrief',repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),3,350000,20);
    raise exception 'Expected an unapproved backbrief to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_intake%' then raise; end if; end;
  begin
    perform public.studio_create_versioned_order(v_brand,v_brand_version,v_brand_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),null,null,20);
    raise exception 'Expected an order without a bound budget to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_model_budget_required%' then raise; end if; end;
  select * into v_order from public.studio_create_versioned_order(v_brand,v_brand_version,v_brand_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('e',64),3,350000,20);
  if v_order.id <> v_brand or v_order.product_version <> v_brand_version or v_order.amount_total <> 4900 or v_order.currency <> 'usd'
    or v_order.model_call_limit <> 3 or v_order.model_cost_limit_microusd <> 350000 or v_order.model_calls <> 0
    or v_order.model_cost_microusd <> 0 or v_order.model_cost_estimated then raise exception 'Versioned order did not bind its product and budget'; end if;
  select * into v_order from public.studio_create_versioned_order(v_other,v_brand_version,v_brand_intake,repeat('a',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('f',64),3,350000,20);
  if v_order.id <> v_brand or (select count(*) from public.studio_orders) <> 1 then raise exception 'Request replay created another order'; end if;
  begin
    perform public.studio_create_versioned_order(v_other,v_brand_version,v_brand_intake,repeat('0',64),repeat('b',64),repeat('c',64),repeat('d',64),repeat('f',64),3,350000,20);
    raise exception 'Expected a changed intake under the same request key to conflict';
  exception when raise_exception then if sqlerrm not like '%studio_idempotency_conflict%' then raise; end if; end;

  -- A payment must be for the order's own persisted version.
  begin
    perform public.studio_record_payment(v_brand,'evt_wrong','cs_brand','pi_brand',4900,'usd','marketing-setup-v1',now());
    raise exception 'Expected a Marketing Setup payment to be refused for a Brand Kit order';
  exception when raise_exception then if sqlerrm not like '%studio_payment_mismatch%' then raise; end if; end;
  begin
    perform public.studio_record_payment(v_brand,'evt_unknown','cs_brand','pi_brand',4900,'usd','brand-foundation-paid-v2',now());
    raise exception 'Expected an unknown product version to be refused';
  exception when raise_exception then if sqlerrm not like '%studio_payment_mismatch%' then raise; end if; end;
  if not public.studio_record_payment(v_brand,'evt_brand','cs_brand','pi_brand',4900,'usd',v_brand_version,now()) then raise exception 'Brand Kit payment was not recorded'; end if;
  if (select status from public.studio_orders where id = v_brand) <> 'queued' then raise exception 'Paid Brand Kit order was not queued'; end if;

  -- Attempt 1: the wrong schema is refused, and a failed provider call is still counted.
  select * into v_order from public.studio_claim_order(v_lease_a, 20);
  if v_order.id <> v_brand or v_order.generation_attempts <> 1 or v_order.model_call_limit <> 3 then raise exception 'Brand Kit order was not claimed with its budget'; end if;
  begin
    perform public.studio_finish_generation(v_brand, v_lease_a, v_legacy_output, '{}'::jsonb);
    raise exception 'Expected a Marketing Setup output to be refused for a Brand Kit order';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_output%' then raise; end if; end;
  v_status := public.studio_fail_metered_generation(v_brand, v_lease_a, 'brand_output_ungrounded',
    '{"model":"claude-haiku-4-5-20251001","input_tokens":2400,"output_tokens":1300,"cost_microusd":8900,"cost_basis":"reported"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_brand;
  if v_status <> 'queued' or v_order.model_calls <> 1 or v_order.model_input_tokens <> 2400 or v_order.model_output_tokens <> 1300
    or v_order.model_cost_microusd <> 8900 or v_order.model_cost_estimated or v_order.last_error_code <> 'brand_output_ungrounded' then raise exception 'Failed attempt was not metered exactly'; end if;

  -- Attempt 2: malformed usage neither raises nor passes as a clean zero.
  update public.studio_orders set next_attempt_at = now() - interval '1 second' where id = v_brand;
  select * into v_order from public.studio_claim_order(v_lease_b, 20);
  if v_order.id <> v_brand or v_order.generation_attempts <> 2 then raise exception 'Retry was not claimed'; end if;
  v_status := public.studio_fail_metered_generation(v_brand, v_lease_b, 'provider_timeout', '{"cost_microusd":"lots","input_tokens":-5,"cost_basis":"reported"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_brand;
  if v_status <> 'queued' or v_order.model_calls <> 2 or v_order.model_cost_microusd <> 8900 or not v_order.model_cost_estimated then raise exception 'Unreported usage was stored as a clean zero'; end if;
  if public.studio_add_model_usage(v_brand, v_lease_b, '{"cost_microusd":1,"cost_basis":"reported"}'::jsonb) then raise exception 'Usage was accepted without the current lease'; end if;

  -- Attempt 3: the right schema is saved once, with the ledger complete and inside the budget.
  update public.studio_orders set next_attempt_at = now() - interval '1 second' where id = v_brand;
  select * into v_order from public.studio_claim_order(v_lease_c, 20);
  if v_order.generation_attempts <> 3 then raise exception 'Third attempt was not claimed'; end if;
  v_changed := public.studio_finish_generation(v_brand, v_lease_c, v_brand_output,
    '{"model":"claude-sonnet-4-6","input_tokens":null,"output_tokens":900,"cost_microusd":111000,"cost_basis":"worst_case"}'::jsonb);
  select * into v_order from public.studio_orders where id = v_brand;
  if not v_changed or v_order.status <> 'ready' or v_order.output <> v_brand_output or v_order.lease_token is not null
    or v_order.model_calls <> 3 or v_order.model_output_tokens <> 2200 or v_order.model_cost_microusd <> 119900
    or not v_order.model_cost_estimated then raise exception 'Brand Kit output or ledger was not committed'; end if;
  if (select count(*) from public.studio_deliveries where order_id = v_brand) <> 1 then raise exception 'Delivery was not queued once'; end if;
  if (select count(*) from public.studio_order_events where order_id = v_brand and event_type = 'model_usage_recorded') <> 3
    or exists(select 1 from public.studio_order_events where order_id = v_brand and event_type = 'model_budget_breached') then raise exception 'Usage events are wrong for an in-budget order'; end if;
  if public.studio_finish_generation(v_brand, v_lease_c, v_brand_output, '{}'::jsonb) then raise exception 'A completed order was finished twice'; end if;
  if (select model_calls from public.studio_orders where id = v_brand) <> 3 then raise exception 'A replayed finish was metered again'; end if;

  -- An order can never hold another version's output, a partial ledger, or an unknown version.
  begin update public.studio_orders set output = v_legacy_output where id = v_brand; raise exception 'Expected a check violation: Brand Kit order took a Marketing Setup output';
  exception when check_violation then null; end;
  begin update public.studio_orders set output = v_brand_output - 'schemaVersion' where id = v_brand; raise exception 'Expected a check violation: output without a schema version';
  exception when check_violation then null; end;
  update public.studio_orders set output = v_brand_output || jsonb_build_object('pad', repeat('x',120000)) where id = v_brand;
  begin update public.studio_orders set output = v_brand_output || jsonb_build_object('pad', repeat('x',150000)) where id = v_brand; raise exception 'Expected a check violation: Brand Kit output above its size bound';
  exception when check_violation then null; end;
  begin update public.studio_orders set model_calls = null where id = v_brand; raise exception 'Expected a check violation: partial ledger';
  exception when check_violation then null; end;
  begin update public.studio_orders set model_call_limit = 4 where id = v_brand; raise exception 'Expected a check violation: call limit above the attempt cap';
  exception when check_violation then null; end;
  begin update public.studio_orders set product_version = 'brand-foundation-paid-v2' where id = v_brand; raise exception 'Expected a check violation: unknown product version';
  exception when check_violation then null; end;
  begin
    insert into public.studio_orders(id, product_version, intake, intake_hash, request_key_hash, request_ip_hash, request_email_hash, access_token_hash)
      values(v_other, v_brand_version, v_brand_intake, repeat('a',64), repeat('1',64), repeat('2',64), repeat('3',64), repeat('4',64));
    raise exception 'Expected a check violation: Brand Kit order without a bound budget';
  exception when check_violation then null; end;

  -- The seven-day customer refund covers the new product.
  select * into v_order from public.studio_request_refund(v_brand);
  if v_order.refund_status <> 'pending' or v_order.status <> 'cancelled' then raise exception 'Brand Kit order was not refund eligible'; end if;

  -- marketing-setup-v1 is untouched: original creation path, original schema, no ledger.
  select * into v_order from public.studio_create_order(v_legacy,v_legacy_intake,repeat('5',64),repeat('6',64),repeat('7',64),repeat('8',64),repeat('e',64),20);
  if v_order.product_version <> 'marketing-setup-v1' or v_order.model_call_limit is not null or v_order.model_calls is not null
    or v_order.model_cost_microusd is not null or v_order.model_cost_estimated is not null then raise exception 'Marketing Setup order was given a budget or ledger'; end if;
  begin
    perform public.studio_record_payment(v_legacy,'evt_cross','cs_legacy','pi_legacy',4900,'usd',v_brand_version,now());
    raise exception 'Expected a Brand Kit payment to be refused for a Marketing Setup order';
  exception when raise_exception then if sqlerrm not like '%studio_payment_mismatch%' then raise; end if; end;
  if not public.studio_record_payment(v_legacy,'evt_legacy','cs_legacy','pi_legacy',4900,'usd','marketing-setup-v1',now()) then raise exception 'Marketing Setup payment was not recorded'; end if;
  select * into v_order from public.studio_claim_order(v_lease_a, 20);
  if v_order.id <> v_legacy then raise exception 'Marketing Setup order was not claimed'; end if;
  begin
    perform public.studio_finish_generation(v_legacy, v_lease_a, v_brand_output, '{}'::jsonb);
    raise exception 'Expected a Brand Kit output to be refused for a Marketing Setup order';
  exception when raise_exception then if sqlerrm not like '%studio_invalid_output%' then raise; end if; end;
  if not public.studio_finish_generation(v_legacy, v_lease_a, v_legacy_output, '{"model":"test","input_tokens":1,"output_tokens":1}'::jsonb) then raise exception 'Marketing Setup output was not committed'; end if;
  select * into v_order from public.studio_orders where id = v_legacy;
  if v_order.status <> 'ready' or v_order.model_calls is not null or v_order.model_cost_microusd is not null then raise exception 'Marketing Setup order was metered'; end if;
  if exists(select 1 from public.studio_order_events where order_id = v_legacy and event_type like 'model_%') then raise exception 'Marketing Setup order recorded model usage events'; end if;
  begin update public.studio_orders set output = v_legacy_output || jsonb_build_object('pad', repeat('x',100000)) where id = v_legacy; raise exception 'Expected a check violation: Marketing Setup output above its unchanged size bound';
  exception when check_violation then null; end;
  begin update public.studio_orders set output = v_brand_output where id = v_legacy; raise exception 'Expected a check violation: Marketing Setup order took a Brand Kit output';
  exception when check_violation then null; end;
  begin update public.studio_orders set model_call_limit = 3 where id = v_legacy; raise exception 'Expected a check violation: half-bound budget';
  exception when check_violation then null; end;

  -- A call recorded past its bound budget is kept truthfully and flagged, never rejected.
  select * into v_order from public.studio_create_versioned_order(v_tight,v_brand_version,v_brand_intake,repeat('a',64),repeat('d',64),repeat('e',64),repeat('f',64),repeat('e',64),1,10,20);
  if not public.studio_record_payment(v_tight,'evt_tight','cs_tight','pi_tight',4900,'usd',v_brand_version,now()) then raise exception 'Second Brand Kit payment was not recorded'; end if;
  select * into v_order from public.studio_claim_order(v_lease_b, 20);
  if v_order.id <> v_tight then raise exception 'Second Brand Kit order was not claimed'; end if;
  v_status := public.studio_fail_metered_generation(v_tight, v_lease_b, 'brand_model_provider_error', '{"cost_microusd":5000,"cost_basis":"worst_case"}'::jsonb);
  if (select model_cost_microusd from public.studio_orders where id = v_tight) <> 5000
    or (select count(*) from public.studio_order_events where order_id = v_tight and event_type = 'model_budget_breached') <> 1 then raise exception 'A budget breach was not recorded and flagged'; end if;
end $$;

rollback;
