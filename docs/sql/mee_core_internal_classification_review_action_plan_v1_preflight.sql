-- MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1 preflight SQL.
-- Must return eligible_target_rows = expected_target_rows before apply.

with targets(id, expected_updated_at) as (
  values
    ('0557fe1f-212b-45a5-a3ef-8265d6e7f3b5'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('b94cc8a7-5859-4559-81cf-28a99ed60257'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('08aa507e-9ffb-42ad-8c77-18bec00de6f9'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1b54321f-b536-4184-a605-9024dce0ed2d'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('da73c945-65f1-496f-8fc1-8e76691cb627'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('a9699af4-23f8-4d95-850e-833d12b09fec'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('12e582fc-5604-4daa-9d70-4f2f5670e63a'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('8c3cd3f0-4a2a-45bc-b496-54807fd1fad2'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('bec8316b-4fde-4ca1-a070-a87cbcbf661c'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('8cf2dfa3-2485-417d-bfa3-c9840f462af9'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('a2775745-d618-43d7-bc23-05723c79697a'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('d51bd0ce-daae-4bf3-8b3a-cb871009f2e7'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('8a20261a-6d6d-4eb4-ad4e-d1aed21f7b99'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('ddc0d3ed-c659-41cb-85b5-d227cd28636e'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('e0b68971-9810-4567-9e45-daea362200eb'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('7d1a3cf2-fdfa-47be-857e-8405e3efec8e'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('c47e4179-16fe-41d5-b90e-7b3293c2fbe3'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('12ccab57-fa3b-4147-8015-c6fa922ce263'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('1c766474-acf4-4608-831c-d0c788538b22'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz)
)
select
  'MEE_CORE_INTERNAL_CLASSIFICATION_REVIEW_ACTION_PLAN_V1_PREFLIGHT'::text as package_id,
  19::int as expected_target_rows,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
where d.review_lane = 'classification_review'
  and d.evidence_lane = 'classification_blocked'
  and d.review_status = 'pending'
  and d.review_disposition = 'review_pending_classification_fix'
  and d.needs_review = true
  and d.publication_gate_candidate = false
  and d.can_publish_price_directly = false
  and d.publishable = false
  and d.app_visible = false
  and d.market_truth = false
  and not exists (
    select 1
    from public.market_evidence_review_action_events e
    where e.disposition_id = d.id
      and e.action_name = 'request_reclassification'
      and e.action_payload ->> 'package_id' = 'MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-ACTION-PLAN-V1'
  );
