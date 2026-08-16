\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

begin transaction read only;
set local statement_timeout = '180s';

with latest_day as materialized (
    select observed_on
    from public.tcgcsv_source_price_daily_observations
    where category_id = 1
    order by observed_on desc
    limit 1
  ),
  product_subtypes as materialized (
    select
      observation.product_id,
      array_agg(distinct observation.subtype_name_normalized order by observation.subtype_name_normalized) as subtypes,
      array_agg(distinct observation.subtype_name_normalized order by observation.subtype_name_normalized)
        filter (where observation.market_price > 0) as positive_market_subtypes
    from public.tcgcsv_source_price_daily_observations observation
    join latest_day on latest_day.observed_on = observation.observed_on
    where observation.category_id = 1
    group by observation.product_id
  )
select jsonb_build_object(
  'product_id', product.product_id,
  'group_id', product.group_id,
  'name', product.name,
  'subtypes', coalesce(subtypes.subtypes, array[]::text[]),
  'positive_market_subtypes', coalesce(subtypes.positive_market_subtypes, array[]::text[])
)::text
from public.tcgcsv_source_products product
left join product_subtypes subtypes on subtypes.product_id = product.product_id
where product.category_id = 1
  and product.source_active
order by product.product_id;

commit;
