-- MEE-PRICE-CANDIDATE-REVIEW-DASHBOARD-V1 local SQL/view candidates.
-- Internal-only review dashboard for v_market_evidence_price_candidates_v1.
-- Do not apply remotely without a separate targeted approval.
-- This layer does not publish pricing and does not create market truth.

create or replace view public.v_market_evidence_price_candidate_review_queue_v1
with (security_invoker = true)
as
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
  case
    when can_publish_price_directly or publishable or app_visible or market_truth
      then 'public_boundary_block'
    when evidence_lane = 'raw_single'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
     and candidate_median >= 250
      then 'raw_single_high_value_review'
    when evidence_lane = 'raw_single'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
      then 'raw_single_ready_review'
    when evidence_lane = 'slab'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
     and candidate_median >= 1000
      then 'slab_high_value_review'
    when evidence_lane = 'slab'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
      then 'slab_ready_review'
    when candidate_status = 'needs_more_evidence'
      then 'evidence_depth_queue'
    when source_type = 'reference' and candidate_status = 'reference_only_hold'
      then 'reference_only_hold'
    when source_type = 'reference' and candidate_status = 'reference_context'
      then 'reference_context_review'
    when candidate_status like 'blocked_%'
      then 'blocked_policy_review'
    when candidate_status = 'needs_review'
      then 'needs_review'
    else 'standard_price_candidate_review'
  end as review_queue,
  case
    when source_type = 'active_listing'
     and evidence_lane = 'raw_single'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
      then true
    when source_type = 'active_listing'
     and evidence_lane = 'slab'
     and confidence_tier = 'high_confidence'
     and candidate_status = 'internal_candidate'
      then true
    else false
  end as reviewer_candidate,
  candidate_payload,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.v_market_evidence_price_candidates_v1;

create or replace view public.v_market_evidence_price_candidate_review_summary_v1
with (security_invoker = true)
as
select
  review_queue,
  source_type,
  evidence_lane,
  confidence_tier,
  candidate_status,
  count(*)::int as candidate_count,
  count(*) filter (where candidate_median is not null)::int as priced_candidate_count,
  min(candidate_median) as min_candidate_median,
  percentile_cont(0.5) within group (order by candidate_median) filter (where candidate_median is not null) as median_candidate_median,
  max(candidate_median) as max_candidate_median,
  count(*) filter (where reviewer_candidate)::int as reviewer_candidate_count,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.v_market_evidence_price_candidate_review_queue_v1
group by review_queue, source_type, evidence_lane, confidence_tier, candidate_status;

create or replace view public.v_market_evidence_price_candidate_high_value_review_v1
with (security_invoker = true)
as
select *
from public.v_market_evidence_price_candidate_review_queue_v1
where review_queue in ('raw_single_high_value_review', 'slab_high_value_review')
   or (evidence_lane = 'raw_single' and candidate_median >= 250)
   or (evidence_lane = 'slab' and candidate_median >= 1000);

revoke all on public.v_market_evidence_price_candidate_review_queue_v1 from public, anon, authenticated, service_role;
revoke all on public.v_market_evidence_price_candidate_review_summary_v1 from public, anon, authenticated, service_role;
revoke all on public.v_market_evidence_price_candidate_high_value_review_v1 from public, anon, authenticated, service_role;

grant select on public.v_market_evidence_price_candidate_review_queue_v1 to service_role;
grant select on public.v_market_evidence_price_candidate_review_summary_v1 to service_role;
grant select on public.v_market_evidence_price_candidate_high_value_review_v1 to service_role;
