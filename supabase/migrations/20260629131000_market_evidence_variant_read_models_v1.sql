-- MARKET_EVIDENCE_VARIANT_READ_MODELS_V1
-- Internal variant-aware read models for market evidence and acquisition targeting.
-- Boundary: no public pricing view replacement and no app-visible pricing.

begin;

create or replace view public.v_market_reference_variant_signal_rollups_v1 as
with eligible_reference as (
  select
    assignment.card_print_id,
    assignment.gv_id,
    assignment.card_printing_id,
    assignment.printing_gv_id,
    assignment.assigned_finish_key,
    evidence.source,
    evidence.metric_key,
    evidence.metric_family,
    evidence.normalized_price::numeric as normalized_price,
    evidence.normalized_currency,
    evidence.model_eligible,
    evidence.quality_flags,
    evidence.normalized_payload
  from public.market_reference_normalized_evidence evidence
  join public.market_evidence_variant_assignments assignment
    on assignment.source_family = 'market_reference'
   and assignment.source_table = 'market_reference_candidates'
   and assignment.source_row_id = evidence.candidate_id
   and assignment.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
  where assignment.variant_assignment_status = 'exact_child_finish'
    and assignment.card_printing_id is not null
    and evidence.model_eligible = true
    and evidence.normalized_currency = 'USD'
),
source_counts as (
  select
    card_print_id,
    card_printing_id,
    source,
    count(*)::integer as source_count
  from eligible_reference
  group by card_print_id, card_printing_id, source
)
select
  eligible_reference.card_print_id,
  eligible_reference.gv_id,
  eligible_reference.card_printing_id,
  eligible_reference.printing_gv_id,
  eligible_reference.assigned_finish_key,
  'market_reference_variant_signal'::text as rollup_lane,
  'MEE_VARIANT_REFERENCE_SIGNAL_READ_MODEL_V1'::text as rollup_version,
  'USD'::text as currency,
  round((percentile_cont(0.1) within group (order by eligible_reference.normalized_price))::numeric, 2) as reference_low,
  round((percentile_cont(0.5) within group (order by eligible_reference.normalized_price))::numeric, 2) as reference_median,
  round((percentile_cont(0.9) within group (order by eligible_reference.normalized_price))::numeric, 2) as reference_high,
  count(distinct eligible_reference.source)::integer as source_count,
  count(*)::integer as eligible_evidence_count,
  (
    select jsonb_object_agg(source_counts.source, source_counts.source_count)
    from source_counts
    where source_counts.card_print_id = eligible_reference.card_print_id
      and source_counts.card_printing_id = eligible_reference.card_printing_id
  ) as source_summary,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from eligible_reference
group by
  eligible_reference.card_print_id,
  eligible_reference.gv_id,
  eligible_reference.card_printing_id,
  eligible_reference.printing_gv_id,
  eligible_reference.assigned_finish_key;

create or replace view public.v_market_listing_variant_active_ask_rollups_v1 as
with eligible_listing as (
  select
    assignment.card_print_id,
    assignment.gv_id,
    assignment.card_printing_id,
    assignment.printing_gv_id,
    assignment.assigned_finish_key,
    candidate.source,
    candidate.source_listing_id,
    candidate.condition_features -> 'slab_features' ->> 'is_slab' as is_slab_text,
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
  join public.market_listing_observations observation
    on observation.id = candidate.observation_id
  where assignment.variant_assignment_status in ('exact_child_finish', 'single_child_inferred')
    and assignment.card_printing_id is not null
    and observation.currency = 'USD'
    and observation.total_ask_price is not null
),
lane_prices as (
  select
    eligible_listing.*,
    case when eligible_listing.is_slab_text = 'true' then 'slab' else 'raw_single' end as evidence_lane
  from eligible_listing
)
select
  lane_prices.card_print_id,
  lane_prices.gv_id,
  lane_prices.card_printing_id,
  lane_prices.printing_gv_id,
  lane_prices.assigned_finish_key,
  lane_prices.evidence_lane,
  'MEE_VARIANT_ACTIVE_ASK_READ_MODEL_V1'::text as rollup_version,
  'USD'::text as currency,
  count(*)::integer as listing_count,
  count(distinct lane_prices.seller_key)::integer as seller_count,
  round((percentile_cont(0.1) within group (order by lane_prices.total_ask_price))::numeric, 2) as active_ask_low,
  round((percentile_cont(0.5) within group (order by lane_prices.total_ask_price))::numeric, 2) as active_ask_median,
  round((percentile_cont(0.9) within group (order by lane_prices.total_ask_price))::numeric, 2) as active_ask_high,
  min(lane_prices.total_ask_price)::numeric as minimum_active_ask,
  max(lane_prices.total_ask_price)::numeric as maximum_active_ask,
  max(lane_prices.observed_at) as active_ask_signal_at,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from lane_prices
