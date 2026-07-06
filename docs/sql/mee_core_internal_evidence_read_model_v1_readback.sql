-- MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1 readback plan.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1_READBACK'::text as package_id,
  count(*) filter (where table_name = 'v_market_evidence_card_signal_summary_v1')::int as signal_summary_view_count,
  count(*) filter (where table_name = 'v_market_evidence_card_review_queue_v1')::int as review_queue_view_count
from information_schema.views
where table_schema = 'public'
  and table_name in (
    'v_market_evidence_card_signal_summary_v1',
    'v_market_evidence_card_review_queue_v1'
  );

select
  'MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1_GRANTS'::text as package_id,
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'v_market_evidence_card_signal_summary_v1',
    'v_market_evidence_card_review_queue_v1'
  )
order by table_name, grantee, privilege_type;

select
  'MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1_SIGNAL_SAMPLE'::text as package_id,
  count(*)::int as card_signal_rows,
  count(*) filter (where publishable)::int as publishable_rows,
  count(*) filter (where app_visible)::int as app_visible_rows,
  count(*) filter (where market_truth)::int as market_truth_rows
from public.v_market_evidence_card_signal_summary_v1;

select
  'MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_SCHEMA_CANDIDATE_V1_REVIEW_SAMPLE'::text as package_id,
  review_lane,
  count(*)::int as card_count
from public.v_market_evidence_card_review_queue_v1
group by review_lane
order by card_count desc, review_lane;
