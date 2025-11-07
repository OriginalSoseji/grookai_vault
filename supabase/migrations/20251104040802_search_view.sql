-- Extensions (idempotent)
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- View provides a resilient search surface across canonical + localized names
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='card_prints'
  ) then
    drop view if exists public.v_card_prints_search cascade;
    create or replace view public.v_card_prints_search as
    select
      cp.id                            as card_print_id,
      cp.set_code                      as set_code,
      cp.collector_number              as collector_number,
      cp.lang                          as lang,
      coalesce(cl.name_local, cp.name) as name_search,
      cp.name                          as name_canonical,
      cp.image_url,
      cp.image_alt_url
    from public.card_prints cp
    left join public.card_localizations cl
      on cl.card_print_id = cp.id
      and (cl.lang = cp.lang or cl.lang is not distinct from cp.lang);
  else
    -- Fallback empty view for environments without card_prints
    drop view if exists public.v_card_prints_search cascade;
    create or replace view public.v_card_prints_search as
    select
      null::uuid   as card_print_id,
      null::text   as set_code,
      null::text   as collector_number,
      null::text   as lang,
      null::text   as name_search,
      null::text   as name_canonical,
      null::text   as image_url,
      null::text   as image_alt_url
    where false;
  end if;
end $$;

-- Helpful indexes on base tables (guarded by existence)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='card_prints' and column_name='collector_number'
  ) then
    execute 'create index if not exists idx_card_prints_number on public.card_prints (collector_number)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='card_prints' and column_name='set_code'
  ) then
    execute 'create index if not exists idx_card_prints_set_code on public.card_prints (set_code)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='card_prints' and column_name='name'
  ) then
    execute 'create index if not exists idx_card_prints_name_trgm on public.card_prints using gin (lower(unaccent(name)) gin_trgm_ops)';
  end if;
end $$;

-- Conditional trigram index for localizations if table/column exist
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='card_localizations' and column_name='name_local'
  ) then
    execute 'create index if not exists idx_card_loc_name_trgm on public.card_localizations using gin (lower(unaccent(name_local)) gin_trgm_ops)';
  end if;
end $$;

-- Grant read on the view
grant select on public.v_card_prints_search to anon, authenticated;
