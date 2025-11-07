-- Create user_profiles table and finalize RLS policies
-- Idempotent and safe for repeated runs

-- Ensure extension for uuid if needed
create extension if not exists pgcrypto;

-- Table: public.user_profiles
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple trigger to keep updated_at fresh
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_user_profiles_set_updated_at'
  ) then
    create or replace function public.set_updated_at()
    returns trigger language plpgsql as $$
    begin
      new.updated_at := now();
      return new;
    end; $$;

    create trigger trg_user_profiles_set_updated_at
      before update on public.user_profiles
      for each row execute function public.set_updated_at();
  end if;
end$$;

-- Enable RLS
alter table public.user_profiles enable row level security;

-- Policies (idempotent by name)
do $$
begin
  -- Allow users to read their own profile
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='profiles_self_select'
  ) then
    create policy profiles_self_select
      on public.user_profiles
      for select
      using (auth.uid() = id);
  end if;

  -- Allow users to create their own profile row
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='profiles_self_insert'
  ) then
    create policy profiles_self_insert
      on public.user_profiles
      for insert
      with check (auth.uid() = id);
  end if;

  -- Allow users to update their own profile
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='profiles_self_update'
  ) then
    create policy profiles_self_update
      on public.user_profiles
      for update
      using (auth.uid() = id);
  end if;

  -- Service role full manage
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles' and policyname='profiles_service_manage'
  ) then
    create policy profiles_service_manage
      on public.user_profiles
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- Grants (RLS still applies)
grant select, insert, update on public.user_profiles to authenticated;

