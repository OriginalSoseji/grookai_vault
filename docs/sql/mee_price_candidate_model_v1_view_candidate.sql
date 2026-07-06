-- MEE-PRICE-CANDIDATE-MODEL-V1 local SQL/view candidate.
-- Internal-only price candidate evaluator.
-- Do not apply remotely without a separate targeted schema approval.
-- This view does not publish pricing and does not create market truth.

create or replace view public.v_market_evidence_price_candidates_v1
with (security_invoker = true)
as
with latest_active_rollups as (
  select
    r.*,
    coalesce(r.rollup_payload->>'evidence_class', 'unknown') as evidence_lane,
    row_number() over (
      partition by r.card_print_id, coalesce(r.rollup_payload->>'evidence_class', 'unknown')
      order by r.generated_at desc, r.created_at desc, r.id desc
    ) as rn
  from public.market_listing_rollups r
  where r.source = 'ebay_active'
    and r.rollup_window in ('manual', 'daily')
    and coalesce(r.rollup_payload->>'strict_title_filtered', 'false') = 'true'
    and coalesce(r.rollup_payload->>'evidence_class', 'unknown') in ('raw_single', 'slab')
    and r.needs_review = true
    and r.publishable = false
    and r.app_visible = false
    and r.market_truth = false
), active_candidates as (
  select
    r.card_print_id,
    r.gv_id,
    r.source,
    'active_listing'::text as source_type,
    r.evidence_lane,
    r.rollup_version,
    r.id as source_rollup_id,
    r.currency,
    r.median_active_ask as candidate_median,
    r.trimmed_low_active_ask as candidate_low,
    r.trimmed_high_active_ask as candidate_high,
    r.minimum_active_ask,
    r.maximum_active_ask,
    r.listing_count as evidence_count,
    r.seller_count,
    null::integer as source_count,
    r.generated_at as signal_at,
    case
      when r.evidence_lane = 'raw_single'
       and r.listing_count >= 5
       and r.seller_count >= 3
       and r.median_active_ask is not null
       and coalesce(r.rollup_payload->>'review_bucket', '') = 'strict_filtered_review_ready_internal_candidate'
        then 'high_confidence'
      when r.evidence_lane = 'slab'
       and r.listing_count >= 3
       and r.seller_count >= 2
       and r.median_active_ask is not null
       and coalesce(r.rollup_payload->>'review_bucket', '') = 'strict_filtered_review_ready_internal_candidate'
        then 'high_confidence'
      when r.listing_count > 0 and r.median_active_ask is not null then 'medium_confidence'
      else 'low_confidence'
    end as confidence_tier,
    case
      when r.median_active_ask is null then 'blocked_no_price'
      when r.evidence_lane = 'raw_single' and (r.listing_count < 5 or r.seller_count < 3) then 'needs_more_evidence'
      when r.evidence_lane = 'slab' and (r.listing_count < 3 or r.seller_count < 2) then 'needs_more_evidence'
      when coalesce(r.rollup_payload->>'review_bucket', '') <> 'strict_filtered_review_ready_internal_candidate' then 'needs_review'
      else 'internal_candidate'
    end as candidate_status,
    r.rollup_payload as candidate_payload
  from latest_active_rollups r
  where r.rn = 1
), latest_reference_rollups as (
  select
    r.*,
    row_number() over (
      partition by r.card_print_id
      order by r.created_at desc, r.updated_at desc, r.id desc
    ) as rn
  from public.market_reference_signal_rollups r
  where r.rollup_lane = 'internal_reference_signal'
    and r.currency = 'USD'
    and r.needs_review = true
    and r.publishable = false
    and r.app_visible = false
    and r.market_truth = false
), reference_candidates as (
  select
    r.card_print_id,
    r.gv_id,
    'free_reference_apis'::text as source,
    'reference'::text as source_type,
    'reference'::text as evidence_lane,
    r.rollup_version,
    r.id as source_rollup_id,
    r.currency,
    r.reference_median as candidate_median,
    r.reference_low as candidate_low,
    r.reference_high as candidate_high,
    null::numeric as minimum_active_ask,
    null::numeric as maximum_active_ask,
    r.eligible_evidence_count as evidence_count,
    null::integer as seller_count,
    r.source_count,
    r.created_at as signal_at,
    case
      when r.review_status = 'review_ready_multi_source'
       and r.source_count >= 2
       and r.eligible_evidence_count >= 2
       and r.variance_band in ('bounded_variance', 'moderate_variance')
       and r.reference_median is not null
        then 'medium_confidence'
      when r.eligible_evidence_count >= 1 and r.reference_median is not null then 'low_confidence'
      else 'blocked'
    end as confidence_tier,
    case
      when r.reference_median is null then 'blocked_no_price'
      when r.review_status like 'blocked_%' then 'blocked_policy'
      when r.source_count < 2 then 'reference_only_hold'
      when r.variance_band in ('high_variance', 'extreme_variance') then 'needs_review'
      else 'reference_context'
    end as candidate_status,
    jsonb_build_object(
      'review_status', r.review_status,
      'variance_band', r.variance_band,
      'price_ratio', r.price_ratio,
      'review_flags', r.review_flags,
      'source_summary', r.source_summary,
      'signal_payload', r.signal_payload
    ) as candidate_payload
  from latest_reference_rollups r
  where r.rn = 1
), unioned as (
  select * from active_candidates
  union all
  select * from reference_candidates
)
select
  card_print_id,
  gv_id,
  source,
  source_type,
  evidence_lane,
  rollup_version,
  source_rollup_id,
  currency,
  candidate_median,
  candidate_low,
  candidate_high,
  minimum_active_ask,
  maximum_active_ask,
  evidence_count,
  seller_count,
  source_count,
  signal_at,
  confidence_tier,
  candidate_status,
  candidate_payload,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth
from unioned;

revoke all on public.v_market_evidence_price_candidates_v1 from public, anon, authenticated, service_role;
grant select on public.v_market_evidence_price_candidates_v1 to service_role;
