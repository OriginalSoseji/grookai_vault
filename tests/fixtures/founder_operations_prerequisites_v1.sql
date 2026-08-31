create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end;
$$;

create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text null
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'iat', coalesce(
      nullif(current_setting('request.jwt.claim.iat', true), ''),
      extract(epoch from now())::bigint::text
    )::bigint
  )
$$;

create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_has_founder_entitlement_v1()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
$$;

create or replace function public.enqueue_operations_notification_v1(p_payload jsonb)
returns table (
  notification_event_id uuid,
  notification_id text,
  recipient_count integer
)
language sql
security definer
set search_path = public
as $$
  select gen_random_uuid(), p_payload ->> 'notification_id', 1
$$;

grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;
grant execute on function auth.role() to authenticated, service_role;
grant execute on function auth.jwt() to authenticated, service_role;
