-- MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1 readback.
-- Read-only schema verification query for a future targeted remote apply.

select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'market_listing_candidate_cleanup_events',
    'v_market_listing_candidate_cleanup_current_v1',
    'v_market_listing_candidate_cleanup_card_summary_v1'
  )
order by table_name, ordinal_position;

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'market_listing_candidate_cleanup_events'
order by policyname;

select
  grantee,
  privilege_type,
  table_name
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'market_listing_candidate_cleanup_events',
    'v_market_listing_candidate_cleanup_current_v1',
    'v_market_listing_candidate_cleanup_card_summary_v1'
  )
order by table_name, grantee, privilege_type;

