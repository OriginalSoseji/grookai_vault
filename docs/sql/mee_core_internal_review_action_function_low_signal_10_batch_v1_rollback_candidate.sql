-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_PLAN_V1 rollback candidate.
-- Do not execute unless the approved 10-row apply has run and rollback is explicitly approved.
-- Restores the captured before-state and removes only matching package-tagged action events.

begin;

delete from public.market_evidence_review_action_events
where disposition_id in ('00b58c53-3228-4bfd-a55b-2c16ec1be124'::uuid, '01296bdf-16f7-4e2d-839b-a110993ca257'::uuid, '022501fd-56d0-4873-8ed4-e66a9ee404bd'::uuid, '0251b0b3-1bf9-4020-90ec-bafd66c95ef4'::uuid, '03d769b0-1fa7-4b34-be98-5fa4db2e766a'::uuid, '0450f3e0-ffb3-47e2-959c-066ef72cd1f5'::uuid, '0489c268-59ae-472d-97a9-17fc3983deac'::uuid, '04f4b24b-c685-4451-9206-5aed2c6eafae'::uuid, '05b52775-4f83-45c8-a6bc-eacdaa03b3e2'::uuid, '06009615-630b-4ac4-947f-6be2e8db0e3f'::uuid)
  and action_name = 'confirm_monitor_only'
  and action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1'
  and action_payload ->> 'row_manifest_sha256' = '14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2'
returning id as deleted_action_event_id;

with before_rows(id, updated_at, review_status, review_disposition, review_actor, reviewed_at, review_payload, needs_review) as (
  values
    ('00b58c53-3228-4bfd-a55b-2c16ec1be124'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('01296bdf-16f7-4e2d-839b-a110993ca257'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('022501fd-56d0-4873-8ed4-e66a9ee404bd'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('0251b0b3-1bf9-4020-90ec-bafd66c95ef4'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('03d769b0-1fa7-4b34-be98-5fa4db2e766a'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('0450f3e0-ffb3-47e2-959c-066ef72cd1f5'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('0489c268-59ae-472d-97a9-17fc3983deac'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('04f4b24b-c685-4451-9206-5aed2c6eafae'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('05b52775-4f83-45c8-a6bc-eacdaa03b3e2'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean),
    ('06009615-630b-4ac4-947f-6be2e8db0e3f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz, 'resolved'::text, 'monitor_only'::text, 'system_seed_plan'::text, null::timestamptz, '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb, true::boolean)
)
update public.market_evidence_review_dispositions d
set
  review_status = before_rows.review_status,
  review_disposition = before_rows.review_disposition,
  review_actor = before_rows.review_actor,
  reviewed_at = before_rows.reviewed_at,
  review_payload = before_rows.review_payload,
  needs_review = before_rows.needs_review,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = before_rows.updated_at
from before_rows
where d.id = before_rows.id
returning
  d.id,
  d.review_status,
  d.review_disposition,
  d.review_actor,
  d.reviewed_at,
  d.needs_review,
  d.updated_at;

commit;
