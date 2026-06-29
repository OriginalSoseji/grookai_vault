-- MEE-PUBLIC-PRICING-BRIDGE-REFERENCE-ANCHORED-V1 view candidate.
--
-- Candidate only. Do not apply remotely without explicit approval.
--
-- Goal:
-- - Grookai Value is evidence-anchored.
-- - Reference valuation evidence is the current primary anchor until stronger
--   verified transaction evidence exists.
-- - eBay active listings are Available Today / active ask pressure, not market
--   truth and not Grookai Value by themselves.
-- - Raw and slab lanes remain separated.
-- - JustTCG is not used as public pricing.

create or replace view public.v_market_evidence_public_pricing_bridge_reference_anchored_v1
with (security_invoker = true)
as
with latest_reference_rollups as (
  select distinct on (card_print_id)
    id as reference_rollup_id,
    card_print_id,
    gv_id,
    rollup_version as reference_rollup_version,
    rollup_lane as reference_rollup_lane,
    review_status as reference_review_status,
    currency as reference_currency,
    reference_low::numeric(12,2) as reference_low,
    reference_median::numeric(12,2) as reference_median,
    reference_high::numeric(12,2) as reference_high,
    source_count as reference_source_count,
    eligible_evidence_count as reference_eligible_evidence_count,
    quarantined_evidence_count as reference_quarantined_evidence_count,
    currency_excluded_evidence_count as reference_currency_excluded_evidence_count,
    price_ratio as reference_price_ratio,
    variance_band as reference_variance_band,
    review_flags as reference_review_flags,
    source_summary as reference_source_summary,
    updated_at as reference_updated_at,
    created_at as reference_created_at
  from public.market_reference_signal_rollups
  where currency = 'USD'
    and reference_median is not null
    and publishable = false
    and app_visible = false
    and market_truth = false
  order by card_print_id, updated_at desc nulls last, created_at desc
), latest_listing_rollups as (
  select distinct on (card_print_id, active_lane)
    id as active_listing_rollup_id,
    card_print_id,
    gv_id,
    case
      when rollup_version ilike '%SLAB%' then 'slab'
      when rollup_version ilike '%RAW_SINGLE%' then 'raw_single'
      else 'unknown'
    end as active_lane,
    source as active_listing_source,
    rollup_version as active_listing_rollup_version,
    rollup_window as active_listing_rollup_window,
    listing_count as active_listing_count,
    seller_count as active_seller_count,
    median_active_ask::numeric(12,2) as active_ask_mid,
    trimmed_low_active_ask::numeric(12,2) as active_ask_low,
    trimmed_high_active_ask::numeric(12,2) as active_ask_high,
    minimum_active_ask::numeric(12,2) as active_ask_minimum,
    maximum_active_ask::numeric(12,2) as active_ask_maximum,
    currency as active_ask_currency,
    stale_listing_count as active_stale_listing_count,
    reviewed_candidate_count as active_reviewed_candidate_count,
    generated_at as active_ask_generated_at,
    created_at as active_ask_created_at
  from (
    select
      *,
      case
        when rollup_version ilike '%SLAB%' then 'slab'
        when rollup_version ilike '%RAW_SINGLE%' then 'raw_single'
        else 'unknown'
      end as active_lane
    from public.market_listing_rollups
    where currency = 'USD'
      and median_active_ask is not null
      and publishable = false
      and app_visible = false
      and market_truth = false
  ) listing
  order by
    card_print_id,
    active_lane,
    generated_at desc nulls last,
    created_at desc
), raw_active as (
  select *
  from latest_listing_rollups
  where active_lane = 'raw_single'
), slab_active as (
  select *
  from latest_listing_rollups
  where active_lane = 'slab'
), universe as (
  select card_print_id from latest_reference_rollups
  union
  select card_print_id from raw_active
  union
  select card_print_id from slab_active
), joined as (
  select
    universe.card_print_id,
    coalesce(reference.gv_id, raw.gv_id, slab.gv_id) as gv_id,
    reference.reference_rollup_id,
    reference.reference_rollup_version,
    reference.reference_rollup_lane,
    reference.reference_review_status,
    reference.reference_currency,
    reference.reference_low,
    reference.reference_median,
    reference.reference_high,
    reference.reference_source_count,
    reference.reference_eligible_evidence_count,
    reference.reference_quarantined_evidence_count,
    reference.reference_currency_excluded_evidence_count,
    reference.reference_price_ratio,
    reference.reference_variance_band,
    reference.reference_review_flags,
    reference.reference_source_summary,
    reference.reference_updated_at,
    raw.active_listing_rollup_id as raw_active_listing_rollup_id,
    raw.active_listing_source as raw_active_listing_source,
    raw.active_listing_rollup_version as raw_active_listing_rollup_version,
    raw.active_listing_count as raw_active_listing_count,
    raw.active_seller_count as raw_active_seller_count,
    raw.active_ask_low as raw_active_ask_low,
    raw.active_ask_mid as raw_active_ask_mid,
    raw.active_ask_high as raw_active_ask_high,
    raw.active_ask_minimum as raw_active_ask_minimum,
    raw.active_ask_maximum as raw_active_ask_maximum,
    raw.active_ask_generated_at as raw_active_ask_generated_at,
    raw.active_stale_listing_count as raw_active_stale_listing_count,
    slab.active_listing_rollup_id as slab_active_listing_rollup_id,
    slab.active_listing_count as slab_active_listing_count,
    slab.active_seller_count as slab_active_seller_count,
    slab.active_ask_mid as slab_active_ask_mid,
    slab.active_ask_generated_at as slab_active_ask_generated_at
  from universe
  left join latest_reference_rollups reference
    on reference.card_print_id = universe.card_print_id
  left join raw_active raw
    on raw.card_print_id = universe.card_print_id
  left join slab_active slab
    on slab.card_print_id = universe.card_print_id
), scored as (
  select
    *,
    case
      when reference_median is not null and raw_active_ask_mid is not null and reference_median > 0
        then round(((raw_active_ask_mid - reference_median) / reference_median) * 100.0, 2)
      else null::numeric
    end as market_pressure_pct,
    case
      when reference_median is null and raw_active_ask_mid is not null then 'active_listing_only_no_reference_anchor'
      when reference_median is not null and raw_active_ask_mid is null then 'reference_only_no_active_ask'
      when reference_median is null and raw_active_ask_mid is null then 'insufficient_evidence'
      when abs(((raw_active_ask_mid - reference_median) / nullif(reference_median, 0)) * 100.0) <= 10 then 'active_listings_aligned_with_reference'
      when raw_active_ask_mid > reference_median then 'active_listings_above_reference'
      else 'active_listings_below_reference'
    end as market_pressure_status,
    case
      when raw_active_listing_rollup_id is not null and slab_active_listing_rollup_id is not null then 'raw_and_slab_available_separated'
      when raw_active_listing_rollup_id is not null then 'raw_single_only'
      when slab_active_listing_rollup_id is not null then 'slab_only'
      else 'no_active_listing_lane'
    end as lane_policy,
    case
      when reference_median is null then 'blocked_no_valuation_anchor'
      when reference_review_status is distinct from 'review_ready_multi_source' then 'blocked_reference_requires_review'
      when reference_currency <> 'USD' then 'blocked_non_usd_reference'
      when reference_source_count < 1 then 'blocked_no_reference_source'
      when reference_median <= 0 then 'blocked_invalid_reference_median'
      else null::text
    end as grookai_value_block_reason,
    case
      when reference_median is null then null::numeric
      when raw_active_ask_mid is null then reference_median
      when abs(((raw_active_ask_mid - reference_median) / nullif(reference_median, 0)) * 100.0) <= 10
        then round((reference_median * 0.75) + (raw_active_ask_mid * 0.25), 2)
      when abs(((raw_active_ask_mid - reference_median) / nullif(reference_median, 0)) * 100.0) <= 50
        then round(reference_median + ((raw_active_ask_mid - reference_median) * 0.20), 2)
      else round(reference_median + ((raw_active_ask_mid - reference_median) * 0.10), 2)
    end as controlled_grookai_value_mid
  from joined
)
select
  card_print_id,
  gv_id,
  'USD'::text as currency,
  reference_rollup_id,
  reference_rollup_version,
  reference_review_status,
  reference_low as reference_anchor_low,
  reference_median as reference_anchor_mid,
  reference_high as reference_anchor_high,
  reference_source_count,
  reference_eligible_evidence_count,
  reference_review_flags,
  reference_source_summary,
  case
    when grookai_value_block_reason is not null then null::numeric(12,2)
    else least(coalesce(reference_low, controlled_grookai_value_mid), controlled_grookai_value_mid)::numeric(12,2)
  end as grookai_value_low,
  case
    when grookai_value_block_reason is not null then null::numeric(12,2)
    else controlled_grookai_value_mid::numeric(12,2)
  end as grookai_value_mid,
  case
    when grookai_value_block_reason is not null then null::numeric(12,2)
    else greatest(coalesce(reference_high, controlled_grookai_value_mid), controlled_grookai_value_mid)::numeric(12,2)
  end as grookai_value_high,
  case
    when grookai_value_block_reason is not null then 'unavailable_blocked'
    when raw_active_ask_mid is null then 'reference_anchor_only'
    when market_pressure_status = 'active_listings_aligned_with_reference' then 'reference_anchor_with_aligned_active_pressure'
    else 'reference_anchor_with_bounded_active_pressure'
  end as grookai_value_basis,
  grookai_value_block_reason,
  raw_active_listing_rollup_id,
  raw_active_listing_source,
  raw_active_listing_rollup_version,
  raw_active_ask_low as active_ask_low,
  raw_active_ask_mid as active_ask_mid,
  raw_active_ask_high as active_ask_high,
  raw_active_ask_minimum,
  raw_active_ask_maximum,
  raw_active_listing_count as active_ask_listing_count,
  raw_active_seller_count as active_ask_seller_count,
  raw_active_ask_generated_at as active_ask_signal_at,
  raw_active_stale_listing_count as active_ask_stale_listing_count,
  slab_active_listing_rollup_id,
  slab_active_listing_count,
  slab_active_seller_count,
  slab_active_ask_mid,
  market_pressure_pct,
  market_pressure_status,
  lane_policy,
  'condition_unknown_reference_range'::text as condition_policy,
  'unknown'::text as grookai_value_condition_label,
  'raw_single_active_ask'::text as active_ask_condition_label,
  case
    when grookai_value_block_reason is not null and raw_active_ask_mid is not null then 'limited_active_listing_only'
    when reference_source_count >= 2
      and raw_active_listing_count >= 50
      and raw_active_seller_count >= 12
      and abs(coalesce(market_pressure_pct, 0)) <= 15 then 'high'
    when reference_source_count >= 1 and (raw_active_listing_count is null or raw_active_listing_count >= 10) then 'medium'
    else 'limited'
  end as confidence_label,
  case
    when raw_active_ask_generated_at is null then 'no_active_ask'
    when raw_active_ask_generated_at >= now() - interval '3 days' then 'fresh'
    when raw_active_ask_generated_at >= now() - interval '14 days' then 'aging'
    else 'stale'
  end as freshness_label,
  true as signed_in_only,
  false as market_truth,
  false as sold_comp,
  raw_active_ask_mid is not null as active_listing_evidence,
  false as publishable,
  false as app_visible
from scored;

revoke all on public.v_market_evidence_public_pricing_bridge_reference_anchored_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_public_pricing_bridge_reference_anchored_v1 to authenticated, service_role;
