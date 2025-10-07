-- 2) Condition prices table
create table if not exists public.condition_prices (
  id bigserial primary key,
  card_id uuid not null,
  condition_label text not null,
  currency text not null default 'USD',
  market_price numeric,
  last_sold_price numeric,
  source text,
  ts timestamptz default now(),
  unique(card_id, condition_label, currency, ts)
);
create index if not exists condition_prices_card_condition_ts
  on public.condition_prices (card_id, condition_label, currency, ts desc);

-- 3) Graded prices table
create table if not exists public.graded_prices (
  id bigserial primary key,
  card_id uuid not null,
  grade_company text not null,
  grade_value numeric not null,
  grade_label text,
  currency text not null default 'USD',
  market_price numeric,
  last_sold_price numeric,
  pop_total int,
  source text,
  ts timestamptz default now(),
  unique(card_id, grade_company, grade_value, currency, ts)
);
create index if not exists graded_prices_card_grade_ts
  on public.graded_prices (card_id, grade_company, grade_value, currency, ts desc);

-- 4) Condition multipliers
create table if not exists public.condition_multipliers (
  condition_label text primary key,
  multiplier numeric not null
);
insert into public.condition_multipliers(condition_label, multiplier) values
  ('NM', 1.00),
  ('LP', 0.85),
  ('MP', 0.70),
  ('HP', 0.55),
  ('DMG', 0.40)
on conflict (condition_label) do nothing;

-- 5) Best prices across base/condition/graded
drop view if exists public.v_best_prices_all;

create view public.v_best_prices_all as
with
base as (
  select distinct on (pr.card_id)
    pr.card_id,
    pr.market_price as base_market,
    pr.source       as base_source,
    pr.ts           as base_ts
  from public.prices pr
  where pr.currency = 'USD' and pr.market_price is not null
  order by pr.card_id, pr.ts desc nulls last
),
cond as (
  select distinct on (cp.card_id, cp.condition_label)
    cp.card_id,
    cp.condition_label,
    cp.market_price as cond_market,
    cp.source       as cond_source,
    cp.ts           as cond_ts
  from public.condition_prices cp
  where cp.currency = 'USD' and cp.market_price is not null
  order by cp.card_id, cp.condition_label, cp.ts desc nulls last
),
grad as (
  select distinct on (gp.card_id, gp.grade_company, gp.grade_value)
    gp.card_id,
    gp.grade_company,
    gp.grade_value,
    gp.grade_label,
    gp.market_price as grad_market,
    gp.source       as grad_source,
    gp.ts           as grad_ts
  from public.graded_prices gp
  where gp.currency = 'USD' and gp.market_price is not null
  order by gp.card_id, gp.grade_company, gp.grade_value, gp.ts desc nulls last
)
select
  coalesce(grad.card_id, cond.card_id, base.card_id) as card_id,
  base.base_market, base.base_source, base.base_ts,
  cond.condition_label, cond.cond_market, cond.cond_source, cond.cond_ts,
  grad.grade_company, grad.grade_value, grad.grade_label, grad.grad_market, grad.grad_source, grad.grad_ts
from base
full join cond on cond.card_id = base.card_id
full join grad on grad.card_id = coalesce(base.card_id, cond.card_id);
