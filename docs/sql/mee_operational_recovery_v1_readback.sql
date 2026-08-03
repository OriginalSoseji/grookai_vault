-- Read-only verification for MEE operational recovery V1.

select
  to_regclass('public.market_listing_observations_run_id_idx') is not null
    as observations_run_index_exists,
  to_regclass('public.market_listing_seller_snapshots_run_id_idx') is not null
    as seller_snapshots_run_index_exists,
  to_regclass('public.market_listing_card_candidates_observation_idx') is not null
    as candidates_observation_index_exists,
  to_regclass('public.market_listing_price_events_observation_idx') is not null
    as price_events_observation_index_exists,
  to_regclass('public.market_listing_acquisition_cursor_events') is not null
    as cursor_table_exists,
  to_regclass('public.v_market_listing_acquisition_cursor_latest_v1') is not null
    as cursor_view_exists;

select
  c.relname,
  c.relrowsecurity,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_select,
  has_table_privilege('service_role', c.oid, 'select') as service_role_select,
  has_table_privilege('service_role', c.oid, 'insert') as service_role_insert
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'market_listing_acquisition_cursor_events';

select
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
  and tablename = 'market_listing_acquisition_cursor_events'
order by policyname;

select count(*) as cursor_event_count
from public.market_listing_acquisition_cursor_events;

select version
from supabase_migrations.schema_migrations
where version in ('20260712090000', '20260803010000', '20260803020000')
order by version;
