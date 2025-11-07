-- Public Profiles: safe anonymous read of opt-in fields
-- Idempotent and ordered after user_profiles creation.

do $$
begin
  -- Ensure base table exists; if not, skip gracefully (older environments)
  if to_regclass('public.user_profiles') is null then
    raise notice 'user_profiles not found; skipping public_profiles migration';
    return;
  end if;

  -- 1) Add a public toggle (default off)
  alter table public.user_profiles
    add column if not exists is_public boolean not null default false;

  -- 2) Create/replace a narrow view with only safe fields
  execute $$
    create or replace view public.public_profiles as
    select
      id,
      display_name,
      avatar_url
    from public.user_profiles
    where is_public = true
  $$;

  -- 3) RLS policy to allow anon/auth read of public rows on base table
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='profiles_public_read'
  ) then
    drop policy profiles_public_read on public.user_profiles;
  end if;

  create policy profiles_public_read
  on public.user_profiles
  for select
  to anon, authenticated
  using (is_public = true);

  -- 4) Grants (views are governed by underlying table RLS too)
  grant select on public.public_profiles to anon, authenticated;
end$$;

