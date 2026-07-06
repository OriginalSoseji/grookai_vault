-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 readback SQL.
-- Intended for use only after a separately approved targeted remote schema apply.

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_TABLE_READBACK'::text as package_id,
  count(*) filter (where table_name = 'market_evidence_review_action_events')::int as table_count
from information_schema.tables
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_COLUMN_READBACK'::text as package_id,
  count(*)::int as column_count
from information_schema.columns
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events';

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1_GRANT_READBACK'::text as package_id,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'market_evidence_review_action_events'
order by grantee, privilege_type;
