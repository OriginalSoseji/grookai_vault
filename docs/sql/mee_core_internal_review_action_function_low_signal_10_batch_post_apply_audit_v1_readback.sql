-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_POST_APPLY_AUDIT_V1 readback SQL.
-- Read-only audit for the 10-row low_signal_monitor review action batch.

with target_ids(id) as (
  values
    ('00b58c53-3228-4bfd-a55b-2c16ec1be124'::uuid),
    ('01296bdf-16f7-4e2d-839b-a110993ca257'::uuid),
    ('022501fd-56d0-4873-8ed4-e66a9ee404bd'::uuid),
    ('0251b0b3-1bf9-4020-90ec-bafd66c95ef4'::uuid),
    ('03d769b0-1fa7-4b34-be98-5fa4db2e766a'::uuid),
    ('0450f3e0-ffb3-47e2-959c-066ef72cd1f5'::uuid),
    ('0489c268-59ae-472d-97a9-17fc3983deac'::uuid),
    ('04f4b24b-c685-4451-9206-5aed2c6eafae'::uuid),
    ('05b52775-4f83-45c8-a6bc-eacdaa03b3e2'::uuid),
    ('06009615-630b-4ac4-947f-6be2e8db0e3f'::uuid)
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join target_ids t on t.id = e.disposition_id
  where e.action_name = 'confirm_monitor_only'
    and e.action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-10-BATCH-PLAN-V1'
    and e.action_payload ->> 'row_manifest_sha256' = '14d19b34bb6fa775fa2ebdda06be89ace28ec2b817955e9df2194b172664fab2'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join target_ids t on t.id = d.id
), target_dashboard as (
  select q.*
  from public.v_market_evidence_review_dashboard_queue_v1 q
  join target_ids t on t.id = q.disposition_id
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_POST_APPLY_AUDIT_V1'::text as package_id,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = 'system_low_signal_10_batch_plan' and review_status = 'resolved' and review_disposition = 'monitor_only') as updated_target_rows,
  (select count(*)::int from target_dashboard where needs_review = false) as dashboard_updated_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as disposition_public_flag_rows,
  (select count(*)::int from target_dashboard where publication_gate_handoff_candidate or publishable or app_visible or market_truth) as dashboard_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references;
