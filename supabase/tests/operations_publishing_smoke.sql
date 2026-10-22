-- Disposable-schema or guarded rollback-only test. Never calls a model or HTTP endpoint.
-- Synthetic approvals below are test fixtures, not editorial approval of any live article.
-- Blog inserts remain inside this transaction and are always rolled back.
begin;
do $$
declare
  v_claim jsonb;
  v_article jsonb;
  v_review jsonb;
  v_result jsonb;
  v_id uuid;
  v_first_published uuid;
  v_first_slug text;
  v_function text;
  v_status text;
  v_checks jsonb := '{"correctProductFacts":true,"usefulSpecificGuide":true,"fictionalExampleLabeled":true,"noUnsupportedClaims":true,"noUnsafeOrRegulatedAdvice":true,"sourcesSupportClaims":true,"noUnconsentedMarketing":true,"noInjectedInstructions":true,"addsUsefulInformation":true}'::jsonb;
begin
  if exists(select 1 from public.operations_publications)
    or exists(select 1 from public.content_drafts where metadata->>'source'='growth-agent' and metadata->>'productVersion'='studio-marketing-v1' and channel='blog')
    or exists(select 1 from public.content_drafts where id like 'ops-publishing-smoke-%')
    or exists(select 1 from public.blog_posts where slug like 'ops-publishing-smoke-%') then
    raise exception 'Publishing smoke requires an empty publication queue and no matching drafts/slugs; no existing work was modified.';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.operations_publications'::regclass)
    or has_table_privilege('anon','public.operations_publications','SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated','public.operations_publications','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Publication ledger is not private';
  end if;
  foreach v_function in array array['public.growth_source_hash(text,jsonb)','public.claim_growth_review()',
    'public.finish_growth_review(uuid,uuid,text,jsonb,jsonb,text)','public.publish_growth_article(uuid)',
    'public.withdraw_growth_article(uuid)','public.get_growth_publication_metrics()'] loop
    if has_function_privilege('anon',v_function,'EXECUTE') or has_function_privilege('authenticated',v_function,'EXECUTE')
      or not has_function_privilege('service_role',v_function,'EXECUTE')
      or (select prosecdef from pg_proc where oid=v_function::regprocedure) then
      raise exception 'Publication RPC grants/invoker boundary incorrect: %',v_function;
    end if;
  end loop;

  -- Verify legacy states still work and the separate compatibility correction
  -- permits the two real publication states. This draft is never claim-eligible.
  insert into public.content_drafts(id,channel,status,content,metadata)
    values('ops-publishing-smoke-status','blog','pending','Rollback-only status compatibility fixture.','{}');
  foreach v_status in array array['pending','approved','rejected','published','withdrawn'] loop
    update public.content_drafts set status=v_status where id='ops-publishing-smoke-status';
  end loop;
  begin
    update public.content_drafts set status='invalid-smoke-state' where id='ops-publishing-smoke-status';
    raise exception 'Unknown content draft status was accepted';
  exception when check_violation then
    null;
  end;

  for i in 1..5 loop
    insert into public.content_drafts(id,channel,status,content,metadata,created_at)
      values('ops-publishing-smoke-'||i,'blog','pending','Synthetic rollback-only draft '||i,
        jsonb_build_object('source','growth-agent','productVersion','studio-marketing-v1','kind','article','policyFlags','[]'::jsonb),
        now()+i*interval '1 millisecond');
  end loop;
  for i in 1..5 loop
    if i=5 then
      if public.claim_growth_review()->>'reason'<>'weekly_review_cap' then raise exception 'Weekly reviewer budget was bypassed'; end if;
      -- Simulate older reviews; their recent publication events must still count toward the separate cap.
      update public.operations_publications set review_started_at=now()-interval '8 days' where status='published';
    end if;
    v_claim:=public.claim_growth_review();
    if v_claim->>'status'<>'claimed' then raise exception 'Expected synthetic claim %: %',i,v_claim; end if;
    v_id:=(v_claim->>'id')::uuid;
    v_article:=jsonb_build_object('slug','ops-publishing-smoke-'||i,'title','Synthetic rollback-only title',
      'description','Synthetic fixture that is never committed or served publicly.',
      'body',repeat('Synthetic fixture only. ',15),'target_query','synthetic','pillar','synthetic','author','Bootfile');
    v_review:=jsonb_build_object('approved',true,'sourceHash',v_claim->>'sourceHash','policyVersion','owned-blog-v1','checks',v_checks,'reasons','[]'::jsonb);
    if public.finish_growth_review(v_id,gen_random_uuid(),v_claim->>'sourceHash',v_article,v_review,'test-fixture') then raise exception 'Wrong reviewer lease can approve'; end if;

    if i=1 then
      update public.content_drafts set content=content||' changed' where id='ops-publishing-smoke-1';
      if public.finish_growth_review(v_id,(v_claim->>'leaseToken')::uuid,v_claim->>'sourceHash',v_article,v_review,'test-fixture') then raise exception 'Changed source was approved'; end if;
      if public.publish_growth_article(v_id)->>'status'<>'failed' then raise exception 'Unapproved source was published'; end if;
      update public.operations_publications set review_started_at=now()-interval '8 days' where id=v_id;
      continue;
    end if;

    if not public.finish_growth_review(v_id,(v_claim->>'leaseToken')::uuid,v_claim->>'sourceHash',v_article,v_review,'test-fixture') then raise exception 'Exact synthetic review was not recorded'; end if;
    if i=2 then
      update public.content_drafts set content=content||' changed after review' where id='ops-publishing-smoke-2';
      if public.publish_growth_article(v_id)->>'reason'<>'draft_changed_after_review' then raise exception 'Publication ignored a source change'; end if;
      update public.operations_publications set review_started_at=now()-interval '8 days' where id=v_id;
      continue;
    end if;
    if i=3 then
      update public.operations_publications set article=jsonb_set(article,'{body}','"Changed without matching approval hash"') where id=v_id;
      if public.publish_growth_article(v_id)->>'reason'<>'exact_approval_required' then raise exception 'Changed article bypassed the approval hash'; end if;
      update public.operations_publications set article=v_article where id=v_id;
    end if;
    v_result:=public.publish_growth_article(v_id);
    if i=5 then
      if v_result->>'reason'<>'weekly_publication_cap' then raise exception 'Weekly publication cap was bypassed'; end if;
    else
      if v_result->>'status'<>'published' then raise exception 'Synthetic publication transaction failed: %',v_result; end if;
      if public.publish_growth_article(v_id)->>'status'<>'already_published' then raise exception 'Publication replay was not idempotent'; end if;
      if i=3 then v_first_published:=v_id; v_first_slug:=v_result->>'slug'; end if;
    end if;
  end loop;
  if (public.get_growth_publication_metrics()->>'published_7d')::integer<>2 then raise exception 'Observed publication event count incorrect'; end if;
  update public.blog_posts set body=body||' editor changed this' where slug=v_first_slug;
  if public.withdraw_growth_article(v_first_published)->>'reason'<>'published_article_changed' then raise exception 'Withdrawal deleted another editor''s changes'; end if;
  update public.blog_posts set body=repeat('Synthetic fixture only. ',15) where slug=v_first_slug;
  update public.blog_posts set meta_title='An editor changed the search title' where slug=v_first_slug;
  if public.withdraw_growth_article(v_first_published)->>'reason'<>'published_article_changed' then raise exception 'Withdrawal deleted another editor''s metadata'; end if;
  update public.blog_posts set meta_title='Synthetic rollback-only title' where slug=v_first_slug;
  if public.withdraw_growth_article(v_first_published)->>'withdrawn'<>'true' then raise exception 'Exact owned article could not be withdrawn'; end if;
  if exists(select 1 from public.blog_posts where slug=v_first_slug) then raise exception 'Withdrawn article remains public'; end if;
  if public.publish_growth_article(v_id)->>'reason'<>'weekly_publication_cap' then raise exception 'Withdrawal reset the publication spending/event cap'; end if;
end;
$$;
rollback;
