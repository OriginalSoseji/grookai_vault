-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 rollback candidate.
-- Do not execute unless the approved tiny invoke apply has run and rollback is explicitly approved.
-- Restores the single target disposition row to the captured before-state and removes only the matching package-tagged action event.

begin;

delete from public.market_evidence_review_action_events
where disposition_id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid
  and action_name = 'confirm_monitor_only'
  and action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1'
  and action_payload ->> 'row_manifest_sha256' = '7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567'
returning id as deleted_action_event_id;

update public.market_evidence_review_dispositions
set
  review_status = 'resolved',
  review_disposition = 'monitor_only',
  review_actor = 'system_seed_plan',
  reviewed_at = null::timestamptz,
  review_payload = '{"lane_mapping_version":"MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SEED_MAPPING_V1","no_public_price_claim":true,"package_id":"MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1","source_view":"v_market_evidence_card_review_queue_v1"}'::jsonb,
  needs_review = true::boolean,
  publication_gate_candidate = false,
  can_publish_price_directly = false,
  publishable = false,
  app_visible = false,
  market_truth = false,
  updated_at = '2026-06-26 19:45:24.907445+00'::timestamptz
where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid
returning
  id,
  review_status,
  review_disposition,
  review_actor,
  reviewed_at,
  needs_review,
  updated_at;

commit;
