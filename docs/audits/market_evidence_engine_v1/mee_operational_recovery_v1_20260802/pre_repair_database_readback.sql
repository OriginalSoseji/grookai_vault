-- Read-only MEE operational-recovery baseline.

select
  c.relname as table_name,
  s.n_live_tup::bigint as estimated_live_rows,
  pg_total_relation_size(c.oid)::bigint as total_bytes,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  s.last_analyze,
  s.last_autoanalyze
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = 'public'
  and c.relname like 'market_listing_%'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc;

select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'market_listing_acquisition_runs',
    'market_listing_raw_snapshots',
    'market_listing_observations',
    'market_listing_price_events',
    'market_listing_card_candidates',
    'market_listing_rollups'
  )
order by tablename, indexname;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'market_listing_%'
  and c.relkind = 'r'
order by c.relname;

select
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename like 'market_listing_%'
order by tablename, policyname;

select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name like 'market_listing_%'
order by table_name, grantee, privilege_type;

select
  id,
  run_key,
  status,
  consumed_call_count,
  observed_listing_count,
  error_count,
  started_at,
  finished_at,
  created_at
from public.market_listing_acquisition_runs
order by created_at desc, id desc;
