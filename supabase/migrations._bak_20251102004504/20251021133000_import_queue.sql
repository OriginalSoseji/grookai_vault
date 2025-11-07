-- Catalog import queue for server-side upserts into public.card_prints
create extension if not exists pgcrypto;

create table if not exists public.catalog_import_queue (
  id uuid primary key default gen_random_uuid(),
  set_code text not null,
  number   text not null,
  number_norm text generated always as (lower(number)) stored,
  lang     text not null default 'en',
  lang_norm text generated always as (lower(coalesce(lang,'en'))) stored,
  status   text not null default 'queued', -- queued, processing, done, error
  retries  int  not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uniqueness to keep idempotent enqueues per set/num/lang
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uq_importq_set_num_lang_norm'
  ) then
    create unique index uq_importq_set_num_lang_norm on public.catalog_import_queue (set_code, number_norm, lang_norm);
  end if;
end $$;

-- Status index to drain efficiently
create index if not exists idx_importq_status_created on public.catalog_import_queue (status, created_at);

-- updated_at trigger
do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname='set_updated_at_importq'
  ) then
    create function public.set_updated_at_importq()
    returns trigger language plpgsql as $$
    begin
      new.updated_at := now();
      return new;
    end;
    $$;
  end if;

  if not exists (
    select 1 from pg_trigger t join pg_class c on t.tgrelid=c.oid join pg_namespace n on c.relnamespace=n.oid
    where n.nspname='public' and c.relname='catalog_import_queue' and t.tgname='trg_importq_set_updated_at'
  ) then
    create trigger trg_importq_set_updated_at
      before update on public.catalog_import_queue
      for each row execute function public.set_updated_at_importq();
  end if;
end $$;

-- Grants: read-only to authenticated for status poll; writes via service role/SECURITY DEFINER only
grant select on table public.catalog_import_queue to authenticated;

