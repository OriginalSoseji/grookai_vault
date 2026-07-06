# MEE-11C Market Listing Warehouse Remote Schema Apply

- Package: `MARKET-LISTING-WAREHOUSE-SCHEMA-V1`
- Applied: `true`
- Linked Supabase project: `ycdxbpibncqcchqiihfz`
- Migration version marked applied: `20260625050000`
- Migration file: `supabase/migrations/20260625050000_market_listing_warehouse_v1.sql`
- Migration hash: `2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4`
- Package fingerprint: `8d8f44b084cb19b4d6af42f3e94fed2f2244de710c946b8f1cc6c87fd0f67451`

## Scope Applied

Created eight internal-only `market_listing_*` warehouse tables:

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_card_candidates`
- `market_listing_price_events`
- `market_listing_rollups`

Created 15 supporting indexes, enabled RLS on all eight tables, and created service-role-only policies for all eight tables.

## Apply Result

The migration returned the expected boundary row:

```text
package_id: MARKET_LISTING_WAREHOUSE_V1_MIGRATION_CANDIDATE
proposed_table_count: 8
proposed_index_count: 15
proposed_service_role_policy_count: 8
active_listings_are_asking_price_only: true
creates_public_surface: false
creates_app_visible_rows: false
creates_external_fetch_job: false
changes_identity_rows: false
changes_vault_rows: false
changes_image_rows: false
```

## Readback Proof

Remote table readback returned all eight `market_listing_*` tables.

Remote policy readback returned one service-role-only policy for each table.

Remote migration history readback returned:

```text
version: 20260625050000
name: market_listing_warehouse_v1
```

Remote zero-row readback confirmed all eight tables had `row_count = 0`.

## Blocked Writes Preserved

No evidence backfill, provider calls, source fetches, `pricing_observations` writes, `ebay_active_prices_latest` writes, public pricing views, app-visible pricing, public price rollups, identity-table writes, vault writes, image writes, deletes, merges, `db push`, or global apply were executed.
