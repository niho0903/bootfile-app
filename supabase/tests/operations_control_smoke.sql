-- Run only after the Studio and operations migrations on an empty/disposable schema.
-- No provider, checkout, generation, email, or refund is called. All fixtures roll back.
begin;

do $$
declare
  v_metrics jsonb;
  v_claim jsonb;
  v_expired_id uuid;
  v_current_id uuid;
  v_role text;
  v_table text;
  v_function text;
begin
  if exists (select 1 from public.studio_orders)
    or exists (select 1 from public.operations_runs)
    or exists (select 1 from public.operations_decisions) then
    raise exception 'Operations smoke requires empty Studio and operations tables; no customer work was modified.';
  end if;

  foreach v_table in array array['operations_runs','operations_decisions'] loop
    if not (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=v_table) then
      raise exception 'RLS missing on %', v_table;
    end if;
    foreach v_role in array array['anon','authenticated'] loop
      if has_table_privilege(v_role,'public.'||v_table,'SELECT,INSERT,UPDATE,DELETE') then
        raise exception 'Browser role % has operating table privileges on %',v_role,v_table;
      end if;
    end loop;
    if not has_table_privilege('service_role','public.'||v_table,'SELECT')
      or not has_table_privilege('service_role','public.'||v_table,'INSERT')
      or not has_table_privilege('service_role','public.'||v_table,'UPDATE') then
      raise exception 'Service role missing operating table privileges on %',v_table;
    end if;
  end loop;

  foreach v_function in array array[
    'public.get_operations_metrics(timestamptz)',
    'public.claim_operations_run(text)',
    'public.finish_operations_run(uuid,text,jsonb,text)'
  ] loop
    if has_function_privilege('anon',v_function,'EXECUTE')
      or has_function_privilege('authenticated',v_function,'EXECUTE')
      or not has_function_privilege('service_role',v_function,'EXECUTE') then
      raise exception 'Operating RPC grants incorrect: %',v_function;
    end if;
    if (select prosecdef from pg_proc where oid=v_function::regprocedure) then
      raise exception 'Operating RPC must retain invoker privileges: %',v_function;
    end if;
  end loop;

  v_metrics := public.get_operations_metrics(now()-interval '7 days');
  if exists(select 1 from jsonb_each_text(v_metrics) where value::bigint <> 0) then
    raise exception 'Empty schema did not produce observed zero metrics';
  end if;

  insert into public.studio_orders (
    id,intake,intake_hash,request_key_hash,request_ip_hash,request_email_hash,access_token_hash,
    payment_status,status,paid_at,ready_at,output,refund_status,refunded_amount,refund_requested_at,refund_last_error_code
  )
  select ('00000000-0000-4000-8000-00000000000'||i::text)::uuid,
    '{"synthetic":true}'::jsonb,repeat('a',64),repeat(md5('operations-smoke-'||i::text),2),repeat('b',64),repeat('c',64),repeat('d',64),
    case when i=2 then 'refunded' when i=5 then 'disputed' else 'paid' end,
    case when i=1 then 'ready' when i=3 then 'needs_attention' when i=6 then 'queued' else 'cancelled' end,
    case when i in (2,5) then now()-interval '10 days' else now()-interval '2 days' end,
    case when i=1 then now()-interval '1 day' else null end,
    case when i=1 then '{"schemaVersion":1}'::jsonb else null end,
    case when i=2 then 'completed' when i=3 then 'failed' when i=4 then 'pending' else 'none' end,
    case when i=2 then 4900 when i=3 then 1000 else 0 end,
    case when i=4 then now()-interval '2 days' else null end,
    case when i=4 then 'provider_refund_requires_action' else null end
  from generate_series(1,6) as fixture(i);
  insert into public.studio_deliveries (order_id,status,sent_at)
    values ('00000000-0000-4000-8000-000000000001','sent',now()-interval '1 day'),
           ('00000000-0000-4000-8000-000000000003','failed',null);
  v_metrics := public.get_operations_metrics(now()-interval '7 days');
  if (v_metrics->>'paid_orders')::bigint <> 4 or (v_metrics->>'gross_paid_cents')::bigint <> 19600
    or (v_metrics->>'ready_orders')::bigint <> 1 or (v_metrics->>'deliveries_sent')::bigint <> 1
    or (v_metrics->>'queued_orders')::bigint <> 1 or (v_metrics->>'needs_attention')::bigint <> 1
    or (v_metrics->>'delivery_failures')::bigint <> 1 or (v_metrics->>'refunded_orders')::bigint <> 1
    or (v_metrics->>'refunded_cents')::bigint <> 5900 or (v_metrics->>'disputed_orders')::bigint <> 1
    or (v_metrics->>'failed_refunds')::bigint <> 1 or (v_metrics->>'refund_requires_action')::bigint <> 1
    or (v_metrics->>'stale_refunds')::bigint <> 1 then
    raise exception 'Operating aggregate counts, periods, or actual refunded amounts are incorrect: %',v_metrics;
  end if;

  v_claim := public.claim_operations_run('cron');
  if v_claim->>'status' <> 'claimed' then raise exception 'Initial operating claim failed'; end if;
  v_expired_id := (v_claim->>'runId')::uuid;
  if not exists(select 1 from public.operations_runs where id=v_expired_id and lease_expires_at-started_at=interval '6 minutes') then
    raise exception 'Operating lease does not exceed the 300-second route';
  end if;
  if public.claim_operations_run('owner')->>'reason' <> 'run_already_active' then
    raise exception 'Owner/cron calls can overlap an active operating lease';
  end if;
  -- Only these synthetic rows are changed. Simulate an expired run from an older window.
  update public.operations_runs set run_key='smoke:expired',started_at=now()-interval '11 minutes',lease_expires_at=now()-interval '1 minute' where id=v_expired_id;
  v_claim := public.claim_operations_run('owner');
  if v_claim->>'status' <> 'claimed' then raise exception 'Expired run blocked normal recovery'; end if;
  v_current_id := (v_claim->>'runId')::uuid;
  if public.finish_operations_run(v_expired_id,'completed','{}',null) then raise exception 'Expired process can finalize an unknown run'; end if;
  if (public.get_operations_metrics(now()-interval '7 days')->>'unfinished_runs')::bigint <> 1
    or not exists(select 1 from public.operations_runs where id=v_expired_id and status='running' and finished_at is null) then
    raise exception 'Expired run outcome was invented or omitted from exception metrics';
  end if;
  if not public.finish_operations_run(v_current_id,'completed','{"synthetic":true}',null) then raise exception 'Current run could not finish'; end if;
  if public.finish_operations_run(v_current_id,'failed','{}','late_duplicate') then raise exception 'A duplicate finish overwrote the result'; end if;
  if public.claim_operations_run('cron')->>'reason' <> 'run_already_recorded_for_window' then raise exception 'Completed window was dispatched twice'; end if;
end;
$$;

rollback;
