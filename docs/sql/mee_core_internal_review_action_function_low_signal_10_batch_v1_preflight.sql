-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_PLAN_V1 preflight SQL.
-- Read-only. Use immediately before any approved apply to verify all optimistic-lock targets still match.

with targets(id, expected_updated_at) as (
  values
    ('00b58c53-3228-4bfd-a55b-2c16ec1be124'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('01296bdf-16f7-4e2d-839b-a110993ca257'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('022501fd-56d0-4873-8ed4-e66a9ee404bd'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0251b0b3-1bf9-4020-90ec-bafd66c95ef4'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('03d769b0-1fa7-4b34-be98-5fa4db2e766a'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0450f3e0-ffb3-47e2-959c-066ef72cd1f5'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('0489c268-59ae-472d-97a9-17fc3983deac'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('04f4b24b-c685-4451-9206-5aed2c6eafae'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('05b52775-4f83-45c8-a6bc-eacdaa03b3e2'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz),
    ('06009615-630b-4ac4-947f-6be2e8db0e3f'::uuid, '2026-06-26 19:45:24.907445+00'::timestamptz)
)
select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_LOW_SIGNAL_10_BATCH_PLAN_V1_PREFLIGHT'::text as package_id,
  count(*)::int as eligible_target_rows
from targets
join public.market_evidence_review_dispositions d
  on d.id = targets.id
 and d.updated_at is not distinct from targets.expected_updated_at
where d.review_lane = 'low_signal_monitor'
  and d.review_status = 'resolved'
  and d.review_disposition = 'monitor_only'
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
      and e.action_name = 'confirm_monitor_only'
  );
