-- Rollback for 20261114021500_studio_order_revisions_v1. Restores the exact prior capacity function
-- and removes the revision table, its functions and the marker column. It refuses to run once a
-- revision exists: at that point turn BRAND_KIT_REVISIONS_ENABLED off and repair forward instead.
begin;
do $$ begin
  if exists(select 1 from public.studio_order_revisions) then
    raise exception 'Rollback refused: a revision exists.';
  end if;
end $$;
drop function public.studio_revision_measure();
drop function public.studio_fail_revision(uuid,uuid,text,jsonb);
drop function public.studio_finish_revision(uuid,uuid,jsonb,jsonb);
drop function public.studio_add_revision_usage(uuid,uuid,jsonb);
drop function public.studio_claim_revision(uuid,integer);
drop function public.studio_request_revision(uuid,jsonb,text,integer,bigint,integer);
drop function public.studio_order_revisions_contract();
create or replace function public.studio_capacity_status(p_daily_limit integer default 20)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with capacity as (
    select least(greatest(coalesce(p_daily_limit,20),1),100) as daily_limit,
      (select count(*) from public.studio_order_events where event_type = 'generation_started'
        and created_at > now() - interval '24 hours') as spent,
      (select coalesce(sum(case
        when payment_status = 'awaiting_payment' and status = 'awaiting_payment' then 3
        when payment_status = 'paid' and refund_status = 'none' and output is null
          and status in ('queued','generating') then 3 - generation_attempts
        else 0 end),0) from public.studio_orders) as reserved
  ) select jsonb_build_object('limit',daily_limit,'spent',spent,'reserved',reserved,
      'remaining',greatest(daily_limit - spent - reserved,0),
      'checkout_available',daily_limit - spent - reserved >= 3) from capacity;
$$;
drop table public.studio_order_revisions;
alter table public.studio_orders drop column revision_requested_at;
commit;
