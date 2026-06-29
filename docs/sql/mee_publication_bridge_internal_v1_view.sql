-- MEE-PUBLICATION-BRIDGE-INTERNAL-V1
-- Internal-only bridge from reviewed MEE publication gate rows to candidate pricing handoff rows.
-- This view does not publish pricing. It keeps every public boundary flag false.

create or replace view public.v_market_evidence_publication_bridge_candidates_v1
with (security_invoker = true)
as
with latest_listing_rollups as (
  select distinct on (card_print_id, evidence_lane)
    id as listing_rollup_id,
    card_print_id,
    gv_id,
    case
      when rollup_version ilike '%SLAB%' then 'slab'
      when rollup_version ilike '%RAW_SINGLE%' then 'raw_single'
      else 'unknown'
    end as evidence_lane,
    source as listing_source,
    rollup_version as listing_rollup_version,
    rollup_window,
    listing_count,
    seller_count,
    median_active_ask,
    trimmed_low_active_ask,
    trimmed_high_active_ask,
    minimum_active_ask,
    maximum_active_ask,
    currency,
    stale_listing_count,
    reviewed_candidate_count,
    generated_at
  from public.market_listing_rollups
  where publishable = false
    and app_visible = false
    and market_truth = false
    and median_active_ask is not null
  order by
    card_print_id,
    case
      when rollup_version ilike '%SLAB%' then 'slab'
      when rollup_version ilike '%RAW_SINGLE%' then 'raw_single'
      else 'unknown'
    end,
    generated_at desc nulls last,
    created_at desc
), latest_reference_rollups as (
  select distinct on (card_print_id)
    id as reference_rollup_id,
    card_print_id,
    gv_id,
    rollup_version as reference_rollup_version,
    rollup_lane,
    review_status as reference_review_status,
    currency as reference_currency,
    reference_low,
    reference_median,
    reference_high,
    source_count as reference_source_count,
    eligible_evidence_count as reference_eligible_evidence_count,
    review_flags as reference_review_flags,
    updated_at as reference_updated_at
  from public.market_reference_signal_rollups
  where publishable = false
    and app_visible = false
    and market_truth = false
  order by card_print_id, updated_at desc nulls last, created_at desc
), bridge as (
  select
    gate.disposition_id,
    gate.card_print_id,
    gate.gv_id,
    gate.review_lane,
    gate.evidence_lane,
    gate.review_status,
    gate.review_disposition,
    gate.dashboard_queue,
    gate.gate_decision,
    gate.would_be_publication_candidate,
    gate.identity_or_boundary_assignment_blockers,
    gate.lifecycle_public_boundary_leaks,
    gate.quality_public_boundary_leaks,
    gate.quality_blocker_rows,
    gate.quality_rollup_eligible_rows,
    gate.rollup_raw_single_events,
    gate.rollup_slab_events,
    gate.rollup_reference_events,
    gate.latest_rollup_eligible_at,
    listing.listing_rollup_id,
    listing.listing_source,
    listing.listing_rollup_version,
    listing.rollup_window,
    listing.listing_count,
    listing.seller_count,
    listing.median_active_ask,
    listing.trimmed_low_active_ask,
    listing.trimmed_high_active_ask,
    listing.minimum_active_ask,
    listing.maximum_active_ask,
    listing.currency,
    listing.stale_listing_count,
    listing.reviewed_candidate_count,
    listing.generated_at as listing_rollup_generated_at,
    reference.reference_rollup_id,
    reference.reference_rollup_version,
    reference.rollup_lane as reference_rollup_lane,
    reference.reference_review_status,
    reference.reference_currency,
    reference.reference_low,
    reference.reference_median,
    reference.reference_high,
    reference.reference_source_count,
    reference.reference_eligible_evidence_count,
    reference.reference_review_flags,
    reference.reference_updated_at,
    case
      when gate.gate_decision <> 'internal_publication_candidate' then 'blocked_by_publication_gate'
      when gate.review_status <> 'resolved' then 'blocked_review_not_resolved'
      when gate.review_disposition <> 'review_confirmed_internal_candidate' then 'blocked_review_not_confirmed'
      when gate.evidence_lane not in ('raw_single', 'slab') then 'blocked_non_price_lane'
      when gate.identity_or_boundary_assignment_blockers > 0 then 'blocked_assignment'
      when gate.lifecycle_public_boundary_leaks > 0 or gate.quality_public_boundary_leaks > 0 then 'blocked_public_boundary'
      when gate.quality_blocker_rows > 0 then 'blocked_quality'
      when listing.listing_rollup_id is null then 'blocked_missing_listing_rollup'
      when listing.listing_count < case when gate.evidence_lane = 'slab' then 3 else 5 end then 'blocked_low_listing_count'
      when listing.seller_count < case when gate.evidence_lane = 'slab' then 2 else 3 end then 'blocked_low_seller_count'
      when listing.stale_listing_count > listing.listing_count / 2 then 'blocked_stale_listing_mix'
      else 'ready_internal_bridge_candidate'
    end as bridge_state
  from public.v_market_evidence_publication_gate_candidates_v1 gate
  left join latest_listing_rollups listing
    on listing.card_print_id = gate.card_print_id
   and listing.evidence_lane = gate.evidence_lane
  left join latest_reference_rollups reference
    on reference.card_print_id = gate.card_print_id
)
select
  *,
  bridge_state = 'ready_internal_bridge_candidate' as internal_bridge_candidate,
  median_active_ask as candidate_primary_price,
  'ebay_active_internal_rollup'::text as candidate_primary_source,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth,
  true as internal_only
from bridge;

revoke all on public.v_market_evidence_publication_bridge_candidates_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_publication_bridge_candidates_v1 to service_role;

