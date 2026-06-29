-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly once for one low_signal_monitor row.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_tiny_invoke_plan'::text,
  null::text,
  'MEE core tiny invoke proof: confirm low_signal_monitor monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1","row_manifest_sha256":"7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567","target_disposition_id":"008c3618-9ee5-4ba0-8e60-e829d67f0002","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

commit;
