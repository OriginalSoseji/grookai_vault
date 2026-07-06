-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 no-op dry-run SQL.
-- This validates proposed remote objects after apply without invoking the function.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_NOOP_DRY_RUN'::text as package_id,
  count(*) filter (where p.proname = 'apply_market_evidence_review_action_v1')::int as function_count,
  (select count(*)::int from public.market_evidence_review_action_events) as action_event_rows_before_noop,
  (select count(*)::int from public.market_evidence_review_dispositions where publishable or app_visible or market_truth) as disposition_public_flag_rows,
  false::boolean as function_invoked,
  false::boolean as disposition_updates,
  false::boolean as action_event_inserts
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_market_evidence_review_action_v1';
