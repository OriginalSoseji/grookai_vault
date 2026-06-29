-- MARKET_REFERENCE_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1 migration candidate.
-- Purpose: extend internal market_reference_* warehouse constraints for reviewed active-listing evidence.
-- Boundary: no evidence backfill, no pricing_observations writes, no ebay_active_prices_latest writes,
-- no public pricing views, no price rollups, and no app-visible pricing.
-- This is a local migration candidate, not a remote-applied migration.

begin;

alter table public.market_reference_raw_snapshots
  drop constraint if exists market_reference_raw_snapshots_source_check;

alter table public.market_reference_raw_snapshots
  add constraint market_reference_raw_snapshots_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference', 'ebay_active')
  );

alter table public.market_reference_raw_snapshots
  drop constraint if exists market_reference_raw_snapshots_object_type_check;

alter table public.market_reference_raw_snapshots
  add constraint market_reference_raw_snapshots_object_type_check check (
    source_object_type in (
      'tcgcsv_group_products',
      'tcgcsv_group_prices',
      'tcgcsv_product',
      'tcgcsv_price_row',
      'pokemontcg_card',
      'ebay_browse_item_summary',
      'ebay_active_listing'
    )
  );

alter table public.market_reference_candidates
  drop constraint if exists market_reference_candidates_source_check;

alter table public.market_reference_candidates
  add constraint market_reference_candidates_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference', 'ebay_active')
  );

alter table public.market_reference_candidates
  drop constraint if exists market_reference_candidates_source_type_check;

alter table public.market_reference_candidates
  add constraint market_reference_candidates_source_type_check check (
    (
      source in ('tcgcsv_reference', 'pokemontcg_io_reference')
      and source_type = 'reference'
    )
    or (
      source = 'ebay_active'
      and source_type = 'active_listing'
    )
  );

select
  'MARKET_REFERENCE_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1_MIGRATION_CANDIDATE'::text as package_id,
  0::int as proposed_table_count,
  0::int as proposed_index_count,
  0::int as proposed_new_policy_count,
  true::boolean as keeps_existing_service_role_only_policies,
  true::boolean as keeps_candidates_needs_review,
  true::boolean as keeps_candidates_no_direct_publish,
  false::boolean as writes_evidence_backfill,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as publishes_public_prices,
  false::boolean as creates_app_facing_pricing_view,
  false::boolean as creates_price_rollup;

commit;
