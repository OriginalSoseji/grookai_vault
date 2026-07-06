-- MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1 local view candidate.
-- Internal-only scoring read model. Do not remotely apply without explicit schema approval.
-- This view is intentionally not app-visible and does not write/publicize pricing.

create or replace view public.v_market_evidence_candidate_threshold_scores_v1 as
with candidate_rows as (
  select
    d.id as disposition_id,
    d.card_print_id,
    d.gv_id,
    d.review_lane,
    d.evidence_lane,
    d.review_status,
    d.review_disposition,
    d.needs_review,
    (d.evidence_summary->>'evidence_count')::int as evidence_count,
    (d.evidence_summary->>'rollup_eligible_count')::int as rollup_eligible_count,
    (d.evidence_summary->>'quality_flag_count')::int as quality_flag_count,
    (d.evidence_summary->>'exclusion_flag_count')::int as exclusion_flag_count,
    (d.evidence_summary->>'raw_single_count')::int as raw_single_count,
    (d.evidence_summary->>'slab_count')::int as slab_count,
    (d.source_mix->>'source_family_count')::int as source_family_count,
    (d.source_mix->>'active_listing_evidence_count')::int as active_listing_evidence_count,
    d.publication_gate_candidate,
    d.can_publish_price_directly,
    d.publishable,
    d.app_visible,
    d.market_truth,
    d.updated_at
  from public.market_evidence_review_dispositions d
  where d.needs_review = true
    and d.review_status = 'pending'
    and d.evidence_lane in ('raw_single', 'slab')
), scored as (
  select
    *,
    case
      when evidence_lane = 'raw_single' and review_lane = 'high_signal_review' then rollup_eligible_count >= 3
      else rollup_eligible_count >= 5
    end as passes_rollup_floor,
    source_family_count >= 2 as passes_source_family_floor,
    quality_flag_count = 0 as passes_quality_floor,
    exclusion_flag_count = 0 as passes_exclusion_floor,
    not (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as passes_public_boundary,
    case
      when evidence_lane = 'slab' then 'slab'
      when review_lane = 'high_signal_review' then 'high_signal_raw_single'
      else 'raw_single'
    end as threshold_lane
  from candidate_rows
)
select
  disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  threshold_lane,
  evidence_count,
  rollup_eligible_count,
  quality_flag_count,
  exclusion_flag_count,
  raw_single_count,
  slab_count,
  source_family_count,
  active_listing_evidence_count,
  passes_rollup_floor,
  passes_source_family_floor,
  passes_quality_floor,
  passes_exclusion_floor,
  passes_public_boundary,
  (
    (case when passes_rollup_floor then 1 else 0 end) +
    (case when passes_source_family_floor then 1 else 0 end) +
    (case when passes_quality_floor then 1 else 0 end) +
    (case when passes_exclusion_floor then 1 else 0 end) +
    (case when passes_public_boundary then 1 else 0 end)
  )::int as threshold_score,
  case
    when not passes_public_boundary then 'blocked_public_boundary'
    when not passes_quality_floor then 'blocked_quality_flags'
    when not passes_source_family_floor then 'needs_independent_source'
    when not passes_rollup_floor then 'needs_more_eligible_evidence'
    when not passes_exclusion_floor then 'manual_review_exclusion_flags'
    else 'threshold_ready_manual_review'
  end as threshold_bucket,
  false as can_auto_confirm_internal_candidate,
  false as publishable,
  false as app_visible,
  false as market_truth,
  updated_at
from scored;

revoke all on public.v_market_evidence_candidate_threshold_scores_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_candidate_threshold_scores_v1 to service_role;
