-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 readback SQL.
-- Run after approved apply.

with targets(id) as (
  values
    ('0557fe1f-212b-45a5-a3ef-8265d6e7f3b5'::uuid),
    ('b94cc8a7-5859-4559-81cf-28a99ed60257'::uuid),
    ('08aa507e-9ffb-42ad-8c77-18bec00de6f9'::uuid),
    ('1b54321f-b536-4184-a605-9024dce0ed2d'::uuid),
    ('da73c945-65f1-496f-8fc1-8e76691cb627'::uuid),
    ('a9699af4-23f8-4d95-850e-833d12b09fec'::uuid),
    ('12e582fc-5604-4daa-9d70-4f2f5670e63a'::uuid),
    ('8c3cd3f0-4a2a-45bc-b496-54807fd1fad2'::uuid),
    ('bec8316b-4fde-4ca1-a070-a87cbcbf661c'::uuid),
    ('8cf2dfa3-2485-417d-bfa3-c9840f462af9'::uuid),
    ('a2775745-d618-43d7-bc23-05723c79697a'::uuid),
    ('d51bd0ce-daae-4bf3-8b3a-cb871009f2e7'::uuid),
    ('8a20261a-6d6d-4eb4-ad4e-d1aed21f7b99'::uuid),
    ('ddc0d3ed-c659-41cb-85b5-d227cd28636e'::uuid),
    ('e0b68971-9810-4567-9e45-daea362200eb'::uuid),
    ('7d1a3cf2-fdfa-47be-857e-8405e3efec8e'::uuid),
    ('c47e4179-16fe-41d5-b90e-7b3293c2fbe3'::uuid),
    ('12ccab57-fa3b-4147-8015-c6fa922ce263'::uuid),
    ('1c766474-acf4-4608-831c-d0c788538b22'::uuid)
), package_events as (
  select e.*
  from public.market_evidence_review_action_events e
  join targets t on t.id = e.disposition_id
  where e.action_name = 'request_reclassification'
    and e.action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1'
    and e.action_payload ->> 'row_manifest_sha256' = '87f6a9b6e8cd8f33e2362f6e4a3c4a6ac1e2619214d7f6a6513f9ac155c4e3fc'
), target_dispositions as (
  select d.*
  from public.market_evidence_review_dispositions d
  join targets t on t.id = d.id
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1_READBACK'::text as package_id,
  19::int as expected_target_rows,
  (select count(*)::int from package_events) as matching_action_event_rows,
  (select count(distinct disposition_id)::int from package_events) as distinct_event_disposition_rows,
  (select count(*)::int from target_dispositions where needs_review = false and review_actor = 'system_classification_review_action_plan' and review_status = 'blocked' and review_disposition = 'review_reclassify') as updated_target_rows,
  (select count(*)::int from package_events where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as event_public_flag_rows,
  (select count(*)::int from target_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as target_public_flag_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions d where d.review_lane = 'classification_review' and d.review_status = 'pending' and d.review_disposition = 'review_pending_classification_fix' and d.needs_review = true) as remaining_pending_classification_review_rows;
