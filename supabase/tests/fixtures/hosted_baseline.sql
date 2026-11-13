-- Disposable-database stand-in for what the hosted project provides before the studio migrations:
-- the three API roles, their default privileges, and the two legacy tables the publishing migration
-- extends. Column shapes were read from the hosted project's catalog on 2026-11-13. No data.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create table public.blog_posts (
  slug text primary key, title text not null, description text not null, body text not null,
  published_at date not null, updated_at timestamptz, meta_title text, meta_description text,
  target_query text, pillar text, author text, created_at timestamptz not null default now());
create table public.content_drafts (
  id text primary key, channel text not null,
  status text not null constraint content_drafts_status_check check (status in ('pending','approved','rejected')),
  content text not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
