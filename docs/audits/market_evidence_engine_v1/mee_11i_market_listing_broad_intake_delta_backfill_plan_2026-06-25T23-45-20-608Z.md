# MEE-11I Market Listing Broad Intake Delta Backfill Plan

- Package: `MARKET-LISTING-BROAD-INTAKE-DELTA-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `18ab94acf87c0988f945871443edb3143e71295845e2f70631d29b2e915e55bd`
- Row manifest hash: `ad6d8e67e2fd01d7f2d283bb28b81d17ccd85e38ea4ccffdade22496473618b2`
- Source plan: `docs/audits/market_evidence_engine_v1/mee_11g_market_listing_broad_intake_backfill_plan_2026-06-25T23-40-27-740Z.json`

## Collision Handling

- Existing query cache rows reused: `5`
- Exact duplicate raw payload rows skipped: `4`
- Existing seller snapshots skipped: `3`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 0 |
| `market_listing_raw_snapshots` | 996 |
| `market_listing_observations` | 996 |
| `market_listing_seller_snapshots` | 409 |
| `market_listing_price_events` | 996 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Findings

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-BROAD-INTAKE-DELTA-BACKFILL-APPLY-V1 apply only. Package fingerprint: 18ab94acf87c0988f945871443edb3143e71295845e2f70631d29b2e915e55bd. Row manifest hash: ad6d8e67e2fd01d7f2d283bb28b81d17ccd85e38ea4ccffdade22496473618b2. Source plan fingerprint: d9b5463efbdfc41ad22c2b846911b937203a5273000c20dfc3bbc303c61a812c. Source row manifest hash: 6ab07f492e4e14091a8294eac94fb4c754cf4d13c825a1553c486ffaf07e6aeb. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 0 market_listing_query_cache rows, 996 market_listing_raw_snapshots rows, 996 market_listing_observations rows, 409 market_listing_seller_snapshots rows, and 996 market_listing_price_events rows from the MEE-11G 1,000-row broad intake plan, skipping already-present query cache rows and exact duplicate raw payload rows only. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
