-- MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1 readback after future apply. Read-only.

select
  cleanup_action,
  cleanup_state,
  reason_code,
  evidence_lane,
  count(*)::bigint as rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth or can_publish_price_directly_at_action)::bigint as public_boundary_leak_rows
from public.market_listing_candidate_cleanup_events
where contract_version = 'MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1'
  and cleanup_policy_version = 'MEE_CANDIDATE_EVIDENCE_CLEANUP_POLICY_V1'
  and action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1'
group by cleanup_action, cleanup_state, reason_code, evidence_lane
order by cleanup_action, cleanup_state, reason_code, evidence_lane;

select
  count(*)::bigint as cleanup_event_rows,
  count(distinct candidate_id)::bigint as distinct_candidate_rows,
  count(*) filter (where can_publish_price_directly or publishable or app_visible or market_truth or can_publish_price_directly_at_action)::bigint as public_boundary_leak_rows
from public.market_listing_candidate_cleanup_events
where action_payload->>'package_id' = 'MEE-CANDIDATE-CLEANUP-EVENT-SEED-PLAN-V1';
