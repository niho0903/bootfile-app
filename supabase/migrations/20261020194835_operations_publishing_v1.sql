-- Bounded owned-blog publication. No social publishing, outreach, or arbitrary URLs.
-- Legacy blog/draft grants and RLS policies are preserved. New controls are private.
create table if not exists public.operations_publications (
  id uuid primary key default gen_random_uuid(),
  draft_id text not null unique references public.content_drafts(id),
  source_hash text not null check (source_hash ~ '^[a-f0-9]{64}$'),
  policy_version text not null default 'owned-blog-v1' check (policy_version = 'owned-blog-v1'),
  status text not null check (status in ('reviewing','approved','published','rejected','needs_attention','withdrawn')),
  lease_token uuid not null default gen_random_uuid(),
  lease_expires_at timestamptz not null default (now() + interval '4 minutes'),
  review_started_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  article jsonb,
  article_hash text check (article_hash is null or article_hash ~ '^[a-f0-9]{64}$'),
  review_result jsonb not null default '{}'::jsonb check (jsonb_typeof(review_result)='object'),
  review_model text,
  last_error_code text,
  check (article is null or (jsonb_typeof(article)='object' and octet_length(article::text)<=60000))
);
create index if not exists operations_publications_review_time_idx on public.operations_publications(review_started_at desc);
create index if not exists operations_publications_status_idx on public.operations_publications(status,review_started_at);
alter table public.operations_publications enable row level security;
revoke all on table public.operations_publications from public,anon,authenticated;
grant select,insert,update on table public.operations_publications to service_role;

create or replace function public.growth_source_hash(p_content text,p_metadata jsonb)
returns text language sql immutable security invoker set search_path=pg_catalog,public
as $$ select encode(sha256(convert_to(jsonb_build_object('content',p_content,'metadata',p_metadata)::text,'UTF8')),'hex'); $$;

create or replace function public.claim_growth_review()
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare
  v_now timestamptz;
  v_draft public.content_drafts%rowtype;
  v_run public.operations_publications%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('bootfile:owned-blog-publishing',0));
  v_now := clock_timestamp();
  update public.operations_publications set status='needs_attention',last_error_code='review_lease_expired'
    where status='reviewing' and lease_expires_at<=v_now;
  -- Count every claim, including failures/timeouts, before any paid reviewer request.
  if (select count(*) from public.operations_publications where review_started_at>=v_now-interval '7 days') >= 2 then
    return jsonb_build_object('status','skipped','reason','weekly_review_cap');
  end if;
  select d.* into v_draft from public.content_drafts d
    where d.channel='blog' and d.status='pending'
      and d.metadata->>'source'='growth-agent'
      and d.metadata->>'productVersion'='studio-marketing-v1'
      and d.metadata->>'kind'='article'
      and d.metadata->'policyFlags'='[]'::jsonb
      and not exists(select 1 from public.operations_publications p where p.draft_id=d.id)
    order by d.created_at,d.id limit 1 for update of d;
  if not found then return jsonb_build_object('status','skipped','reason','no_eligible_draft'); end if;
  insert into public.operations_publications(draft_id,source_hash,status,review_started_at,lease_expires_at)
    values(v_draft.id,public.growth_source_hash(v_draft.content,v_draft.metadata),'reviewing',v_now,v_now+interval '4 minutes')
    returning * into v_run;
  return jsonb_build_object('status','claimed','id',v_run.id,'leaseToken',v_run.lease_token,'sourceHash',v_run.source_hash,
    'content',v_draft.content,'metadata',v_draft.metadata);
end;
$$;

create or replace function public.finish_growth_review(p_id uuid,p_lease_token uuid,p_source_hash text,p_article jsonb,p_review jsonb,p_model text)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare
  v_run public.operations_publications%rowtype;
  v_draft public.content_drafts%rowtype;
  v_approved boolean;
