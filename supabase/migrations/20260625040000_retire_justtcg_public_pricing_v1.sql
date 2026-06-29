-- RETIRE-JUSTTCG-PUBLIC-PRICING-V1
--
-- JustTCG tables remain as historical/internal data, but current app-facing
-- pricing must no longer read or display JustTCG-derived prices.

create or replace view public.v_card_pricing_ui_v1 as
select
  cp.id as card_print_id,
  eapl.nm_median::numeric(12,2) as primary_price,
  case
    when eapl.nm_median is not null then 'ebay'::text
    else 'none'::text
  end as primary_source,
  null::numeric as grookai_value,
  null::numeric(12,2) as min_price,
  null::numeric(12,2) as max_price,
  null::bigint as variant_count,
  eapl.nm_median::numeric(12,2) as ebay_median_price,
  eapl.listing_count as ebay_listing_count
from public.card_prints cp
left join public.ebay_active_prices_latest eapl
  on eapl.card_print_id = cp.id;
