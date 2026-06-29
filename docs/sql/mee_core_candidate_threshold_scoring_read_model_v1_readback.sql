-- MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1 readback.
-- Read-only inline scoring equivalent of v_market_evidence_candidate_threshold_scores_v1.

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
    d.market_truth
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
), final_scores as (
  select
    *,
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
    false as score_publishable,
    false as score_app_visible,
    false as score_market_truth
  from scored
), bucket_summary as (
  select threshold_lane, threshold_bucket, count(*)::int as rows
  from final_scores
  group by 1,2
), score_summary as (
  select threshold_lane, threshold_score, count(*)::int as rows
  from final_scores
  group by 1,2
), boundary as (
  select
    count(*) filter (where can_auto_confirm_internal_candidate)::int as auto_confirm_rows,
    count(*) filter (where score_publishable or score_app_visible or score_market_truth)::int as score_public_flag_rows,
    count(*) filter (where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)::int as source_public_flag_rows
  from final_scores
)
select
  'MEE-CORE-CANDIDATE-THRESHOLD-SCORING-READ-MODEL-V1'::text as package_id,
  (select count(*)::int from final_scores) as candidate_rows,
  (select jsonb_agg(to_jsonb(bucket_summary) order by threshold_lane, threshold_bucket) from bucket_summary) as bucket_summary,
  (select jsonb_agg(to_jsonb(score_summary) order by threshold_lane, threshold_score) from score_summary) as score_summary,
  (select to_jsonb(boundary) from boundary) as boundary;
