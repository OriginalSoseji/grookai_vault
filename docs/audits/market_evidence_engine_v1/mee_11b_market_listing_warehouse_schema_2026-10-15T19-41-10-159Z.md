# MEE-11B Market Listing Warehouse Schema Candidate

- Package: `MARKET-LISTING-WAREHOUSE-SCHEMA-V1`
- Ready: `true`
- Applied: `false`
- Migration hash: `2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4`
- Package fingerprint: `8d8f44b084cb19b4d6af42f3e94fed2f2244de710c946b8f1cc6c87fd0f67451`
- Migration path: `supabase/migrations/20260625050000_market_listing_warehouse_v1.sql`

## Scope

- Creates internal-only `market_listing_*` warehouse tables.
- Stores eBay active listing asking-price evidence.
- Keeps candidates and rollups review-only.
- Adds service-role-only RLS policies.
- No remote migration apply in this step.

## Proposed Tables

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_card_candidates`
- `market_listing_price_events`
- `market_listing_rollups`

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-WAREHOUSE-SCHEMA-V1 TARGETED-REMOTE-SCHEMA-APPLY only. Migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Package fingerprint: 8d8f44b084cb19b4d6af42f3e94fed2f2244de710c946b8f1cc6c87fd0f67451. Scope: execute supabase/migrations/20260625050000_market_listing_warehouse_v1.sql against linked Supabase project ycdxbpibncqcchqiihfz only, creating 8 internal-only market_listing_* warehouse tables, 15 supporting indexes, RLS enablement, and service-role-only policies for ebay_active asking-price evidence. Then mark only migration version 20260625050000 as applied in Supabase migration history. No evidence backfill. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No db push. No global apply.
```
