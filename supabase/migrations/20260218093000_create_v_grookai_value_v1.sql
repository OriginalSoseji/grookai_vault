drop view if exists public.v_grookai_value_v1;

create view public.v_grookai_value_v1 as
with base as (
  select
    cap.card_print_id,
    cap.nm_floor,
    cap.nm_median,
    cap.listing_count,
    cap.confidence,
    coalesce(cap.listing_count, 0)::numeric as listing_count_eff
  from public.card_print_active_prices cap
  where cap.card_print_id is not null
),
calc as (
  select
    b.*,
    greatest(
      0::numeric,
      least(1::numeric, ((b.listing_count_eff - 5::numeric) / 35::numeric))
    ) as w_liquidity,
    case
      when b.confidence is null then 1::numeric
      else (0.9::numeric + 0.1::numeric * b.confidence::numeric)
    end as conf_factor
  from base b
),
gv as (
  select
    c.*,
    (
      (c.w_liquidity * c.nm_median::numeric) +
      ((1::numeric - c.w_liquidity) * c.nm_floor::numeric)
    ) as gv_raw
  from calc c
)
select
  g.card_print_id,
  g.nm_floor,
  g.nm_median,
  g.listing_count,
  g.confidence,
  g.w_liquidity,
  g.gv_raw,
  g.conf_factor,
  case
    when g.nm_floor is null or g.nm_median is null then null::numeric
    else greatest(
      least(g.nm_floor, g.nm_median),
      least(
        greatest(g.nm_floor, g.nm_median),
        (g.gv_raw * g.conf_factor)
      )
    )::numeric
  end as grookai_value_nm
from gv g;
