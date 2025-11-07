-- Grookai Index Platform (idempotent)
-- 1) pricing_config (singleton)
create table if not exists public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  weights_json jsonb not null,
  condition_curve jsonb not null,
  time_decay_days int not null default 30,
  outlier_policy jsonb,
  version_label text not null default 'gi-1.0',
  updated_at timestamptz not null default now()
);

-- 2) pricing_formula_versions (history)
create table if not exists public.pricing_formula_versions (
  version_label text primary key,
  weights_json jsonb not null,
  condition_curve jsonb not null,
  effective_at timestamptz not null default now(),
  notes text
);

-- 3) price_observations (append-only, internal)
create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null,
  source text not null check (source in ('pricecharting','justtcg','ebay','app')),
  low numeric,
  mid numeric,
  high numeric,
  sold_avg numeric,
  sample_size int,
  observed_at timestamptz not null default now()
);
create index if not exists idx_price_obs_print_observed on public.price_observations (card_print_id, observed_at desc);

-- 4) app_sales (first-party solds, for future blend)
create table if not exists public.app_sales (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null,
  condition_raw text,
  graded_label text,
  sold_price numeric not null,
  currency text not null default 'USD',
  fees_total numeric,
  shipping_total numeric,
  tax_total numeric,
  channel text not null default 'in-app',
  source_tx_id text,
  sold_at timestamptz not null default now(),
  verified boolean default false
);
create index if not exists idx_app_sales_print_sold on public.app_sales (card_print_id, sold_at desc);

-- 5) Extend public.card_prices with Grookai Index fields (if missing)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='grookai_index') then
      alter table public.card_prices add column grookai_index numeric;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='gi_algo_version') then
      alter table public.card_prices add column gi_algo_version text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='card_prices' and column_name='confidence') then
      alter table public.card_prices add column confidence text;
    end if;
  end if;
end $$;

-- 6) Refresh public client view (no source disclosure)
create or replace view public.latest_card_prices_v as
select distinct on (cp.card_print_id)
  cp.card_print_id as card_id,
  cp.low as price_low,
  cp.mid as price_mid,
  cp.high as price_high,
  cp.grookai_index,
  cp.confidence,
  coalesce(cp.currency,'USD') as currency,
  cp.last_updated as observed_at
from public.card_prices cp
order by cp.card_print_id, cp.last_updated desc;

grant select on public.latest_card_prices_v to anon, authenticated;

-- 7) Seed default config if missing (gi-1.0)
do $$
begin
  if not exists (select 1 from public.pricing_config) then
    insert into public.pricing_config (weights_json, condition_curve, outlier_policy, version_label)
    values (
      '{"pc_mid":0.6, "jtcg_low":0.4, "ebay_sold":0.0}',
      '{"NM":1.0, "LP":0.9, "HP":0.7, "DMG":0.5}',
      '{"trim_pct":0.05}',
      'gi-1.0'
    );
  end if;
  if not exists (select 1 from public.pricing_formula_versions where version_label='gi-1.0') then
    insert into public.pricing_formula_versions (version_label, weights_json, condition_curve, notes)
    values (
      'gi-1.0',
      '{"pc_mid":0.6, "jtcg_low":0.4, "ebay_sold":0.0}',
      '{"NM":1.0, "LP":0.9, "HP":0.7, "DMG":0.5}',
      'Initial Grookai Index formula'
    );
  end if;
end $$;

