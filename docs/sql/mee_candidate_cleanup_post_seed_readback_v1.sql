-- MEE-CANDIDATE-CLEANUP-POST-SEED-READBACK-V1 readback.
-- Read-only. No DB writes. No function invocation. No public pricing.

select
  count(*)::bigint as cleanup_event_rows,
  count(distinct candidate_id)::bigint as distinct_candidate_ids,
  count(distinct card_print_id)::bigint as distinct_card_prints,
  count(*) filter (
    where can_publish_price_directly
       or publishable
       or app_visible
       or market_truth
       or can_publish_price_directly_at_action
  )::bigint as public_boundary_leak_rows
from public.market_listing_candidate_cleanup_events
where action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1';

select
  cleanup_action,
  cleanup_state,
  reason_code,
  evidence_lane,
  count(*)::bigint as rows,
  count(*) filter (
    where can_publish_price_directly
       or publishable
       or app_visible
       or market_truth
       or can_publish_price_directly_at_action
  )::bigint as public_boundary_leak_rows
from public.v_market_listing_candidate_cleanup_current_v1
where action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1'
group by cleanup_action, cleanup_state, reason_code, evidence_lane
order by cleanup_action, cleanup_state, reason_code, evidence_lane;

select
  count(*)::bigint as card_summary_rows,
  count(*) filter (where public_boundary_leak_rows > 0)::bigint as card_summary_public_boundary_leak_rows,
  sum(cleanup_candidate_rows)::bigint as cleanup_candidate_rows,
  sum(quarantined_candidate_rows)::bigint as quarantined_candidate_rows,
  sum(matcher_reclassify_candidate_rows)::bigint as matcher_reclassify_candidate_rows,
  sum(special_lane_policy_candidate_rows)::bigint as special_lane_policy_candidate_rows,
  sum(high_value_review_candidate_rows)::bigint as high_value_review_candidate_rows,
  sum(keep_review_candidate_rows)::bigint as keep_review_candidate_rows,
  sum(deferred_more_evidence_candidate_rows)::bigint as deferred_more_evidence_candidate_rows
from public.v_market_listing_candidate_cleanup_card_summary_v1;

select
  count(*)::bigint as held_rows,
  count(*) filter (where evidence_lane = 'raw_single')::bigint as raw_single_rows,
  count(*) filter (where evidence_lane = 'slab')::bigint as slab_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth)::bigint as public_boundary_leak_rows
from public.v_market_evidence_publication_gate_candidates_v1
where gate_decision = 'defer_review_confirmation'
  and evidence_lane in ('raw_single', 'slab');

