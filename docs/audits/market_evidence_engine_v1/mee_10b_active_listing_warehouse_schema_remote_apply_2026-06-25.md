# MEE-10B Active Listing Warehouse Schema Remote Apply

- Package: `MARKET-REFERENCE-ACTIVE-LISTING-WAREHOUSE-SCHEMA-V1`
- Scope: targeted remote schema apply only
- Linked project: `ycdxbpibncqcchqiihfz`
- Migration: `supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql`
- Migration hash: `9c3b473529416edf0798d510469e924b1b2da3229af960fd06de4954438ff807`
- Package fingerprint: `90dd41c35fe3bdeba555951963c57ad04b5970940d561adc3eedc3a23f22e7ab`
- Source backfill plan fingerprint: `7c9daf3aa23a5c366a12cc60add9c079d1a3e106c083f854d4551df4be0c1be0`

## Apply Proof

- Executed `supabase db query --linked -f supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql`
- Apply returned package id `MARKET_REFERENCE_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1_MIGRATION_CANDIDATE`
- Proposed table count: `0`
- Proposed index count: `0`
- Proposed new policy count: `0`
- Keeps existing service-role-only policies: `true`
- Keeps candidate `needs_review`: `true`
- Keeps candidate `can_publish_price_directly = false`: `true`
- Writes evidence backfill: `false`
- Writes pricing observations: `false`
- Writes eBay latest prices: `false`
- Publishes public prices: `false`
- Creates app-facing pricing view: `false`
- Creates price rollup: `false`

## Migration History

- Executed `supabase migration repair 20260625020000 --status applied --linked --yes`
- Repaired only migration version `20260625020000` as applied.
- Verified `20260625000000` remains applied.
- Verified `20260625010000` remains applied.
- Verified unrelated local-only migration `20260523183000` remains unapplied remotely.

## Remote Readback

- `market_reference_raw_snapshots_source_check` allows `tcgcsv_reference`, `pokemontcg_io_reference`, and `ebay_active`.
- `market_reference_raw_snapshots_object_type_check` allows `ebay_browse_item_summary` and `ebay_active_listing`.
- `market_reference_candidates_source_check` allows `tcgcsv_reference`, `pokemontcg_io_reference`, and `ebay_active`.
- `market_reference_candidates_source_type_check` allows `source_type = reference` only for reference sources and `source_type = active_listing` only for `ebay_active`.
- `market_reference_candidates_needs_review_check` remains `needs_review = true`.
- `market_reference_candidates_no_direct_publish_check` remains `can_publish_price_directly = false`.

## Row Count Proof

- `market_reference_candidates` rows with `source = ebay_active`: `0`
- `market_reference_raw_snapshots` rows with `source = ebay_active`: `0`
- `market_reference_normalized_evidence` rows with `source = ebay_active`: `0`

## Boundary

- No evidence backfill.
- No provider calls.
- No source fetches.
- No `pricing_observations` writes.
- No `ebay_active_prices_latest` writes.
- No public pricing views.
- No app-visible pricing.
- No price rollups.
- No identity-table writes.
- No vault writes.
- No image writes.
- No deletes.
- No merges.
- No `db push`.
- No global apply.
