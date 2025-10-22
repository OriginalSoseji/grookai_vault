-- Ensure card_prints has the expected columns and constraints for lazy import
-- Safe/idempotent: uses IF NOT EXISTS and conditional definitions

create extension if not exists pgcrypto;

-- Create table if missing (minimal form)
do $$
begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='card_prints'
  ) then
    create table public.card_prints (
      id uuid primary key default gen_random_uuid(),
      set_code text not null,
      number   text not null,
      -- normalized shadow columns for safe ON CONFLICT
      number_norm text generated always as (lower(number)) stored,
      lang_norm   text generated always as (lower(coalesce(lang,'en'))) stored,
      name     text,
      image_url     text,
      image_alt_url text,
      name_local    text,
      lang          text default 'en',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

-- Add any missing columns (for projects created with a placeholder table)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='set_code') then
    alter table public.card_prints add column set_code text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='number') then
    alter table public.card_prints add column number text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='name') then
    alter table public.card_prints add column name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='number_norm') then
    alter table public.card_prints add column number_norm text generated always as (lower(number)) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='lang') then
    alter table public.card_prints add column lang text default 'en';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='lang_norm') then
    alter table public.card_prints add column lang_norm text generated always as (lower(coalesce(lang,'en'))) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='image_url') then
    alter table public.card_prints add column image_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='image_alt_url') then
    alter table public.card_prints add column image_alt_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='name_local') then
    alter table public.card_prints add column name_local text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='created_at') then
    alter table public.card_prints add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prints' and column_name='updated_at') then
    alter table public.card_prints add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Ensure basic NOT NULL on identifiers if possible (skip if rows exist)
do $$
begin
  if not exists (select 1 from public.card_prints where set_code is null) then
    begin
      alter table public.card_prints alter column set_code set not null;
    exception when others then null; end;
  end if;
  if not exists (select 1 from public.card_prints where number is null) then
    begin
      alter table public.card_prints alter column number set not null;
    exception when others then null; end;
  end if;
end $$;

-- Unique triple for ON CONFLICT in direct upsert path (uses normalized shadows)
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_card_prints_set_num_lang_norm'
  ) then
    create unique index uq_card_prints_set_num_lang_norm on public.card_prints (set_code, number_norm, lang_norm);
  end if;
end $$;

-- updated_at trigger
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname='set_updated_at_card_prints'
  ) then
    create function public.set_updated_at_card_prints()
    returns trigger language plpgsql as $$
    begin
      new.updated_at := now();
      return new;
    end;
    $$;
  end if;

  if not exists (
    select 1 from pg_trigger t join pg_class c on t.tgrelid=c.oid join pg_namespace n on c.relnamespace=n.oid
    where n.nspname='public' and c.relname='card_prints' and t.tgname='trg_card_prints_set_updated_at'
  ) then
    create trigger trg_card_prints_set_updated_at
      before update on public.card_prints
      for each row execute function public.set_updated_at_card_prints();
  end if;
end $$;

grant select on table public.card_prints to anon, authenticated;
