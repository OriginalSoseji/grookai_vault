-- MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1 readback SQL.
-- Read-only validation queries for the internal review action workflow plan.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_DISPOSITION_STATUS'::text as package_id,
  review_status,
  review_disposition,
  count(*)::int as row_count,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.market_evidence_review_dispositions
group by review_status, review_disposition
order by row_count desc, review_status, review_disposition;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_DASHBOARD_QUEUES'::text as package_id,
  dashboard_queue,
  count(*)::int as row_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_rows,
  count(*) filter (where publishable or app_visible or market_truth)::int as public_flag_rows
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue
order by row_count desc, dashboard_queue;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1_BOUNDARY'::text as package_id,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%market_evidence_review%') as public_pricing_view_references,
  (select count(*)::int from public.market_evidence_review_dispositions where publication_gate_candidate or can_publish_price_directly or publishable or app_visible or market_truth) as disposition_public_flag_rows,
  (select count(*)::int from public.v_market_evidence_review_dashboard_queue_v1 where publishable or app_visible or market_truth) as dashboard_public_flag_rows;
