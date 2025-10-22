-- Idempotent DB repair for pricing pipeline
-- 1) Import queue table
create table if not exists public.catalog_import_queue (
  id uuid primary key default gen_random_uuid(),
  set_code text not null,
  number text not null,
  lang text not null default 'en',
  status text not null default 'queued',
  retries int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

-- 2) latest price view
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='latest_card_prices_v') then
    execute 'drop view public.latest_card_prices_v';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='card_print_id') then
    execute $$
      create view public.latest_card_prices_v as
      select distinct on (cp.card_print_id)
        cp.card_print_id as card_id,
        cp.low  as price_low,
        cp.mid  as price_mid,
        cp.high as price_high,
        coalesce(cp.currency,'USD') as currency,
        cp.last_updated as observed_at
      from public.card_prices cp
      order by cp.card_print_id, cp.last_updated desc
    $$;
  elsif exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='card_id') then
    execute $$
      create view public.latest_card_prices_v as
      select distinct on (cp.card_id)
        cp.card_id,
        cp.price_low,
        cp.price_mid,
        cp.price_high,
        coalesce(cp.currency,'USD') as currency,
        cp.observed_at
      from public.card_prices cp
      order by cp.card_id, cp.observed_at desc
    $$;
  else
    execute $$
      create view public.latest_card_prices_v as
      select null::uuid as card_id, null::numeric as price_low, null::numeric as price_mid, null::numeric as price_high, null::text as currency, null::timestamptz as observed_at where false
    $$;
  end if;
end $$;

grant select on public.latest_card_prices_v to anon, authenticated;

