-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_100_BATCH_02_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 exactly 100 times for low_signal_monitor rows.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '6a818fd9-ba5d-4ec8-9ae7-1163a873b3f5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":1,"target_disposition_id":"6a818fd9-ba5d-4ec8-9ae7-1163a873b3f5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6b631d54-b79e-4b8a-ad63-b7972baa527f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":2,"target_disposition_id":"6b631d54-b79e-4b8a-ad63-b7972baa527f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6bef4e34-776c-4887-ad69-734f0c888ce4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":3,"target_disposition_id":"6bef4e34-776c-4887-ad69-734f0c888ce4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c95d461-0961-45c4-a6b1-bc6862e35877'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":4,"target_disposition_id":"6c95d461-0961-45c4-a6b1-bc6862e35877","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6c9fa436-fbb4-4af7-b5d0-38c57024df4f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":5,"target_disposition_id":"6c9fa436-fbb4-4af7-b5d0-38c57024df4f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6cfeb89a-51be-4f4e-bc7e-35487b765566'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":6,"target_disposition_id":"6cfeb89a-51be-4f4e-bc7e-35487b765566","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6d33b35c-80b8-4c27-b266-1fcb00148083'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":7,"target_disposition_id":"6d33b35c-80b8-4c27-b266-1fcb00148083","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6da2b879-7ef3-4692-9626-59211ec5b097'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":8,"target_disposition_id":"6da2b879-7ef3-4692-9626-59211ec5b097","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6db24e29-fbb6-484d-9212-372a934390bb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":9,"target_disposition_id":"6db24e29-fbb6-484d-9212-372a934390bb","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6ea28200-40ef-485e-aae5-755fc6d2579e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":10,"target_disposition_id":"6ea28200-40ef-485e-aae5-755fc6d2579e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6ea34525-3a37-4a81-98f2-6a954f76205c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":11,"target_disposition_id":"6ea34525-3a37-4a81-98f2-6a954f76205c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f19d319-1cde-4007-b2fa-46c3765cdade'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":12,"target_disposition_id":"6f19d319-1cde-4007-b2fa-46c3765cdade","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '6f3b6fbf-fc27-4f97-87cc-70d6b3d11060'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":13,"target_disposition_id":"6f3b6fbf-fc27-4f97-87cc-70d6b3d11060","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '70c5e254-7971-49fb-b01b-8e28331c8fe6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":14,"target_disposition_id":"70c5e254-7971-49fb-b01b-8e28331c8fe6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7129e2d3-715f-4baa-968b-3ef392d68299'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":15,"target_disposition_id":"7129e2d3-715f-4baa-968b-3ef392d68299","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '716ae20b-73f1-47d4-876a-a176d8019be5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":16,"target_disposition_id":"716ae20b-73f1-47d4-876a-a176d8019be5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '724c02d1-d46a-4c1e-bb00-c65eab371528'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":17,"target_disposition_id":"724c02d1-d46a-4c1e-bb00-c65eab371528","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7297df34-00e7-4b0a-b389-008e7f762782'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":18,"target_disposition_id":"7297df34-00e7-4b0a-b389-008e7f762782","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7333020d-57a7-45d3-8089-1419ce2c6477'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":19,"target_disposition_id":"7333020d-57a7-45d3-8089-1419ce2c6477","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '741d65c9-593b-4595-bdfa-c4b0cfb7fe8b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":20,"target_disposition_id":"741d65c9-593b-4595-bdfa-c4b0cfb7fe8b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '742c61ed-5b3e-4857-bd39-fa0a9a60a57f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":21,"target_disposition_id":"742c61ed-5b3e-4857-bd39-fa0a9a60a57f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '74d72ff4-9c11-4e1b-9298-d809bffcf98e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":22,"target_disposition_id":"74d72ff4-9c11-4e1b-9298-d809bffcf98e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75061718-ee23-4f9b-8d2c-05d297af0fc4'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":23,"target_disposition_id":"75061718-ee23-4f9b-8d2c-05d297af0fc4","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '75f3f658-0cca-4fb3-8aea-ebe24a275b8a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":24,"target_disposition_id":"75f3f658-0cca-4fb3-8aea-ebe24a275b8a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '76f49992-70b6-48b1-a3e6-1520a06f15d3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":25,"target_disposition_id":"76f49992-70b6-48b1-a3e6-1520a06f15d3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '771feefe-0578-44d2-846b-db939a8a124e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":26,"target_disposition_id":"771feefe-0578-44d2-846b-db939a8a124e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '777941b5-85ff-414c-9cb8-3fdd2dd07e52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":27,"target_disposition_id":"777941b5-85ff-414c-9cb8-3fdd2dd07e52","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7780f888-2c3b-4803-854b-b31bdf1b6dc0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":28,"target_disposition_id":"7780f888-2c3b-4803-854b-b31bdf1b6dc0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '778f0d8a-4c97-4ad8-87f8-d32a9e7616dc'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":29,"target_disposition_id":"778f0d8a-4c97-4ad8-87f8-d32a9e7616dc","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78a5742d-0a19-4d5b-bb4b-8ef8111c06be'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":30,"target_disposition_id":"78a5742d-0a19-4d5b-bb4b-8ef8111c06be","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '78c6e389-62f5-4d7f-95a5-4e2645c15c9a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":31,"target_disposition_id":"78c6e389-62f5-4d7f-95a5-4e2645c15c9a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7940da10-930a-49a7-9995-15ddb306f445'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":32,"target_disposition_id":"7940da10-930a-49a7-9995-15ddb306f445","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '797143ad-4061-4bfb-8537-f874535772ba'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":33,"target_disposition_id":"797143ad-4061-4bfb-8537-f874535772ba","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b3b6e29-97fa-461d-8477-52b710c632f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":34,"target_disposition_id":"7b3b6e29-97fa-461d-8477-52b710c632f3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b5543c5-5fce-4ac3-a931-69c250a99485'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":35,"target_disposition_id":"7b5543c5-5fce-4ac3-a931-69c250a99485","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7b7657a9-3b7d-4f30-a05c-dc24c0cc8e94'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":36,"target_disposition_id":"7b7657a9-3b7d-4f30-a05c-dc24c0cc8e94","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7cb9d2aa-36e8-41bd-a0bf-f2ffd63acefd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":37,"target_disposition_id":"7cb9d2aa-36e8-41bd-a0bf-f2ffd63acefd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d29aa44-539e-41d3-a7cb-0a1a09fdae6c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":38,"target_disposition_id":"7d29aa44-539e-41d3-a7cb-0a1a09fdae6c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d346c2a-da67-43fa-8a1a-7eebdc4fb056'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":39,"target_disposition_id":"7d346c2a-da67-43fa-8a1a-7eebdc4fb056","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d418d5b-0bf0-482b-bbe6-d28e65dcac86'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":40,"target_disposition_id":"7d418d5b-0bf0-482b-bbe6-d28e65dcac86","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e03a4bf-2d02-4930-bf49-61a4a85b6f0f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":41,"target_disposition_id":"7e03a4bf-2d02-4930-bf49-61a4a85b6f0f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e81a797-d4d5-4f1f-a1b7-25cd27813410'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":42,"target_disposition_id":"7e81a797-d4d5-4f1f-a1b7-25cd27813410","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7e9c1b49-8d13-4ad1-8d26-04204611b8aa'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":43,"target_disposition_id":"7e9c1b49-8d13-4ad1-8d26-04204611b8aa","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '80b310b0-c6e5-4a38-9f63-39bd020efa1c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":44,"target_disposition_id":"80b310b0-c6e5-4a38-9f63-39bd020efa1c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '81069cd1-5e32-4e5b-ae05-17ebbdaaf787'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":45,"target_disposition_id":"81069cd1-5e32-4e5b-ae05-17ebbdaaf787","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '822e528c-637a-4932-bbf9-9eab8175267c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":46,"target_disposition_id":"822e528c-637a-4932-bbf9-9eab8175267c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '824828d6-7de1-41a7-93c1-a241c427134e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":47,"target_disposition_id":"824828d6-7de1-41a7-93c1-a241c427134e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83088a7b-96aa-4d45-b387-470b61baa4ec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":48,"target_disposition_id":"83088a7b-96aa-4d45-b387-470b61baa4ec","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '83626169-12ae-4562-9851-c5f672b089bd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":49,"target_disposition_id":"83626169-12ae-4562-9851-c5f672b089bd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '844acfdd-bb84-4738-a2fa-2aa73abd7805'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":50,"target_disposition_id":"844acfdd-bb84-4738-a2fa-2aa73abd7805","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '84905371-41be-4715-b7ab-f702ae3c98db'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":51,"target_disposition_id":"84905371-41be-4715-b7ab-f702ae3c98db","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '854901a9-1a4c-4d2b-8292-0e77ceaac984'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":52,"target_disposition_id":"854901a9-1a4c-4d2b-8292-0e77ceaac984","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8657ff41-a1ca-40b0-bc1e-ddeb499c6481'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":53,"target_disposition_id":"8657ff41-a1ca-40b0-bc1e-ddeb499c6481","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '87a86e0e-6d37-4ec4-aaef-85773b4ac67b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":54,"target_disposition_id":"87a86e0e-6d37-4ec4-aaef-85773b4ac67b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '881eebe1-975c-4e1b-bc09-1436dbde931c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":55,"target_disposition_id":"881eebe1-975c-4e1b-bc09-1436dbde931c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '899ad16b-2658-40ea-a6dc-627b0a89c931'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":56,"target_disposition_id":"899ad16b-2658-40ea-a6dc-627b0a89c931","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8a666f38-6ff5-42ae-a1da-277dc988d5f2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":57,"target_disposition_id":"8a666f38-6ff5-42ae-a1da-277dc988d5f2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8ab8b023-c60e-496b-872e-4df9abdd4a75'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":58,"target_disposition_id":"8ab8b023-c60e-496b-872e-4df9abdd4a75","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c5febca-1f77-48d1-a660-259c2fd5b3a1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":59,"target_disposition_id":"8c5febca-1f77-48d1-a660-259c2fd5b3a1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c760cc2-f35c-4b76-89e7-0eac7352eaa8'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":60,"target_disposition_id":"8c760cc2-f35c-4b76-89e7-0eac7352eaa8","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d3bab13-ea31-4316-a660-28b650236a4a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":61,"target_disposition_id":"8d3bab13-ea31-4316-a660-28b650236a4a","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8d4fd3e3-2057-4ad7-bf65-36901b8ee7c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":62,"target_disposition_id":"8d4fd3e3-2057-4ad7-bf65-36901b8ee7c0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8e1a572c-51fa-4b96-b166-af38f4b35958'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":63,"target_disposition_id":"8e1a572c-51fa-4b96-b166-af38f4b35958","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8e5e1357-10dc-43d8-9339-9bc35a6855b3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":64,"target_disposition_id":"8e5e1357-10dc-43d8-9339-9bc35a6855b3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8f15605a-35eb-4b44-9143-8c222ecca34c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":65,"target_disposition_id":"8f15605a-35eb-4b44-9143-8c222ecca34c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8f61b3d0-c686-4436-a230-dc29f75c54f3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":66,"target_disposition_id":"8f61b3d0-c686-4436-a230-dc29f75c54f3","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '905c0f84-5da5-44de-bc3c-7f60dc9ff8c2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":67,"target_disposition_id":"905c0f84-5da5-44de-bc3c-7f60dc9ff8c2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '90894eb6-8211-4c88-8f71-b2b002f29515'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":68,"target_disposition_id":"90894eb6-8211-4c88-8f71-b2b002f29515","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '91484d97-a5f8-4e9e-bd68-12324cc4f559'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":69,"target_disposition_id":"91484d97-a5f8-4e9e-bd68-12324cc4f559","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9178e5af-7e2d-420e-b57f-c89447f85b7b'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":70,"target_disposition_id":"9178e5af-7e2d-420e-b57f-c89447f85b7b","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93050f84-2fa4-4db9-94dd-1cde78908352'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":71,"target_disposition_id":"93050f84-2fa4-4db9-94dd-1cde78908352","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '932663b6-3bec-4843-9f74-853d759fcb0c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":72,"target_disposition_id":"932663b6-3bec-4843-9f74-853d759fcb0c","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93d559da-daac-44bd-862c-5d5b1abaeafd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":73,"target_disposition_id":"93d559da-daac-44bd-862c-5d5b1abaeafd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '93f55868-bb67-4ca1-9704-bb9751920453'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":74,"target_disposition_id":"93f55868-bb67-4ca1-9704-bb9751920453","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '944da5f4-c507-4787-9f5c-9f0b469983dd'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":75,"target_disposition_id":"944da5f4-c507-4787-9f5c-9f0b469983dd","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '94ed2ab7-2b0c-4ac4-b554-339e67200e52'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":76,"target_disposition_id":"94ed2ab7-2b0c-4ac4-b554-339e67200e52","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95425d92-80dc-4274-811e-5718b6bd66a5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":77,"target_disposition_id":"95425d92-80dc-4274-811e-5718b6bd66a5","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95c8deb7-d7eb-4579-8f45-6954ba13b4c6'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":78,"target_disposition_id":"95c8deb7-d7eb-4579-8f45-6954ba13b4c6","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '95d7b5c5-90ec-4e47-b212-acd6ce63f1c0'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":79,"target_disposition_id":"95d7b5c5-90ec-4e47-b212-acd6ce63f1c0","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '96346dce-e2d4-482e-949d-7f076b485444'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":80,"target_disposition_id":"96346dce-e2d4-482e-949d-7f076b485444","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9643a978-3b1c-455a-973c-c2a2f5ad435e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":81,"target_disposition_id":"9643a978-3b1c-455a-973c-c2a2f5ad435e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '964e77b5-ca4e-4d74-aca6-a3dca4dd52d2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":82,"target_disposition_id":"964e77b5-ca4e-4d74-aca6-a3dca4dd52d2","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9734216b-0608-4581-9f39-964c79b55640'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":83,"target_disposition_id":"9734216b-0608-4581-9f39-964c79b55640","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '98d236ae-f61e-4a57-9cc7-c2293cf057c1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":84,"target_disposition_id":"98d236ae-f61e-4a57-9cc7-c2293cf057c1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99129407-3390-48c0-af14-2661b8524d1d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":85,"target_disposition_id":"99129407-3390-48c0-af14-2661b8524d1d","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99b57542-bd0e-4af3-8f26-4115d3e555ac'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":86,"target_disposition_id":"99b57542-bd0e-4af3-8f26-4115d3e555ac","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '99cfcdd1-7a1c-4e30-86c9-6aad513e1e55'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":87,"target_disposition_id":"99cfcdd1-7a1c-4e30-86c9-6aad513e1e55","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9a9df345-5dff-4287-8f3b-de1cf90b3148'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":88,"target_disposition_id":"9a9df345-5dff-4287-8f3b-de1cf90b3148","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c7dd069-4aa1-4a5a-88dd-1002af2405c7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":89,"target_disposition_id":"9c7dd069-4aa1-4a5a-88dd-1002af2405c7","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c9e12f0-321e-4d1c-b926-e8b9f8dd1d8f'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":90,"target_disposition_id":"9c9e12f0-321e-4d1c-b926-e8b9f8dd1d8f","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9c9ea6a7-956a-45e2-8684-17bb13eb5d25'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":91,"target_disposition_id":"9c9ea6a7-956a-45e2-8684-17bb13eb5d25","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9cefb262-a0a0-4207-84d0-dac381b29136'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":92,"target_disposition_id":"9cefb262-a0a0-4207-84d0-dac381b29136","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9d064f4a-b7a4-43dc-a7ae-666516016ff9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":93,"target_disposition_id":"9d064f4a-b7a4-43dc-a7ae-666516016ff9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9e566b47-b128-4829-be12-12db17cf6a6e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":94,"target_disposition_id":"9e566b47-b128-4829-be12-12db17cf6a6e","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9f8f46c0-8bd8-40b0-9db4-ad2385e627eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":95,"target_disposition_id":"9f8f46c0-8bd8-40b0-9db4-ad2385e627eb","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fca4e94-2e40-4cea-866d-e1d92f0522e9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":96,"target_disposition_id":"9fca4e94-2e40-4cea-866d-e1d92f0522e9","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '9fdd3749-41e2-463a-a5f0-b10532868b96'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":97,"target_disposition_id":"9fdd3749-41e2-463a-a5f0-b10532868b96","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a1a745da-839f-4063-b862-8f3cee6f2bf1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":98,"target_disposition_id":"a1a745da-839f-4063-b862-8f3cee6f2bf1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a293b1f7-5082-4905-b9ee-186070e43684'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":99,"target_disposition_id":"a293b1f7-5082-4905-b9ee-186070e43684","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a32dcac7-76d4-497d-a425-c095858891e1'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'confirm_monitor_only'::text,
  'system_low_signal_100_batch_02_plan'::text,
  null::text,
  'MEE core 100-row low_signal_monitor batch 02 proof: confirm monitor_only remains internal only.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-100-BATCH-02-PLAN-V1","row_manifest_sha256":"e4193419f5e4e86aee1c673dc26c695495fc007ba1b8db94149b6ebac2717b11","batch_index":100,"target_disposition_id":"a32dcac7-76d4-497d-a425-c095858891e1","action_name":"confirm_monitor_only","plan_only_generated":true}'::jsonb
);

commit;
