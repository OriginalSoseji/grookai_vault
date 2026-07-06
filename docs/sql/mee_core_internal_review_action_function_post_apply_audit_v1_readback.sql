-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1 readback SQL.
-- Read-only audit for the first tiny review action invocation.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_EVENT'::text as package_id,
  *
from public.market_evidence_review_action_events
where id = 'b706c331-ae67-4a46-8098-90d219987a42'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_DISPOSITION'::text as package_id,
  *
from public.market_evidence_review_dispositions
where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_DASHBOARD'::text as package_id,
  *
from public.v_market_evidence_review_dashboard_queue_v1
where disposition_id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_POST_APPLY_AUDIT_V1_BOUNDARY'::text as package_id,
  (select count(*)::int from public.market_evidence_review_action_events where action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-TINY-INVOKE-PLAN-V1' and action_payload ->> 'row_manifest_sha256' = '7e0f32364a157e981ec5f4d31f97cb153960f069be4b9a37d226370eaa01d567') as package_event_rows,
  (select count(*)::int from public.market_evidence_review_dispositions where id = '008c3618-9ee5-4ba0-8e60-e829d67f0002'::uuid and (publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth)) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review_action%') as public_pricing_view_references;
