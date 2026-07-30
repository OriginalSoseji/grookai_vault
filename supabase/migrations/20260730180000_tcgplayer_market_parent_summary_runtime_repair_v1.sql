-- TCGPlayer Market Product V1 parent-summary runtime repair.
--
-- The parent summary expanded v_market_price_current_v1 twice: once for the
-- deterministic parent-price rank and once for active-ask aggregation. On the
-- production history volume, PostgreSQL selected a plan that exceeded both the
-- product and canary-observer statement timeouts. Materialize the already
-- governed current publication once and reuse that bounded row set.

create or replace view public.v_market_price_parent_summary_v1 as
with current_prices as materialized (
  select *
  from public.v_market_price_current_v1
),
ranked_parent_prices as materialized (
  select
    current_price.*,
    count(*) over (
      partition by current_price.card_print_id
    )::integer as eligible_printing_count,
    row_number() over (
      partition by current_price.card_print_id
      order by
        current_price.market_price asc,
        current_price.published_at desc,
        current_price.observed_at desc,
        current_price.card_printing_id asc
    ) as parent_price_rank
  from current_prices current_price
),
parent_active_asks as materialized (
  select
    current_price.card_print_id,
    min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
    sum(coalesce(active_ask.listing_count, 0))::integer
      as active_ask_listing_count,
    max(active_ask.observed_at) as active_ask_observed_at
  from current_prices current_price
  left join public.mv_market_listing_active_ask_current_v1 active_ask
    on active_ask.card_printing_id = current_price.card_printing_id
  group by current_price.card_print_id
)
select
  selected.card_print_id,
  selected.gv_id,
  selected.currency,
  selected.market_price::numeric as market_close,
  selected.eligible_printing_count,
  (selected.eligible_printing_count > 1) as is_from_price,
  selected.observed_at,
  selected.freshness,
  selected.provenance_id,
  active_ask.lowest_active_ask,
  active_ask.active_ask_listing_count,
  active_ask.active_ask_observed_at,
  selected.card_printing_id,
  selected.printing_gv_id,
  selected.finish_key,
  selected.published_at
from ranked_parent_prices selected
left join parent_active_asks active_ask
  on active_ask.card_print_id = selected.card_print_id
where selected.parent_price_rank = 1;

revoke all on public.v_market_price_parent_summary_v1
  from public, anon, authenticated;
grant select on public.v_market_price_parent_summary_v1 to service_role;

comment on view public.v_market_price_parent_summary_v1 is
  'Service-role parent summary grounded in one materialized current-publication read. Parent price is the deterministic minimum eligible exact printing; active asks come from the background-refreshed exact-printing materialized view.';