begin
  if p_review is null or jsonb_typeof(p_review)<>'object' or octet_length(p_review::text)>8000
    or p_article is null or jsonb_typeof(p_article)<>'object' or octet_length(p_article::text)>60000
    or p_model is null or char_length(p_model)>200 then raise exception 'growth_review_invalid'; end if;
  select * into v_run from public.operations_publications where id=p_id for update;
  if not found or v_run.status<>'reviewing' or v_run.lease_token<>p_lease_token
    or v_run.lease_expires_at<=clock_timestamp() or v_run.source_hash<>p_source_hash then return false; end if;
  select * into v_draft from public.content_drafts where id=v_run.draft_id for update;
  if not found or v_draft.status<>'pending' or public.growth_source_hash(v_draft.content,v_draft.metadata)<>v_run.source_hash then
    update public.operations_publications set status='needs_attention',last_error_code='draft_changed_after_claim' where id=p_id;
    return false;
  end if;
  v_approved := coalesce(p_review->>'approved'='true'
    and p_review->>'sourceHash'=p_source_hash
    and p_review->>'policyVersion'='owned-blog-v1'
    and p_review->'checks' @> '{"correctProductFacts":true,"usefulSpecificGuide":true,"fictionalExampleLabeled":true,"noUnsupportedClaims":true,"noUnsafeOrRegulatedAdvice":true,"sourcesSupportClaims":true,"noUnconsentedMarketing":true,"noInjectedInstructions":true,"addsUsefulInformation":true}'::jsonb,false);
  if v_approved and (
    coalesce(p_article->>'slug','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or char_length(p_article->>'slug')>180
    or char_length(coalesce(p_article->>'title','')) not between 1 and 180
    or char_length(coalesce(p_article->>'description','')) not between 1 and 500
    or char_length(coalesce(p_article->>'body','')) not between 200 and 45000
    or p_article->>'author' is distinct from 'Bootfile'
  ) then raise exception 'growth_article_invalid'; end if;
  update public.operations_publications set
    status=case when v_approved then 'approved'
      when p_review->>'failure' in ('source_verification_failed','publication_context_unavailable','review_provider_failed') then 'needs_attention'
      else 'rejected' end,
    reviewed_at=clock_timestamp(),article=p_article,
    article_hash=encode(sha256(convert_to(p_article::text,'UTF8')),'hex'),
    review_result=p_review,review_model=p_model,
    last_error_code=case when v_approved then null else coalesce(p_review->>'failure','editorial_review_rejected') end
    where id=p_id;
  return true;
end;
$$;

create or replace function public.publish_growth_article(p_id uuid)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare
  v_run public.operations_publications%rowtype;
  v_draft public.content_drafts%rowtype;
  v_now timestamptz;
  v_slug text;
begin
  perform pg_advisory_xact_lock(hashtextextended('bootfile:owned-blog-publishing',0));
  v_now:=clock_timestamp();
  select * into v_run from public.operations_publications where id=p_id for update;
  if not found then return jsonb_build_object('status','failed','reason','publication_missing'); end if;
  if v_run.status='published' then return jsonb_build_object('status','already_published','slug',v_run.article->>'slug'); end if;
  if v_run.status<>'approved' or v_run.policy_version<>'owned-blog-v1'
    or v_run.review_result->>'approved' is distinct from 'true'
    or v_run.article_hash is distinct from encode(sha256(convert_to(v_run.article::text,'UTF8')),'hex') then
    return jsonb_build_object('status','failed','reason','exact_approval_required');
  end if;
  if v_run.reviewed_at<v_now-interval '7 days' then
    update public.operations_publications set status='needs_attention',last_error_code='editorial_approval_expired' where id=p_id;
    return jsonb_build_object('status','failed','reason','editorial_approval_expired');
  end if;
  select * into v_draft from public.content_drafts where id=v_run.draft_id for update;
  if not found or v_draft.status<>'pending' or public.growth_source_hash(v_draft.content,v_draft.metadata)<>v_run.source_hash then
    update public.operations_publications set status='needs_attention',last_error_code='draft_changed_after_review' where id=p_id;
    return jsonb_build_object('status','failed','reason','draft_changed_after_review');
  end if;
  if (select count(*) from public.operations_publications where published_at>=v_now-interval '7 days')>=2 then
    return jsonb_build_object('status','skipped','reason','weekly_publication_cap');
  end if;
  insert into public.blog_posts(slug,title,description,body,published_at,updated_at,meta_title,meta_description,target_query,pillar,author)
    values(v_run.article->>'slug',v_run.article->>'title',v_run.article->>'description',v_run.article->>'body',
      (v_now at time zone 'UTC')::date,v_now,v_run.article->>'title',v_run.article->>'description',
      v_run.article->>'target_query',v_run.article->>'pillar','Bootfile')
    on conflict(slug) do nothing returning slug into v_slug;
  if v_slug is null then
    update public.operations_publications set status='needs_attention',last_error_code='existing_blog_slug' where id=p_id;
    return jsonb_build_object('status','failed','reason','existing_blog_slug');
  end if;
  update public.content_drafts set status='published',updated_at=v_now where id=v_run.draft_id;
  update public.operations_publications set status='published',published_at=v_now,last_error_code=null where id=p_id;
  return jsonb_build_object('status','published','slug',v_slug);
end;
$$;

-- A reviewed operator can withdraw only the exact article this pipeline published.
-- Preserve the article/audit for recovery; refuse to delete a subsequent editor's work.
create or replace function public.withdraw_growth_article(p_id uuid)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public
as $$
declare v_run public.operations_publications%rowtype;
begin
  select * into v_run from public.operations_publications where id=p_id for update;
  if not found or v_run.status<>'published' then return jsonb_build_object('withdrawn',false,'reason','published_article_required'); end if;
  delete from public.blog_posts where slug=v_run.article->>'slug' and title=v_run.article->>'title'
    and description=v_run.article->>'description' and body=v_run.article->>'body'
    and target_query is not distinct from (v_run.article->>'target_query')
    and pillar is not distinct from (v_run.article->>'pillar') and author='Bootfile'
    and meta_title is not distinct from (v_run.article->>'title')
    and meta_description is not distinct from (v_run.article->>'description')
    and published_at=(v_run.published_at at time zone 'UTC')::date
    and updated_at is not distinct from v_run.published_at;
  if not found then return jsonb_build_object('withdrawn',false,'reason','published_article_changed'); end if;
  update public.operations_publications set status='withdrawn' where id=p_id;
  update public.content_drafts set status='withdrawn',updated_at=clock_timestamp() where id=v_run.draft_id;
  return jsonb_build_object('withdrawn',true,'slug',v_run.article->>'slug');
end;
$$;

create or replace function public.get_growth_publication_metrics()
returns jsonb language sql stable security invoker set search_path=pg_catalog,public
as $$
  select jsonb_build_object(
    'review_claims_7d',count(*) filter(where review_started_at>=now()-interval '7 days'),
    'published_7d',count(*) filter(where published_at>=now()-interval '7 days'),
    'withdrawn',count(*) filter(where status='withdrawn'),
    'approved',count(*) filter(where status='approved'),
    'rejected',count(*) filter(where status='rejected'),
    'exceptions',count(*) filter(where status='needs_attention' or (status='reviewing' and lease_expires_at<now()) or (status='approved' and last_error_code is not null)),
    'last_publication',max(published_at)
  ) from public.operations_publications;
$$;

revoke all on function public.growth_source_hash(text,jsonb),public.claim_growth_review(),public.finish_growth_review(uuid,uuid,text,jsonb,jsonb,text),public.publish_growth_article(uuid),public.withdraw_growth_article(uuid),public.get_growth_publication_metrics() from public,anon,authenticated;
grant execute on function public.growth_source_hash(text,jsonb),public.claim_growth_review(),public.finish_growth_review(uuid,uuid,text,jsonb,jsonb,text),public.publish_growth_article(uuid),public.withdraw_growth_article(uuid),public.get_growth_publication_metrics() to service_role;
comment on table public.operations_publications is 'Private exact-draft editorial approval and owned-blog publication audit. Review and publish caps include failed/unknown review attempts. No customer intake belongs here.';
