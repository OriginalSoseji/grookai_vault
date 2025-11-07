-- Recreate v_vault_items_ext to include condition/grade fields from vault_items
drop view if exists public.v_vault_items_ext;

create view public.v_vault_items_ext as
with
items as (
  select
    vvi.*,
    -- pull condition/grade intent from the base table
    t.condition_label,
    t.is_graded,
    t.grade_company,
    t.grade_value,
    t.grade_label,

    -- make explicit "base" columns (already on v_vault_items)
    vvi.market_price as base_market_price,
    vvi.price_source as base_price_source,
    vvi.price_ts     as base_price_ts

  from public.v_vault_items vvi
  left join public.vault_items t
    on t.id = vvi.id
),
joiners as (
  select
    i.*,
    b.base_market,
    b.base_source,
    b.base_ts,
    b.condition_label as b_condition_label,
    b.cond_market,
    b.cond_source,
    b.cond_ts,
    b.grade_company   as b_grade_company,
    b.grade_value     as b_grade_value,
    b.grade_label     as b_grade_label,
    b.grad_market,
    b.grad_source,
    b.grad_ts
  from items i
  left join public.v_best_prices_all b
    on b.card_id = i.card_id
),
derived as (
  select
    j.*,
    -- if we have a base market AND the row has a chosen condition, grab multiplier
    case
      when j.base_market_price is not null and j.condition_label is not null then
        (select m.multiplier
           from public.condition_multipliers m
          where m.condition_label = j.condition_label)
      else null
    end as cond_multiplier
  from joiners j
)
select
  d.*,

  -- EFFECTIVE selection: graded > condition > derived > base
  case
    when d.is_graded = true  and d.grad_market is not null then 'GRADED'
    when coalesce(d.is_graded,false) = false and d.condition_label is not null and d.cond_market is not null then 'CONDITION'
    when coalesce(d.is_graded,false) = false and d.condition_label is not null
         and d.cond_market is null and d.base_market_price is not null and d.cond_multiplier is not null then 'DERIVED'
    when d.base_market_price is not null then 'BASE'
    else 'NONE'
  end as effective_mode,

  case
    when d.is_graded = true  and d.grad_market is not null then d.grad_market
    when coalesce(d.is_graded,false) = false and d.condition_label is not null and d.cond_market is not null then d.cond_market
    when coalesce(d.is_graded,false) = false and d.condition_label is not null
         and d.cond_market is null and d.base_market_price is not null and d.cond_multiplier is not null
         then d.base_market_price * d.cond_multiplier
    else d.base_market_price
  end as effective_price,

  case
    when d.is_graded = true  and d.grad_market is not null then d.grad_source
    when coalesce(d.is_graded,false) = false and d.condition_label is not null and d.cond_market is not null then d.cond_source
    when coalesce(d.is_graded,false) = false and d.condition_label is not null
         and d.cond_market is null and d.base_market_price is not null and d.cond_multiplier is not null
         then 'derived:' || coalesce(d.base_price_source, d.base_source)
    else coalesce(d.base_price_source, d.base_source)
  end as effective_source,

  case
    when d.is_graded = true  and d.grad_market is not null then d.grad_ts
    when coalesce(d.is_graded,false) = false and d.condition_label is not null and d.cond_market is not null then d.cond_ts
    when coalesce(d.is_graded,false) = false and d.condition_label is not null
         and d.cond_market is null and d.base_market_price is not null and d.cond_multiplier is not null
         then d.base_price_ts
    else d.base_price_ts
  end as effective_ts
from derived d;
