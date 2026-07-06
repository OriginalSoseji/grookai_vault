-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 apply candidate.
-- Do not execute without explicit approval.
-- Scope when approved: invoke public.apply_market_evidence_review_action_v1 for classification_review rows only.

begin;

select *
from public.apply_market_evidence_review_action_v1(
  '0557fe1f-212b-45a5-a3ef-8265d6e7f3b5'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":1,"target_disposition_id":"0557fe1f-212b-45a5-a3ef-8265d6e7f3b5","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'b94cc8a7-5859-4559-81cf-28a99ed60257'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":2,"target_disposition_id":"b94cc8a7-5859-4559-81cf-28a99ed60257","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '08aa507e-9ffb-42ad-8c77-18bec00de6f9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":3,"target_disposition_id":"08aa507e-9ffb-42ad-8c77-18bec00de6f9","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1b54321f-b536-4184-a605-9024dce0ed2d'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":4,"target_disposition_id":"1b54321f-b536-4184-a605-9024dce0ed2d","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'da73c945-65f1-496f-8fc1-8e76691cb627'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":5,"target_disposition_id":"da73c945-65f1-496f-8fc1-8e76691cb627","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a9699af4-23f8-4d95-850e-833d12b09fec'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":6,"target_disposition_id":"a9699af4-23f8-4d95-850e-833d12b09fec","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '12e582fc-5604-4daa-9d70-4f2f5670e63a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":7,"target_disposition_id":"12e582fc-5604-4daa-9d70-4f2f5670e63a","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8c3cd3f0-4a2a-45bc-b496-54807fd1fad2'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":8,"target_disposition_id":"8c3cd3f0-4a2a-45bc-b496-54807fd1fad2","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'bec8316b-4fde-4ca1-a070-a87cbcbf661c'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":9,"target_disposition_id":"bec8316b-4fde-4ca1-a070-a87cbcbf661c","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8cf2dfa3-2485-417d-bfa3-c9840f462af9'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":10,"target_disposition_id":"8cf2dfa3-2485-417d-bfa3-c9840f462af9","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'a2775745-d618-43d7-bc23-05723c79697a'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":11,"target_disposition_id":"a2775745-d618-43d7-bc23-05723c79697a","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'd51bd0ce-daae-4bf3-8b3a-cb871009f2e7'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":12,"target_disposition_id":"d51bd0ce-daae-4bf3-8b3a-cb871009f2e7","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '8a20261a-6d6d-4eb4-ad4e-d1aed21f7b99'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":13,"target_disposition_id":"8a20261a-6d6d-4eb4-ad4e-d1aed21f7b99","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'ddc0d3ed-c659-41cb-85b5-d227cd28636e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":14,"target_disposition_id":"ddc0d3ed-c659-41cb-85b5-d227cd28636e","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'e0b68971-9810-4567-9e45-daea362200eb'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":15,"target_disposition_id":"e0b68971-9810-4567-9e45-daea362200eb","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '7d1a3cf2-fdfa-47be-857e-8405e3efec8e'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":16,"target_disposition_id":"7d1a3cf2-fdfa-47be-857e-8405e3efec8e","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  'c47e4179-16fe-41d5-b90e-7b3293c2fbe3'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":17,"target_disposition_id":"c47e4179-16fe-41d5-b90e-7b3293c2fbe3","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '12ccab57-fa3b-4147-8015-c6fa922ce263'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":18,"target_disposition_id":"12ccab57-fa3b-4147-8015-c6fa922ce263","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

select *
from public.apply_market_evidence_review_action_v1(
  '1c766474-acf4-4608-831c-d0c788538b22'::uuid,
  '2026-06-26 19:45:24.907445+00'::timestamptz,
  'request_reclassification'::text,
  'system_classification_review_action_plan'::text,
  'classification_noise'::text,
  'MEE core classification review action plan: classifier could not safely assign raw_single/slab; request reclassification before rollup.'::text,
  '{"package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1","row_manifest_sha256":"87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc","source_package_id":"MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1","source_row_manifest_sha256":"a0be470bf1461ec01926b410806c4ca2f75905a82d26d367d3a28d7ae00c8205","row_index":19,"target_disposition_id":"1c766474-acf4-4608-831c-d0c788538b22","action_name":"request_reclassification","plan_only_generated":true}'::jsonb
);

commit;
