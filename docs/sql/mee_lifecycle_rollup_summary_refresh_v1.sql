-- MEE-LIFECYCLE-ROLLUP-SUMMARY-REFRESH-V1
-- Internal derived read-model refresh for publication-gate review.
-- No provider calls, no public pricing, no app-visible pricing, no price rollups.

refresh materialized view public.mv_market_evidence_lifecycle_rollup_summary_v1;

select
  'MEE-LIFECYCLE-ROLLUP-SUMMARY-REFRESH-V1'::text as package_id,
  count(*)::bigint as summary_rows,
  max(refreshed_at) as refreshed_at,
  count(*) filter (where lifecycle_public_boundary_leaks > 0)::bigint as lifecycle_public_boundary_leak_cards,
  false::boolean as provider_calls,
  false::boolean as source_fetches,
  false::boolean as pricing_observations_writes,
  false::boolean as ebay_active_prices_latest_writes,
  false::boolean as public_pricing_views,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollups,
  false::boolean as identity_writes,
  false::boolean as vault_writes,
  false::boolean as image_storage_writes
from public.mv_market_evidence_lifecycle_rollup_summary_v1;
