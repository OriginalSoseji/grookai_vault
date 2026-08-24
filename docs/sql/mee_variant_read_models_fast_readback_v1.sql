-- Lightweight structural readback for nightly operation.
-- Full aggregate view scans belong to the separate warehouse audit.

select
  viewname,
  (definition ilike '%false as publishable%') as publishable_boundary_present,
  (definition ilike '%false as app_visible%') as app_visible_boundary_present,
  (definition ilike '%false as market_truth%') as market_truth_boundary_present
from pg_views
where schemaname = 'public'
  and viewname in (
    'v_market_reference_variant_signal_rollups_v1',
    'v_market_listing_variant_active_ask_rollups_v1',
    'v_market_listing_variant_query_targets_v1'
  )
order by viewname;

select
  c.relname as source_table,
  coalesce(s.n_live_tup, 0)::bigint as estimated_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname = 'public'
  and c.relname in (
    'market_reference_normalized_evidence',
    'market_evidence_variant_assignments',
    'market_listing_card_candidates',
    'market_listing_observations'
  )
order by c.relname;
