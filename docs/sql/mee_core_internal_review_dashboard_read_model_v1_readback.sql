-- MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1 readback SQL.
-- Intended for use after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1_VIEW_READBACK'::text as package_id,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_queue_v1')::int as queue_view_count,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_status_summary_v1')::int as status_summary_view_count,
  count(*) filter (where table_name = 'v_market_evidence_review_dashboard_blocker_queue_v1')::int as blocker_queue_view_count
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'v_market_evidence_review_dashboard_queue_v1',
    'v_market_evidence_review_dashboard_status_summary_v1',
    'v_market_evidence_review_dashboard_blocker_queue_v1'
  );

select
  'MEE_CORE_INTERNAL_REVIEW_DASHBOARD_READ_MODEL_V1_QUEUE_READBACK'::text as package_id,
  dashboard_queue,
  count(*)::int as card_count,
  count(*) filter (where publication_gate_handoff_candidate)::int as handoff_candidate_count,
  count(*) filter (where publishable)::int as publishable_count,
  count(*) filter (where app_visible)::int as app_visible_count,
  count(*) filter (where market_truth)::int as market_truth_count
from public.v_market_evidence_review_dashboard_queue_v1
group by dashboard_queue
order by card_count desc, dashboard_queue;
