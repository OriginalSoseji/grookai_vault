-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly 100 times for low_signal_monitor rows.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '2696f400-898f-48cc-98f3-4d7c325d85e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":1,"target_disposition_id":"2696f400-898f-48cc-98f3-4d7c325d85e7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '26c63a99-d59d-4e8b-92e5-33e66512d200'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":2,"target_disposition_id":"26c63a99-d59d-4e8b-92e5-33e66512d200","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '27a656ad-8123-4b55-8046-3351ae7c2089'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":3,"target_disposition_id":"27a656ad-8123-4b55-8046-3351ae7c2089","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2831daee-0d28-4c99-b801-2aba22f56f44'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":4,"target_disposition_id":"2831daee-0d28-4c99-b801-2aba22f56f44","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '28967408-6010-4c6e-b389-9f3f56c2906a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":5,"target_disposition_id":"28967408-6010-4c6e-b389-9f3f56c2906a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '28b214e0-15e0-4222-9333-eb2f526da4bf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":6,"target_disposition_id":"28b214e0-15e0-4222-9333-eb2f526da4bf","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '29534733-324e-475a-9ec6-8abe970fb7c1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":7,"target_disposition_id":"29534733-324e-475a-9ec6-8abe970fb7c1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ad4bfac-e3d3-47ff-8d0b-c3b5051045df'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":8,"target_disposition_id":"2ad4bfac-e3d3-47ff-8d0b-c3b5051045df","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ae84369-d1ee-4b51-8c42-e8d9af8942d6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":9,"target_disposition_id":"2ae84369-d1ee-4b51-8c42-e8d9af8942d6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2d54c6e6-737a-4dd0-9a3c-5996e8b9657b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":10,"target_disposition_id":"2d54c6e6-737a-4dd0-9a3c-5996e8b9657b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2d668084-293a-48ac-8b2d-35705eda004f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":11,"target_disposition_id":"2d668084-293a-48ac-8b2d-35705eda004f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '2ed72c41-f7a5-492a-b967-23fa4daba4b2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":12,"target_disposition_id":"2ed72c41-f7a5-492a-b967-23fa4daba4b2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '30fc5006-b736-4685-a165-6db66db3b933'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":13,"target_disposition_id":"30fc5006-b736-4685-a165-6db66db3b933","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '313a697f-7900-4842-a68d-48afd9ed1288'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":14,"target_disposition_id":"313a697f-7900-4842-a68d-48afd9ed1288","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '318a62ad-898e-41be-b23f-1b87a1c6b85b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":15,"target_disposition_id":"318a62ad-898e-41be-b23f-1b87a1c6b85b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31ae0f09-895a-405d-9048-90570b2f51d8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":16,"target_disposition_id":"31ae0f09-895a-405d-9048-90570b2f51d8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '31ccc2b9-90d0-4345-a6bd-b2af549931b9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":17,"target_disposition_id":"31ccc2b9-90d0-4345-a6bd-b2af549931b9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '32c68e92-c1b4-41e0-8c5b-2606038c69b5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":18,"target_disposition_id":"32c68e92-c1b4-41e0-8c5b-2606038c69b5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '332e41fd-c1d6-4278-9085-65f1ca207d88'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":19,"target_disposition_id":"332e41fd-c1d6-4278-9085-65f1ca207d88","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '33cd6af3-0a5e-4ec3-ab1b-151690855b17'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":20,"target_disposition_id":"33cd6af3-0a5e-4ec3-ab1b-151690855b17","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '350d7893-8c25-4f16-b735-24ee83c34474'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":21,"target_disposition_id":"350d7893-8c25-4f16-b735-24ee83c34474","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '364576b5-de44-4f6b-92d2-e4e9f0b6af02'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":22,"target_disposition_id":"364576b5-de44-4f6b-92d2-e4e9f0b6af02","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '36cc5fc2-3df8-4992-8363-5049ab4cdb6b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":23,"target_disposition_id":"36cc5fc2-3df8-4992-8363-5049ab4cdb6b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '394a807c-f7bc-4241-b5a0-74a72252a1b0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":24,"target_disposition_id":"394a807c-f7bc-4241-b5a0-74a72252a1b0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '395e0c57-615a-43ac-9ff6-abb946ebb6b4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":25,"target_disposition_id":"395e0c57-615a-43ac-9ff6-abb946ebb6b4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3a3a5d51-8f2d-4de1-9d76-cbb51f681dce'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":26,"target_disposition_id":"3a3a5d51-8f2d-4de1-9d76-cbb51f681dce","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3b522716-95a1-4ab8-8121-5a9e744764b0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":27,"target_disposition_id":"3b522716-95a1-4ab8-8121-5a9e744764b0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3b7a82c3-6699-4c2a-af66-7177332d15ab'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":28,"target_disposition_id":"3b7a82c3-6699-4c2a-af66-7177332d15ab","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c008afa-06b2-4f89-b1c4-0e0a974ac38d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":29,"target_disposition_id":"3c008afa-06b2-4f89-b1c4-0e0a974ac38d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3c4b1349-ee6f-4666-beb8-b623c4f36a26'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":30,"target_disposition_id":"3c4b1349-ee6f-4666-beb8-b623c4f36a26","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3cad27aa-6c0b-4ac1-9901-4ccd85b45fa6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":31,"target_disposition_id":"3cad27aa-6c0b-4ac1-9901-4ccd85b45fa6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3daeffba-91d5-4bf3-9732-013ca73b5492'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":32,"target_disposition_id":"3daeffba-91d5-4bf3-9732-013ca73b5492","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3dd54343-becb-4fcf-b198-66a08065a659'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":33,"target_disposition_id":"3dd54343-becb-4fcf-b198-66a08065a659","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3e0cfd45-f58d-4f36-9a3f-0a8b22ae5bd7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":34,"target_disposition_id":"3e0cfd45-f58d-4f36-9a3f-0a8b22ae5bd7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3e51afa2-1842-4994-99f9-44a38ff3d5dd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":35,"target_disposition_id":"3e51afa2-1842-4994-99f9-44a38ff3d5dd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3e8af922-3bc1-4ad6-8934-04a2871d8db1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":36,"target_disposition_id":"3e8af922-3bc1-4ad6-8934-04a2871d8db1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3f4740cf-2ab8-455e-8f73-adfb5bc5173b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":37,"target_disposition_id":"3f4740cf-2ab8-455e-8f73-adfb5bc5173b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3f95e78b-fb96-4077-bad1-2a206ec5464e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":38,"target_disposition_id":"3f95e78b-fb96-4077-bad1-2a206ec5464e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3fa9eef6-0ec0-45dc-b61c-46e2ce0cc6f0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":39,"target_disposition_id":"3fa9eef6-0ec0-45dc-b61c-46e2ce0cc6f0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '3fdc22d8-367e-42d0-a75a-edbbfecc8baf'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":40,"target_disposition_id":"3fdc22d8-367e-42d0-a75a-edbbfecc8baf","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '401c4c60-c9c8-48b8-b28f-1c0643fb082c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":41,"target_disposition_id":"401c4c60-c9c8-48b8-b28f-1c0643fb082c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40529ab3-a078-4dd0-ac3a-cc034b61994b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":42,"target_disposition_id":"40529ab3-a078-4dd0-ac3a-cc034b61994b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '40683d99-f4f2-4aa0-831c-e1ee0090ea2d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":43,"target_disposition_id":"40683d99-f4f2-4aa0-831c-e1ee0090ea2d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '409fa34b-aead-459d-8b0a-cc76305fb624'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":44,"target_disposition_id":"409fa34b-aead-459d-8b0a-cc76305fb624","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4118864b-b518-4e40-87bc-e5e2940766b5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":45,"target_disposition_id":"4118864b-b518-4e40-87bc-e5e2940766b5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4222d9a9-9e20-4f3d-b367-8d47b061bce5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":46,"target_disposition_id":"4222d9a9-9e20-4f3d-b367-8d47b061bce5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '432eda60-2f34-4af2-b43e-6566f983b4c7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":47,"target_disposition_id":"432eda60-2f34-4af2-b43e-6566f983b4c7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '43778601-553f-4f68-9029-931a6ff7060a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":48,"target_disposition_id":"43778601-553f-4f68-9029-931a6ff7060a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '444b5ae8-82be-4de3-967f-6530dfbc789a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":49,"target_disposition_id":"444b5ae8-82be-4de3-967f-6530dfbc789a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '457e9b2f-2407-48cd-aa95-baea0763666d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":50,"target_disposition_id":"457e9b2f-2407-48cd-aa95-baea0763666d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '46f34095-2003-4c74-a6ab-1c11463be855'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":51,"target_disposition_id":"46f34095-2003-4c74-a6ab-1c11463be855","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '475622bb-c33e-415e-b1fb-4ddb68c2d854'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":52,"target_disposition_id":"475622bb-c33e-415e-b1fb-4ddb68c2d854","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '47c11715-9634-4f57-8579-8f016d67048d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":53,"target_disposition_id":"47c11715-9634-4f57-8579-8f016d67048d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '48259590-9676-4ebd-806f-6ae19369be8f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":54,"target_disposition_id":"48259590-9676-4ebd-806f-6ae19369be8f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4908ce66-92a8-4846-a69e-d53a2d5e5be4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":55,"target_disposition_id":"4908ce66-92a8-4846-a69e-d53a2d5e5be4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4a1714c6-0937-44cd-a4cd-cec265fe4e85'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":56,"target_disposition_id":"4a1714c6-0937-44cd-a4cd-cec265fe4e85","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4a61815a-2be1-409e-a231-1e6f55c8c532'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":57,"target_disposition_id":"4a61815a-2be1-409e-a231-1e6f55c8c532","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4a64c939-6e26-42db-8475-8419c478a6ec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":58,"target_disposition_id":"4a64c939-6e26-42db-8475-8419c478a6ec","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4ab1bede-2897-4c21-8076-cc358f07ad8b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":59,"target_disposition_id":"4ab1bede-2897-4c21-8076-cc358f07ad8b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4abc72f3-a1db-4a30-aa48-4847e5753a95'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":60,"target_disposition_id":"4abc72f3-a1db-4a30-aa48-4847e5753a95","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c0c0604-2513-49e9-b39f-385331587a8e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":61,"target_disposition_id":"4c0c0604-2513-49e9-b39f-385331587a8e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4c7eda71-cc79-459b-a7a1-34db3f52c3cc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":62,"target_disposition_id":"4c7eda71-cc79-459b-a7a1-34db3f52c3cc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4d233165-d71b-4d12-a480-b3c0633f91de'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":63,"target_disposition_id":"4d233165-d71b-4d12-a480-b3c0633f91de","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4d666d23-f011-4e68-ba83-9354aa6fc55c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":64,"target_disposition_id":"4d666d23-f011-4e68-ba83-9354aa6fc55c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '4dbbb405-09f3-4a47-82b8-ca77626cfb03'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":65,"target_disposition_id":"4dbbb405-09f3-4a47-82b8-ca77626cfb03","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '50449bac-65af-4d26-b012-b6b05bb9c55c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":66,"target_disposition_id":"50449bac-65af-4d26-b012-b6b05bb9c55c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '520a20b8-06dc-49c8-9e6f-51dc309544e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":67,"target_disposition_id":"520a20b8-06dc-49c8-9e6f-51dc309544e7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '527bce3b-2612-4923-bf2f-3a24d01e50c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":68,"target_disposition_id":"527bce3b-2612-4923-bf2f-3a24d01e50c9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '52db4ecc-b2b8-43e5-a06e-f29d41971247'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":69,"target_disposition_id":"52db4ecc-b2b8-43e5-a06e-f29d41971247","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '53d495b7-5544-44e2-80f0-91ff1c01f5b7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":70,"target_disposition_id":"53d495b7-5544-44e2-80f0-91ff1c01f5b7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '53fec32a-8c49-4049-85d3-932a6ea674c2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":71,"target_disposition_id":"53fec32a-8c49-4049-85d3-932a6ea674c2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '54d1a72f-3d19-4419-84da-43f253bd5f9a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":72,"target_disposition_id":"54d1a72f-3d19-4419-84da-43f253bd5f9a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '54e8c747-bfbd-4794-bff2-2d760a288159'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":73,"target_disposition_id":"54e8c747-bfbd-4794-bff2-2d760a288159","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '55581971-9d31-407d-b4b9-c2c898a9d9ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":74,"target_disposition_id":"55581971-9d31-407d-b4b9-c2c898a9d9ac","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '55acaf74-cd70-43ef-957f-ab6958d6a933'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":75,"target_disposition_id":"55acaf74-cd70-43ef-957f-ab6958d6a933","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '596d4e14-e6ba-4de2-8b58-cc2be19337f9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":76,"target_disposition_id":"596d4e14-e6ba-4de2-8b58-cc2be19337f9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '59aa3c11-5fa1-44d0-aca4-217b05ecb327'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":77,"target_disposition_id":"59aa3c11-5fa1-44d0-aca4-217b05ecb327","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '59eda674-f9c8-406c-b6d2-242b5d835f6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":78,"target_disposition_id":"59eda674-f9c8-406c-b6d2-242b5d835f6e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5c41ff13-f22e-4250-9999-e9e66251288b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":79,"target_disposition_id":"5c41ff13-f22e-4250-9999-e9e66251288b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5c98e033-33de-4559-9cd4-e556e3a3b25b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":80,"target_disposition_id":"5c98e033-33de-4559-9cd4-e556e3a3b25b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5d2f31ab-0f6f-453a-9881-162eab45a485'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":81,"target_disposition_id":"5d2f31ab-0f6f-453a-9881-162eab45a485","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5deb8b21-4b3f-41a4-aee5-7583a966dc3c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":82,"target_disposition_id":"5deb8b21-4b3f-41a4-aee5-7583a966dc3c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5ea146e8-c8e5-4e15-8fcd-e41c6138eff6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":83,"target_disposition_id":"5ea146e8-c8e5-4e15-8fcd-e41c6138eff6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '5f7acd3f-c7a5-4897-889e-0162a4ce72c9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":84,"target_disposition_id":"5f7acd3f-c7a5-4897-889e-0162a4ce72c9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '600c657d-7337-4bf8-bb00-0a888668a340'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":85,"target_disposition_id":"600c657d-7337-4bf8-bb00-0a888668a340","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '604f868d-3e3f-41f4-a935-268da5e7e5a7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":86,"target_disposition_id":"604f868d-3e3f-41f4-a935-268da5e7e5a7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '607433ac-15a4-4b88-a3de-61899d79c4b9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":87,"target_disposition_id":"607433ac-15a4-4b88-a3de-61899d79c4b9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '60774ec6-4f77-4ddb-a12b-db6e284cadf1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":88,"target_disposition_id":"60774ec6-4f77-4ddb-a12b-db6e284cadf1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '60a7f0f8-4f37-46fd-926c-7cc28088d009'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":89,"target_disposition_id":"60a7f0f8-4f37-46fd-926c-7cc28088d009","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '61d45f7c-8e75-448b-aa87-b197d2f6892c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":90,"target_disposition_id":"61d45f7c-8e75-448b-aa87-b197d2f6892c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '62ff0e66-e7c9-4f10-8be1-7c785fa774e4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":91,"target_disposition_id":"62ff0e66-e7c9-4f10-8be1-7c785fa774e4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6304818c-2b66-4b5e-a979-8e74481141a0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":92,"target_disposition_id":"6304818c-2b66-4b5e-a979-8e74481141a0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '63209300-8dfd-4679-8584-6cb8c3fdafca'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":93,"target_disposition_id":"63209300-8dfd-4679-8584-6cb8c3fdafca","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6463e677-62c4-4934-bd08-e89ccaa2c36e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":94,"target_disposition_id":"6463e677-62c4-4934-bd08-e89ccaa2c36e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6482186a-f388-4fe4-85f2-c11e8109d579'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":95,"target_disposition_id":"6482186a-f388-4fe4-85f2-c11e8109d579","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6695d12d-3635-4b75-94ec-e84b4488c57c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":96,"target_disposition_id":"6695d12d-3635-4b75-94ec-e84b4488c57c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '66cf0bb9-c989-4e91-9e9a-42f12b5d0c6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":97,"target_disposition_id":"66cf0bb9-c989-4e91-9e9a-42f12b5d0c6e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '67195fcd-973f-452a-b3fd-e48d22cc36c8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":98,"target_disposition_id":"67195fcd-973f-452a-b3fd-e48d22cc36c8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6722b29e-b509-4a9c-9dc7-87d7df1ba144'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":99,"target_disposition_id":"6722b29e-b509-4a9c-9dc7-87d7df1ba144","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '67a5ccb4-0e23-4d01-bff0-02afda2154f0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-PLAN-V1","row_manifest_sha256":"bdfb717c8dcc58e400d1eca0fb245384f93ac063fec99b1b33acc1a4c36d302d","batch_index":100,"target_disposition_id":"67a5ccb4-0e23-4d01-bff0-02afda2154f0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

commit;
