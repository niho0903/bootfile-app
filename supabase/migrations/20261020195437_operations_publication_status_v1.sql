-- Compatibility correction for the already-applied owned-blog publisher.
-- The observed legacy constraint permits pending/approved/rejected only.
-- Preserve those meanings and all existing rows, and add the two explicit
-- publication lifecycle states. This changes neither RLS nor role grants.
alter table public.content_drafts
  drop constraint content_drafts_status_check,
  add constraint content_drafts_status_check
    check (status in ('pending','approved','rejected','published','withdrawn'));

comment on constraint content_drafts_status_check on public.content_drafts is
  'Preserves legacy review states and records explicit owned-blog publication/withdrawal without treating approval as proof of publication.';
