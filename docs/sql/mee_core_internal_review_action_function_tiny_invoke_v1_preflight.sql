-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 preflight SQL.
-- Read-only. Use immediately before any approved apply to verify the optimistic-lock target still matches.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_PREFLIGHT'::text as package_id,
  count(*)::int as eligible_target_rows
from public.market_evidence_review_dispositions
where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid
  and updated_at is not distinct from '2026-06-26 19:45:24.907445+00'::timestamptz
  and review_lane = 'low_signal_monitor'
  and review_status = 'resolved'
  and review_disposition = 'monitor_only'
  and publication_gate_candidate = false
  and can_publish_price_directly = false
  and publishable = false
  and app_visible = false
  and market_truth = false;
