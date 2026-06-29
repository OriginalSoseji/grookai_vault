-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1 readback SQL.
-- Use after an explicitly approved tiny invoke apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_EVENT_READBACK'::text as package_id,
  count(*)::int as matching_action_event_rows
from public.market_evidence_review_action_events
where disposition_id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid
  and action_name = 'confirm_monitor_only'
  and action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1'
  and action_payload ->> 'row_manifest_sha256' = '7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_DISPOSITION_READBACK'::text as package_id,
  id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  review_actor,
  needs_review,
  publication_gate_candidate,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth
from public.market_evidence_review_dispositions
where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_TINY_INVOKE_PLAN_V1_BOUNDARY_READBACK'::text as package_id,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_action_events%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid and (publishable or app_visible or market_truth)) as target_public_flag_rows;
