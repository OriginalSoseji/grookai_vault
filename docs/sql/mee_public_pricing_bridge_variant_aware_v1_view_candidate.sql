-- MEE-PUBLIC-PRICING-BRIDGE-VARIANT-AWARE-V1 view candidate.
--
-- Goal:
-- - Keep the existing parent-level reference anchored bridge stable.
-- - Add a card-detail read surface that can return parent pricing plus
--   card_printings-level pricing lanes.
-- - Preserve the product boundary: Grookai Value is evidence anchored;
--   active eBay asks remain Available Today pressure only.

create or replace view public.v_market_evidence_public_pricing_bridge_variant_aware_v1
with (security_invoker = true)
as
with parent_rows as (
  select
    'parent'::text as pricing_scope,
    bridge.card_print_id,
    null::uuid as card_printing_id,
    null::text as printing_gv_id,
    null::text as assigned_finish_key,
    bridge.gv_id,
    bridge.currency,
    bridge.reference_rollup_id,
    bridge.reference_rollup_version,
    bridge.reference_review_status,
    bridge.reference_anchor_low,
    bridge.reference_anchor_mid,
    bridge.reference_anchor_high,
    bridge.reference_source_count,
    bridge.reference_eligible_evidence_count,
    bridge.reference_review_flags,
    bridge.reference_source_summary,
    bridge.grookai_value_low,
    bridge.grookai_value_mid,
    bridge.grookai_value_high,
    bridge.grookai_value_basis,
    bridge.grookai_value_block_reason,
    bridge.raw_active_listing_rollup_id,
    bridge.raw_active_listing_source,
    bridge.raw_active_listing_rollup_version,
    bridge.active_ask_low,
    bridge.active_ask_mid,
    bridge.active_ask_high,
    bridge.raw_active_ask_minimum,
    bridge.raw_active_ask_maximum,
    bridge.active_ask_listing_count,
    bridge.active_ask_seller_count,
    bridge.active_ask_signal_at,
    bridge.active_ask_stale_listing_count,
    bridge.slab_active_listing_rollup_id,
    bridge.slab_active_listing_count,
    bridge.slab_active_seller_count,
    bridge.slab_active_ask_mid,
    bridge.market_pressure_pct,
    bridge.market_pressure_status,
    bridge.lane_policy,
    bridge.condition_policy,
    bridge.grookai_value_condition_label,
    bridge.active_ask_condition_label,
    bridge.confidence_label,
    bridge.freshness_label,
    bridge.signed_in_only,
    bridge.market_truth,
    bridge.sold_comp,
    bridge.active_listing_evidence,
    bridge.publishable,
    bridge.app_visible
  from public.v_market_evidence_public_pricing_bridge_reference_anchored_v1 bridge
), variant_reference as (
  select
    reference.card_print_id,
    reference.gv_id,
    reference.card_printing_id,
    reference.printing_gv_id,
    reference.assigned_finish_key,
    reference.rollup_version as reference_rollup_version,
    reference.currency as reference_currency,
    reference.reference_low,
    reference.reference_median,
    reference.reference_high,
    reference.source_count as reference_source_count,
    reference.eligible_evidence_count as reference_eligible_evidence_count,
    reference.source_summary as reference_source_summary
  from public.v_market_reference_variant_signal_rollups_v1 reference
  where reference.currency = 'USD'
    and reference.reference_median is not null
    and reference.publishable = false
    and reference.app_visible = false
    and reference.market_truth = false
), variant_active as (
  select
    active.card_print_id,
    active.gv_id,
    active.card_printing_id,
    active.printing_gv_id,
    active.assigned_finish_key,
    active.evidence_lane,
    active.rollup_version as active_listing_rollup_version,
    active.listing_count as active_listing_count,
    active.seller_count as active_seller_count,
    active.active_ask_low,
    active.active_ask_median as active_ask_mid,
    active.active_ask_high,
    active.minimum_active_ask as active_ask_minimum,
    active.maximum_active_ask as active_ask_maximum,
    active.active_ask_signal_at
  from public.v_market_listing_variant_active_ask_rollups_v1 active
  where active.currency = 'USD'
    and active.active_ask_median is not null
    and active.publishable = false
    and active.app_visible = false
    and active.market_truth = false
), raw_variant_active as (
  select *
  from variant_active
  where evidence_lane = 'raw_single'
), slab_variant_active as (
  select *
  from variant_active
  where evidence_lane = 'slab'
), variant_universe as (
  select card_print_id, card_printing_id from variant_reference
  union
  select card_print_id, card_printing_id from raw_variant_active
  union
  select card_print_id, card_printing_id from slab_variant_active
), variant_joined as (
  select
    universe.card_print_id,
    universe.card_printing_id,
    coalesce(reference.gv_id, raw.gv_id, slab.gv_id) as gv_id,
    coalesce(reference.printing_gv_id, raw.printing_gv_id, slab.printing_gv_id) as printing_gv_id,
    coalesce(reference.assigned_finish_key, raw.assigned_finish_key, slab.assigned_finish_key) as assigned_finish_key,
    reference.reference_rollup_version,
    reference.reference_currency,
    reference.reference_low,
    reference.reference_median,
    reference.reference_high,
    reference.reference_source_count,
    reference.reference_eligible_evidence_count,
    reference.reference_source_summary,
    raw.active_listing_rollup_version as raw_active_listing_rollup_version,
    raw.active_listing_count as raw_active_listing_count,
    raw.active_seller_count as raw_active_seller_count,
    raw.active_ask_low as raw_active_ask_low,
    raw.active_ask_mid as raw_active_ask_mid,
    raw.active_ask_high as raw_active_ask_high,
    raw.active_ask_minimum as raw_active_ask_minimum,
    raw.active_ask_maximum as raw_active_ask_maximum,
    raw.active_ask_signal_at as raw_active_ask_signal_at,
    slab.active_listing_rollup_version as slab_active_listing_rollup_version,
    slab.active_listing_count as slab_active_listing_count,
    slab.active_seller_count as slab_active_seller_count,
    slab.active_ask_mid as slab_active_ask_mid,
    slab.active_ask_signal_at as slab_active_ask_signal_at
  from variant_universe universe
  left join variant_reference reference
    on reference.card_print_id = universe.card_print_id
   and reference.card_printing_id = universe.card_printing_id
  left join raw_variant_active raw
    on raw.card_print_id = universe.card_print_id
   and raw.card_printing_id = universe.card_printing_id
  left join slab_variant_active slab
    on slab.card_print_id = universe.card_print_id
   and slab.card_printing_id = universe.card_printing_id
), variant_scored as (
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
      when raw_active_listing_rollup_version is not null and slab_active_listing_rollup_version is not null then 'raw_and_slab_available_separated'
      when raw_active_listing_rollup_version is not null then 'raw_single_only'
      when slab_active_listing_rollup_version is not null then 'slab_only'
      else 'no_active_listing_lane'
    end as lane_policy,
    case
      when reference_median is null then 'blocked_no_valuation_anchor'
      when reference_rollup_version is not null then 'blocked_reference_requires_review'
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
  from variant_joined
), variant_rows as (
  select
    'card_printing'::text as pricing_scope,
    card_print_id,
    card_printing_id,
    printing_gv_id,
    assigned_finish_key,
    gv_id,
    'USD'::text as currency,
    null::uuid as reference_rollup_id,
    reference_rollup_version,
    'variant_read_model_review'::text as reference_review_status,
    reference_low::numeric(12,2) as reference_anchor_low,
    reference_median::numeric(12,2) as reference_anchor_mid,
    reference_high::numeric(12,2) as reference_anchor_high,
    reference_source_count,
    reference_eligible_evidence_count,
    array['variant_level_reference']::text[] as reference_review_flags,
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
      when raw_active_ask_mid is null then 'variant_reference_anchor_only'
      when market_pressure_status = 'active_listings_aligned_with_reference' then 'variant_reference_anchor_with_aligned_active_pressure'
      else 'variant_reference_anchor_with_bounded_active_pressure'
    end as grookai_value_basis,
    grookai_value_block_reason,
    null::uuid as raw_active_listing_rollup_id,
    'ebay_active_variant_read_model'::text as raw_active_listing_source,
    raw_active_listing_rollup_version,
    raw_active_ask_low::numeric(12,2) as active_ask_low,
    raw_active_ask_mid::numeric(12,2) as active_ask_mid,
    raw_active_ask_high::numeric(12,2) as active_ask_high,
    raw_active_ask_minimum::numeric(12,2) as raw_active_ask_minimum,
    raw_active_ask_maximum::numeric(12,2) as raw_active_ask_maximum,
    raw_active_listing_count as active_ask_listing_count,
    raw_active_seller_count as active_ask_seller_count,
    raw_active_ask_signal_at as active_ask_signal_at,
    null::integer as active_ask_stale_listing_count,
    null::uuid as slab_active_listing_rollup_id,
    slab_active_listing_count,
    slab_active_seller_count,
    slab_active_ask_mid::numeric(12,2) as slab_active_ask_mid,
    market_pressure_pct,
    market_pressure_status,
    lane_policy,
    'variant_condition_unknown_reference_range'::text as condition_policy,
    'unknown'::text as grookai_value_condition_label,
    'raw_single_variant_active_ask'::text as active_ask_condition_label,
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
      when raw_active_ask_signal_at is null then 'no_active_ask'
      when raw_active_ask_signal_at >= now() - interval '3 days' then 'fresh'
      when raw_active_ask_signal_at >= now() - interval '14 days' then 'aging'
      else 'stale'
    end as freshness_label,
    true as signed_in_only,
    false as market_truth,
    false as sold_comp,
    raw_active_ask_mid is not null as active_listing_evidence,
    false as publishable,
    false as app_visible
  from variant_scored
)
select * from parent_rows
union all
select * from variant_rows;

revoke all on public.v_market_evidence_public_pricing_bridge_variant_aware_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_public_pricing_bridge_variant_aware_v1 to authenticated, service_role;
