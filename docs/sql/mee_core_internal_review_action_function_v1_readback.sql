-- MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1 readback SQL.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_FUNCTION_READBACK'::text as package_id,
  count(*) filter (where p.proname = 'apply_market_evidence_review_action_v1')::int as function_count
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'apply_market_evidence_review_action_v1';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_GRANT_READBACK'::text as package_id,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'apply_market_evidence_review_action_v1'
order by grantee, privilege_type;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_FUNCTION_SCHEMA_CANDIDATE_V1_BOUNDARY_READBACK'::text as package_id,
  (select count(*)::int from public.market_evidence_review_action_events) as action_event_rows,
  (select count(*)::int from public.pricing_observations) as pricing_observations_count,
  (select count(*)::int from pg_views where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1' and definition ilike '%apply_market_evidence_review_action%') as public_pricing_view_references;
