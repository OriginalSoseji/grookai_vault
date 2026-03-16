create or replace view public.v_grookai_value_v2 with (security_invoker=true) as
with base as (
  select
    cap.card_print_id,
    cap.nm_floor::numeric as nm_floor,
    cap.nm_median::numeric as nm_median,
    cap.listing_count,
    cap.confidence::numeric as confidence,
    coalesce(cap.listing_count, 0)::numeric as listing_count_eff
  from public.card_print_active_prices cap
  where cap.card_print_id is not null
),
calc as (
  select
    b.card_print_id,
    b.nm_floor,
    b.nm_median,
    b.listing_count,
    b.confidence,
    case
      when b.nm_floor is null or b.nm_median is null then null::numeric
      else least(
        b.nm_median,
        greatest(b.nm_floor, b.nm_median * 0.70::numeric)
      )
    end as effective_floor_nm,
    case
      when b.nm_floor is null or b.nm_floor <= 0::numeric or b.nm_median is null then null::numeric
      else b.nm_median / nullif(b.nm_floor, 0::numeric)
    end as spread_ratio,
    greatest(
      0::numeric,
      least(1::numeric, (b.listing_count_eff - 5::numeric) / 35::numeric)
    ) as w_liquidity,
    case
      when b.nm_floor is null or b.nm_floor <= 0::numeric or b.nm_median is null then 0.35::numeric
      when b.nm_median / b.nm_floor <= 1.10::numeric then 1.00::numeric
      when b.nm_median / b.nm_floor <= 1.20::numeric then 0.90::numeric
      when b.nm_median / b.nm_floor <= 1.35::numeric then 0.75::numeric
      when b.nm_median / b.nm_floor <= 1.60::numeric then 0.55::numeric
      when b.nm_median / b.nm_floor <= 2.00::numeric then 0.35::numeric
      else 0.20::numeric
    end as w_spread,
    case
      when b.confidence is null then 1::numeric
      else 0.90::numeric + 0.10::numeric * greatest(0::numeric, least(1::numeric, b.confidence))
    end as conf_factor
  from base b
),
weighted as (
  select
    c.card_print_id,
    c.nm_floor,
    c.nm_median,
    c.listing_count,
    c.confidence,
    c.effective_floor_nm,
    c.spread_ratio,
    c.w_liquidity,
    c.w_spread,
    greatest(0::numeric, least(1::numeric, c.w_liquidity * c.w_spread)) as w_median,
    c.conf_factor
  from calc c
),
gv as (
  select
    w.card_print_id,
    w.nm_floor,
    w.nm_median,
    w.listing_count,
    w.confidence,
    w.effective_floor_nm,
    w.spread_ratio,
    w.w_liquidity,
    w.w_spread,
    w.w_median,
    case
      when w.effective_floor_nm is null or w.nm_median is null then null::numeric
      else (w.w_median * w.nm_median) + ((1::numeric - w.w_median) * w.effective_floor_nm)
    end as gv_raw,
    w.conf_factor
  from weighted w
)
select
  g.card_print_id,
  g.nm_floor,
  g.nm_median,
  g.listing_count,
  g.confidence,
  g.effective_floor_nm,
  g.spread_ratio,
  g.w_liquidity,
  g.w_spread,
  g.w_median,
  g.gv_raw,
  g.conf_factor,
  case
    when g.nm_floor is null or g.nm_median is null then null::numeric
    else greatest(
      least(g.nm_floor, g.nm_median),
      least(greatest(g.nm_floor, g.nm_median), g.gv_raw * g.conf_factor)
    )
  end as grookai_value_nm
from gv g;

create or replace view public.v_grookai_value_compare_v1_v2 with (security_invoker=true) as
with ids as (
  select card_print_id from public.v_grookai_value_v1
  union
  select card_print_id from public.v_grookai_value_v1_1
  union
  select card_print_id from public.v_grookai_value_v2
)
select
  ids.card_print_id,
  coalesce(v2.nm_floor, v1_1.nm_floor, v1.nm_floor) as nm_floor,
  coalesce(v2.nm_median, v1_1.nm_median, v1.nm_median) as nm_median,
  coalesce(v2.listing_count, v1_1.listing_count, v1.listing_count) as listing_count,
  coalesce(v2.confidence, v1_1.confidence, v1.confidence) as confidence,
  v1.grookai_value_nm as v1_value,
  v1_1.grookai_value_nm as v1_1_value,
  v2.grookai_value_nm as v2_value,
  case
    when v1.grookai_value_nm is null or v2.grookai_value_nm is null then null::numeric
    else v2.grookai_value_nm - v1.grookai_value_nm
  end as delta_v1_to_v2,
  case
    when v1_1.grookai_value_nm is null or v2.grookai_value_nm is null then null::numeric
    else v2.grookai_value_nm - v1_1.grookai_value_nm
  end as delta_v1_1_to_v2,
  v2.spread_ratio as spread_ratio_v2
from ids
left join public.v_grookai_value_v1 v1
  on v1.card_print_id = ids.card_print_id
left join public.v_grookai_value_v1_1 v1_1
  on v1_1.card_print_id = ids.card_print_id
left join public.v_grookai_value_v2 v2
  on v2.card_print_id = ids.card_print_id;
