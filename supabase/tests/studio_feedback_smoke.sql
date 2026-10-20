-- Synthetic state transitions only. Requires an empty Studio schema and always
-- rolls back. No payment, model, email, analytics, or other provider is called.
begin;

do $$
declare
  v_id uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_old uuid := gen_random_uuid();
  v_unpaid uuid := gen_random_uuid();
  v_feedback jsonb;
  v_metrics jsonb;
  v_used_at timestamptz;
begin
  if exists(select 1 from public.studio_orders) then
    raise exception 'Feedback smoke requires an empty Studio schema; no customer rows were modified.';
  end if;
  if has_table_privilege('anon','public.studio_feedback','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.studio_feedback_requests','SELECT,INSERT,UPDATE,DELETE')
    or has_function_privilege('anon','public.studio_read_feedback(uuid,text)','EXECUTE')
    or has_function_privilege('authenticated','public.studio_record_feedback(uuid,text,text,text)','EXECUTE')
    or has_function_privilege('anon','public.get_studio_feedback_metrics(timestamptz)','EXECUTE')
    or not has_function_privilege('service_role','public.studio_record_feedback(uuid,text,text,text)','EXECUTE')
    or exists(select 1 from pg_class where oid in ('public.studio_feedback'::regclass,'public.studio_feedback_requests'::regclass) and not relrowsecurity) then
    raise exception 'Feedback role/RLS boundary is wrong';
  end if;

  insert into public.studio_orders(id,intake,intake_hash,request_key_hash,request_ip_hash,request_email_hash,access_token_hash,
    created_at,paid_at,ready_at,payment_status,status,output,stripe_payment_intent_id)
  values
    (v_id,'{}',repeat('a',64),repeat('1',64),repeat('b',64),repeat('c',64),repeat('d',64),now()-interval '2 hours',now()-interval '1 hour',now()-interval '30 minutes','paid','ready','{"schemaVersion":1}','pi_feedback_smoke_main'),
    (v_other,'{}',repeat('a',64),repeat('2',64),repeat('b',64),repeat('c',64),repeat('d',64),now()-interval '2 hours',now()-interval '1 hour',now()-interval '30 minutes','paid','ready','{"schemaVersion":1}','pi_feedback_smoke_other'),
    (v_old,'{}',repeat('a',64),repeat('3',64),repeat('b',64),repeat('c',64),repeat('d',64),now()-interval '9 days',now()-interval '8 days',now()-interval '8 days','paid','ready','{"schemaVersion":1}','pi_feedback_smoke_old'),
    (v_unpaid,'{}',repeat('a',64),repeat('4',64),repeat('b',64),repeat('c',64),repeat('d',64),now(),null,null,'awaiting_payment','awaiting_payment',null,null);

  if public.studio_read_feedback(v_id,repeat('e',64))->>'outcome' <> 'unavailable'
    or public.studio_record_feedback(v_id,repeat('e',64),repeat('a',64),'useful')->>'outcome' <> 'unavailable'
    or public.studio_record_feedback(v_unpaid,repeat('d',64),repeat('a',64),'useful')->>'outcome' <> 'unavailable' then
    raise exception 'Wrong capability or unpaid order reached feedback';
  end if;
  v_feedback := public.studio_read_feedback(v_id,repeat('d',64));
  if v_feedback->>'outcome' <> 'available' or v_feedback->'feedback' <> '{"usefulness":null,"usedAt":null,"reusedAt":null,"updatedAt":null}'::jsonb
    or exists(select 1 from public.studio_feedback) then
    raise exception 'A read inferred or created customer feedback';
  end if;

  if public.studio_record_feedback(v_id,repeat('d',64),repeat('a',64),'useful')->>'outcome' <> 'saved' then raise exception 'Initial feedback was not saved'; end if;
  perform public.studio_record_feedback(v_id,repeat('d',64),repeat('b',64),'not_useful');
  v_feedback := public.studio_record_feedback(v_id,repeat('d',64),repeat('a',64),'useful');
  if v_feedback->>'outcome' <> 'replayed' or v_feedback->'feedback'->>'usefulness' <> 'not_useful'
    or (select count(*) from public.studio_feedback_requests where order_id=v_id) <> 2 then
    raise exception 'A replay overwrote later feedback or duplicated its request';
  end if;
  if public.studio_record_feedback(v_id,repeat('d',64),repeat('a',64),'used')->>'outcome' <> 'idempotency_conflict' then
    raise exception 'Changed input reused an idempotency key';
  end if;

  perform public.studio_record_feedback(v_id,repeat('d',64),repeat('c',64),'used');
  update public.studio_feedback set used_at=now()-interval '10 minutes' where order_id=v_id;
  select used_at into v_used_at from public.studio_feedback where order_id=v_id;
  perform public.studio_record_feedback(v_id,repeat('d',64),repeat('e',64),'used');
  perform public.studio_record_feedback(v_id,repeat('d',64),repeat('f',64),'reused');
  if (select used_at from public.studio_feedback where order_id=v_id) <> v_used_at
    or (select reused_at from public.studio_feedback where order_id=v_id) is null then
    raise exception 'Explicit use/reuse reports lost their first timestamps';
  end if;
  -- Saying "used it again" explicitly reports both use and reuse.
  perform public.studio_record_feedback(v_old,repeat('d',64),repeat('a',64),'reused');
  if (select used_at is null or reused_at is null from public.studio_feedback where order_id=v_old) then
    raise exception 'An explicit reuse report was not preserved';
  end if;
  v_metrics := public.get_studio_feedback_metrics(now()-interval '7 days');
  if v_metrics->>'ready_orders' <> '2' or v_metrics->>'feedback_orders' <> '1'
    or v_metrics->>'usefulness_responses' <> '1' or v_metrics->>'not_useful_orders' <> '1'
    or v_metrics->>'useful_orders' <> '0' or v_metrics->>'first_use_orders' <> '1'
    or v_metrics->>'reuse_orders' <> '1' then
    raise exception 'Feedback cohort/denominators inferred use or counted an old order';
  end if;

  perform public.studio_request_refund(v_id);
  if public.studio_read_feedback(v_id,repeat('d',64))->>'outcome' <> 'unavailable'
    or public.studio_record_feedback(v_id,repeat('d',64),repeat('a',64),'useful')->>'outcome' <> 'unavailable'
    or public.studio_record_feedback(v_id,repeat('d',64),repeat('9',64),'useful')->>'outcome' <> 'unavailable' then
    raise exception 'A refund did not block feedback reads, writes, and replays';
  end if;
  if public.get_studio_feedback_metrics(now()-interval '7 days')->>'feedback_orders' <> '1' then
    raise exception 'A later refund erased the earlier self-report from its fulfilled cohort';
  end if;

  for i in 1..30 loop
    perform public.studio_record_feedback(v_other,repeat('d',64),lpad(to_hex(i),64,'0'),'useful');
  end loop;
  if public.studio_record_feedback(v_other,repeat('d',64),lpad(to_hex(31),64,'0'),'used')->>'outcome' <> 'rate_limited'
    or (select count(*) from public.studio_feedback_requests where order_id=v_other) <> 30 then
    raise exception 'Feedback request history is not bounded';
  end if;
  if public.studio_record_feedback(v_other,repeat('d',64),lpad(to_hex(1),64,'0'),'useful')->>'outcome' <> 'replayed' then
    raise exception 'A safe replay was blocked by the write limit';
  end if;
end;
$$;

select 'studio_feedback_smoke_passed' as result;
rollback;
