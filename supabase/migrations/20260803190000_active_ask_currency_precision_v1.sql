-- ACTIVE_ASK_CURRENCY_PRECISION_V1
-- Normalize USD active-listing evidence to cents before it reaches the
-- materialized product snapshot. This changes no source evidence rows.

begin;

create or replace view public.v_market_listing_variant_active_ask_exact_v1 as
with exact_listings as (
  select
    assignment.card_print_id,
    assignment.card_printing_id,
    assignment.printing_gv_id,
    assignment.assigned_finish_key as finish_key,
    observation.seller_key,
    observation.total_ask_price::numeric as total_ask_price,
    observation.currency,
    observation.observed_at
  from public.market_listing_card_candidates candidate
  join public.market_evidence_variant_assignments assignment
    on assignment.source_family = 'market_listing'
   and assignment.source_table = 'market_listing_card_candidates'
   and assignment.source_row_id = candidate.id
   and assignment.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
   and assignment.variant_assignment_status = 'exact_child_finish'
   and assignment.card_printing_id is not null
  join public.market_listing_observations observation
    on observation.id = candidate.observation_id
  where observation.currency = 'USD'
    and observation.total_ask_price > 0
    and observation.observed_at >= now() - interval '72 hours'
    and coalesce(
      candidate.condition_features -> 'slab_features' ->> 'is_slab',
      'false'
    ) <> 'true'
)
select
  card_print_id,
  card_printing_id,
  printing_gv_id,
  finish_key,
  'USD'::text as currency,
  round(min(total_ask_price)::numeric, 2) as lowest_active_ask,
  round(
    (percentile_cont(0.5) within group (order by total_ask_price))::numeric,
    2
  ) as median_active_ask,
  count(*)::integer as listing_count,
  count(distinct seller_key)::integer as seller_count,
  max(observed_at) as observed_at
from exact_listings
group by card_print_id, card_printing_id, printing_gv_id, finish_key;

comment on view public.v_market_listing_variant_active_ask_exact_v1 is
  'Exact-printing USD active asks normalized to currency precision. Internal evidence only; not completed sales or market value.';

commit;
