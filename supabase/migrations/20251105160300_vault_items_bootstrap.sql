-- Bootstrap: create public.vault_items and basic RLS/policies
-- Based on supabase/sql/2025_09_vault_items.sql (table + policies only; RPC extended separately).

create table if not exists public.vault_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id text not null,
  grade text,
  condition text check (condition in ('NM','LP','MP','HP','DMG')),
  created_at timestamptz default now()
);

alter table if exists public.vault_items enable row level security;

-- Policies (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vault_items' and policyname='owner read'
  ) then
    create policy "owner read"   on public.vault_items for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vault_items' and policyname='owner insert'
  ) then
    create policy "owner insert" on public.vault_items for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='vault_items' and policyname='owner update'
  ) then
    create policy "owner update" on public.vault_items for update using (auth.uid() = user_id);
  end if;
end $$;

