-- PRICING V2: condition-segmented, remove PriceCharting exposure, prep floors & index
-- 1) Ensure condition column on card_prices
alter table if exists public.card_prices
  add column if not exists condition text not null default 'NM';

create index if not exists idx_card_prices_card_cond_time
  on public.card_prices (card_id, condition, observed_at desc);

-- 2) Optional raw observations table (if missing)
create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.card_prints(id) on delete cascade,
  condition text not null default 'NM',
  source text not null,
  price numeric not null,
  currency text not null default 'USD',
  observed_at timestamptz not null default now()
);
create index if not exists idx_price_obs_card_cond_time
  on public.price_observations (card_id, condition, observed_at desc);

-- 3) Floors table (retail/market/vault)
create table if not exists public.card_floors (
  card_id uuid not null references public.card_prints(id) on delete cascade,
  condition text not null,
  source text not null check (source in ('retail','market','vault')),
  floor_price numeric not null,
  currency text not null default 'USD',
  observed_at timestamptz not null default now(),
  primary key (card_id, condition, source, observed_at)
);
create index if not exists idx_card_floors_latest
  on public.card_floors (card_id, condition, source, observed_at desc);

create or replace view public.latest_card_floors_v as
select t.* from (
  select *,
         row_number() over (partition by card_id, condition, source order by observed_at desc) rn
  from public.card_floors
) t where rn = 1;
grant select on public.latest_card_floors_v to anon, authenticated;

-- 4) GV baselines (third source, optional)
create table if not exists public.card_gv_baselines (
  card_id uuid not null references public.card_prints(id) on delete cascade,
  condition text not null,
  source text not null check (source in ('gv_sales','gv_listings','gv_public')),
  value numeric not null,
  currency text not null default 'USD',
  observed_at timestamptz not null default now(),
  primary key (card_id, condition, source, observed_at)
);

create or replace view public.latest_card_gv_baselines_v as
select t.* from (
  select *,
         row_number() over (partition by card_id, condition, source order by observed_at desc) rn
  from public.card_gv_baselines
) t where rn = 1;
grant select on public.latest_card_gv_baselines_v to anon, authenticated;

-- 5) Public latest prices: exclude PriceCharting from exposure
--    Keep shape the same but filter PC at the view level.
drop view if exists public.latest_card_prices_v;
create or replace view public.latest_card_prices_v as
select s.* from (
  select cp.*,
         row_number() over (partition by card_id, condition order by observed_at desc) rn
  from public.card_prices cp
  where lower(cp.source) <> 'pricecharting'
) s
where s.rn = 1;
grant select on public.latest_card_prices_v to anon, authenticated;

