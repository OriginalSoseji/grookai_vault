drop materialized view if exists public.latest_prices;
drop view             if exists public.latest_prices;

create materialized view public.latest_prices as
select distinct on (
  po.print_id,
  coalesce(po.condition, '_'),
  coalesce(po.grade_agency, '_'),
  coalesce(po.grade_value, '_'),
  po.source
)
  po.print_id,
  po.condition,
  po.grade_agency,
  po.grade_value,
  po.source,
  po.price_usd,
  po.observed_at
from public.price_observations po
order by
  po.print_id,
  coalesce(po.condition, '_'),
  coalesce(po.grade_agency, '_'),
  coalesce(po.grade_value, '_'),
  po.source,
  po.observed_at desc;

create index if not exists idx_latest_prices_print
  on public.latest_prices (print_id);

grant select on public.latest_prices to anon, authenticated;
