create or replace view public.latest_card_prices_v as
with ranked as (
  select
    cp.*,
    row_number() over (
      partition by cp.card_print_id
      order by cp.last_updated desc
    ) rn
  from public.card_prices cp
)
select
  card_print_id        as card_id,
  low::numeric         as price_low,
  mid::numeric         as price_mid,
  high::numeric        as price_high,
  currency::text       as currency,
  last_updated         as observed_at,
  source::text         as source,
  null::numeric        as confidence,
  null::text           as gi_algo_version
from ranked
where rn = 1;

grant select on public.latest_card_prices_v to anon, authenticated, service_role;