group by
  lane_prices.card_print_id,
  lane_prices.gv_id,
  lane_prices.card_printing_id,
  lane_prices.printing_gv_id,
  lane_prices.assigned_finish_key,
  lane_prices.evidence_lane;

create or replace view public.v_market_listing_variant_query_targets_v1 as
select
  parent.id as card_print_id,
  parent.gv_id,
  child.id as card_printing_id,
  child.printing_gv_id,
  child.finish_key,
  parent.name,
  parent.set_code,
  sets.name as set_name,
  parent.number,
  parent.number_plain,
  parent.rarity,
  finish_alias.ebay_finish_phrase,
  concat_ws(
    ' ',
    'Pokemon',
    '"' || replace(parent.name, '"', '') || '"',
    case when sets.name is not null then '"' || replace(sets.name, '"', '') || '"' else null end,
    case when parent.number_plain is not null then '"' || parent.number_plain || '"' else null end,
    case when finish_alias.ebay_finish_phrase is not null then '"' || finish_alias.ebay_finish_phrase || '"' else null end
  ) as ebay_query_text,
  case
    when child.finish_key in ('cracked_ice', 'cosmos', 'pokeball', 'masterball', 'rocket_reverse') then 'priority_variant_special_finish'
    when child.finish_key in ('reverse', 'holo') then 'priority_variant_finish'
    else 'variant_finish'
  end as acquisition_priority,
  false as source_fetch_allowed_by_this_view,
  false as can_publish_price_directly,
  false as app_visible,
  false as market_truth
from public.card_printings child
join public.card_prints parent
  on parent.id = child.card_print_id
left join public.sets
  on sets.id = parent.set_id
cross join lateral (
  select ebay_finish_phrase
  from (
    values
      ('reverse', 'reverse holo'),
      ('reverse', 'reverse holofoil'),
      ('cracked_ice', 'cracked ice holo'),
      ('cracked_ice', 'cosmos holo'),
      ('cosmos', 'cosmos holo'),
      ('cosmos', 'crosshatch holo'),
      ('pokeball', 'poke ball reverse holo'),
      ('pokeball', 'pokeball reverse holo'),
      ('masterball', 'master ball reverse holo'),
      ('masterball', 'masterball reverse holo'),
      ('rocket_reverse', 'rocket reverse holo'),
      ('holo', 'holo'),
      ('holo', 'holofoil'),
      ('normal', null),
      ('other', replace(child.finish_key, '_', ' '))
  ) as aliases(finish_key, ebay_finish_phrase)
  where aliases.finish_key = child.finish_key
     or (aliases.finish_key = 'other' and child.finish_key not in (
       'reverse',
       'cracked_ice',
       'cosmos',
       'pokeball',
       'masterball',
       'rocket_reverse',
       'holo',
       'normal'
     ))
) finish_alias;

revoke all on public.v_market_reference_variant_signal_rollups_v1 from public, anon, authenticated;
grant select on public.v_market_reference_variant_signal_rollups_v1 to service_role;

revoke all on public.v_market_listing_variant_active_ask_rollups_v1 from public, anon, authenticated;
grant select on public.v_market_listing_variant_active_ask_rollups_v1 to service_role;

revoke all on public.v_market_listing_variant_query_targets_v1 from public, anon, authenticated;
grant select on public.v_market_listing_variant_query_targets_v1 to service_role;

commit;
