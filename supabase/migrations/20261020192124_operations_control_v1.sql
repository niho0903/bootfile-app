-- Private operator ledger. Apply after the Studio commerce migration.
-- Application access uses a server-side service role; browser roles receive no grants.

create table if not exists public.operations_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  source text not null check (source in ('cron', 'owner')),
  status text not null check (status in ('running', 'completed', 'partial', 'failed', 'paused')),
  started_at timestamptz not null default now(),
  lease_expires_at timestamptz not null default (now() + interval '6 minutes'),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_code text,
  constraint operations_runs_summary_object check (jsonb_typeof(summary) = 'object')
);

create index if not exists operations_runs_started_at_idx
  on public.operations_runs (started_at desc);

create index if not exists operations_runs_unfinished_idx
  on public.operations_runs (started_at) where status = 'running';

create table if not exists public.operations_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  category text not null check (category in ('reliability', 'configuration', 'product', 'budget', 'policy')),
  severity text not null check (severity in ('critical', 'review')),
  title text not null check (char_length(title) between 1 and 160),
  detail text not null,
  recommended_action text not null,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  owner_note text check (owner_note is null or char_length(owner_note) <= 2000),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint operations_decisions_evidence_object check (jsonb_typeof(evidence) = 'object')
);

create index if not exists operations_decisions_open_idx
  on public.operations_decisions (created_at)
  where status <> 'resolved';

alter table public.operations_runs enable row level security;
alter table public.operations_decisions enable row level security;
revoke all on table public.operations_runs, public.operations_decisions from public, anon, authenticated;
grant select, insert, update on table public.operations_runs, public.operations_decisions to service_role;

-- Serialize owner and cron claims using database time. A five-minute key alone
-- cannot stop adjacent windows overlapping. Six minutes exceeds the 300s route.
-- Expired runs retain their unknown outcome; a new claim never marks them complete.
create or replace function public.claim_operations_run(p_source text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz;
  v_key text;
  v_id uuid;
begin
  if p_source is null or p_source not in ('cron', 'owner') then
    raise exception 'operations_source_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('bootfile:operations-run', 0));
  v_now := clock_timestamp();
  v_key := 'routine:' || floor(extract(epoch from v_now) / 300)::bigint::text;
  if exists (
    select 1 from public.operations_runs
    where status = 'running' and lease_expires_at > v_now
  ) then
    return jsonb_build_object('status', 'skipped', 'reason', 'run_already_active');
  end if;
  insert into public.operations_runs (run_key, source, status, started_at, lease_expires_at)
    values (v_key, p_source, 'running', v_now, v_now + interval '6 minutes')
    on conflict (run_key) do nothing
    returning id into v_id;
  if v_id is null then
    return jsonb_build_object('status', 'skipped', 'reason', 'run_already_recorded_for_window');
  end if;
  return jsonb_build_object('status', 'claimed', 'runId', v_id, 'runKey', v_key);
end;
$$;

-- The unique run ID is never reused. A late process cannot finish an expired run.
create or replace function public.finish_operations_run(p_run_id uuid, p_status text, p_summary jsonb, p_error_code text)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_status is null or p_status not in ('completed', 'partial', 'failed', 'paused')
    or p_summary is null or jsonb_typeof(p_summary) <> 'object'
    or octet_length(p_summary::text) > 20000
    or char_length(p_error_code) > 200 then
    raise exception 'operations_result_invalid';
  end if;
  update public.operations_runs set
    status = p_status, finished_at = clock_timestamp(), summary = p_summary, error_code = p_error_code
    where id = p_run_id and status = 'running' and lease_expires_at > clock_timestamp();
  return found;
end;
$$;

revoke all on function public.claim_operations_run(text), public.finish_operations_run(uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.claim_operations_run(text), public.finish_operations_run(uuid,text,jsonb,text) to service_role;

-- Aggregate in Postgres so a client row limit never silently truncates revenue or order counts.
-- Invoker privileges retain the same access boundary as the underlying private order tables.
create or replace function public.get_operations_metrics(p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'paid_orders', (select count(*) from public.studio_orders where paid_at >= p_since),
    'gross_paid_cents', (select coalesce(sum(amount_total), 0) from public.studio_orders where paid_at >= p_since),
    'ready_orders', (select count(*) from public.studio_orders where ready_at >= p_since),
    'deliveries_sent', (select count(*) from public.studio_deliveries where status = 'sent' and sent_at >= p_since),
    'queued_orders', (select count(*) from public.studio_orders where payment_status = 'paid' and status in ('queued', 'generating')),
    'needs_attention', (select count(*) from public.studio_orders where payment_status = 'paid' and status = 'needs_attention'),
    'delivery_failures', (select count(*) from public.studio_deliveries where status = 'failed'),
    'refunded_orders', (select count(*) from public.studio_orders where payment_status = 'refunded'),
    'refunded_cents', (select coalesce(sum(refunded_amount), 0) from public.studio_orders),
    'disputed_orders', (select count(*) from public.studio_orders where payment_status = 'disputed'),
    'failed_refunds', (select count(*) from public.studio_orders where refund_status = 'failed'),
    'refund_requires_action', (select count(*) from public.studio_orders where refund_status = 'pending' and refund_last_error_code = 'provider_refund_requires_action'),
    'stale_refunds', (select count(*) from public.studio_orders where refund_status = 'pending' and refund_requested_at < now() - interval '24 hours'),
    'unfinished_runs', (select count(*) from public.operations_runs where status = 'running' and started_at < now() - interval '10 minutes')
  );
$$;

revoke all on function public.get_operations_metrics(timestamptz) from public, anon, authenticated;
grant execute on function public.get_operations_metrics(timestamptz) to service_role;

comment on table public.operations_runs is 'Bounded Studio fulfillment and reconciliation execution audit. Never store secrets or customer intake here.';
comment on table public.operations_decisions is 'Owner review and operating exceptions. Acknowledging a record does not authorize money movement or external publication.';
