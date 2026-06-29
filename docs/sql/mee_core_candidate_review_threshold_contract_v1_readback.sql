-- MEE_CORE_CANDIDATE_REVIEW_THRESHOLD_CONTRACT_V1 readback.
-- Read-only candidate review threshold audit.

with candidate_rows as (
  select
    review_lane,
    evidence_lane,
    (evidence_summary->>'evidence_count')::int as evidence_count,
    (evidence_summary->>'rollup_eligible_count')::int as rollup_eligible_count,
    (evidence_summary->>'quality_flag_count')::int as quality_flag_count,
    (evidence_summary->>'exclusion_flag_count')::int as exclusion_flag_count,
    (source_mix->>'source_family_count')::int as source_family_count,
    publication_gate_candidate,
    can_publish_price_directly,
    publishable,
    app_visible,
    market_truth
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), lane_summary as (
  select
    review_lane,
    evidence_lane,
    count(*)::int as rows,
    min(evidence_count)::int as min_evidence,
    percentile_disc(0.5) within group (order by evidence_count)::int as median_evidence,
    max(evidence_count)::int as max_evidence,
    min(rollup_eligible_count)::int as min_rollup_eligible,
    percentile_disc(0.5) within group (order by rollup_eligible_count)::int as median_rollup_eligible,
    max(rollup_eligible_count)::int as max_rollup_eligible,
    count(*) filter (where source_family_count >= 2)::int as multi_source_family_rows,
    count(*) filter (where quality_flag_count = 0)::int as zero_quality_flag_rows,
    count(*) filter (where exclusion_flag_count = 0)::int as zero_exclusion_flag_rows
  from candidate_rows
  group by 1,2
), threshold_buckets as (
  select
    evidence_lane,
    source_family_count,
    rollup_eligible_count,
    count(*)::int as rows
  from candidate_rows
  group by 1,2,3
), public_boundary as (
  select
    count(*) filter (where publication_gate_candidate)::int as publication_gate_candidate_rows,
    count(*) filter (where can_publish_price_directly)::int as can_publish_price_directly_rows,
    count(*) filter (where publishable)::int as publishable_rows,
    count(*) filter (where app_visible)::int as app_visible_rows,
    count(*) filter (where market_truth)::int as market_truth_rows
  from candidate_rows
)
select
  'MEE-CORE-CANDIDATE-REVIEW-THRESHOLD-CONTRACT-V1'::text as package_id,
  (select jsonb_agg(to_jsonb(lane_summary) order by review_lane, evidence_lane) from lane_summary) as lane_summary,
  (select jsonb_agg(to_jsonb(threshold_buckets) order by evidence_lane, source_family_count, rollup_eligible_count) from threshold_buckets) as threshold_buckets,
  (select to_jsonb(public_boundary) from public_boundary) as public_boundary;
