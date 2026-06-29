-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly 10 times for low_signal_monitor rows.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '00b58c53-3228-4bfd-a55b-2c16ec1be124'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":1,"target_disposition_id":"00b58c53-3228-4bfd-a55b-2c16ec1be124","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '01296bdf-16f7-4e2d-839b-a110993ca257'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":2,"target_disposition_id":"01296bdf-16f7-4e2d-839b-a110993ca257","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '022501fd-56d0-4873-8ed4-e66a9ee404bd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":3,"target_disposition_id":"022501fd-56d0-4873-8ed4-e66a9ee404bd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0251b0b3-1bf9-4020-90ec-bafd66c95ef4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":4,"target_disposition_id":"0251b0b3-1bf9-4020-90ec-bafd66c95ef4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '03d769b0-1fa7-4b34-be98-5fa4db2e766a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":5,"target_disposition_id":"03d769b0-1fa7-4b34-be98-5fa4db2e766a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0450f3e0-ffb3-47e2-959c-066ef72cd1f5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":6,"target_disposition_id":"0450f3e0-ffb3-47e2-959c-066ef72cd1f5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '0489c268-59ae-472d-97a9-17fc3983deac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":7,"target_disposition_id":"0489c268-59ae-472d-97a9-17fc3983deac","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '04f4b24b-c685-4451-9206-5aed2c6eafae'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":8,"target_disposition_id":"04f4b24b-c685-4451-9206-5aed2c6eafae","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '05b52775-4f83-45c8-a6bc-eacdaa03b3e2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":9,"target_disposition_id":"05b52775-4f83-45c8-a6bc-eacdaa03b3e2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '06009615-630b-4ac4-947f-6be2e8db0e3f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_10_batch_plan'::text,
  null::text,
  'MEE core 10-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1","row_manifest_sha256":"14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2","batch_index":10,"target_disposition_id":"06009615-630b-4ac4-947f-6be2e8db0e3f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

commit;
