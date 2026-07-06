# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1`
- Ready for apply approval: `false`
- Package fingerprint: `5ce5e8372a40031d58e10c8bdc9d322c89e7bcf3119df6f987f7b0dc4e28c0e3`
- Row manifest hash: `fe54018dae1c927eb38dab783ec5aae62cbb9a3ed38cab013670ba9d9fef2ce6`
- Source package fingerprint: `13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1`
- Request results manifest hash: `7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0`
- Raw snapshot manifest hash: `abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c`
- Projected observation manifest hash: `eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b`
- Fetch artifact: `docs/audits/market_evidence_engine_v1/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-06-26T04-31-22-318Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 0 |
| `market_listing_query_cache` | 0 |
| `market_listing_raw_snapshots` | 0 |
| `market_listing_observations` | 0 |
| `market_listing_seller_snapshots` | 0 |
| `market_listing_price_events` | 0 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Summary

```json
{
  "source_projected_observation_count": 23597,
  "deduped_observation_count": 0,
  "evidence_class_counts": {},
  "exclusion_flag_counts": {},
  "dedupe_summary": {
    "duplicate_raw_payload_rows_skipped": 0,
    "duplicate_seller_rows_skipped": 0
  }
}
```

## Apply Order

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_price_events`

## Boundary

- Plan only.
- No provider calls.
- No source fetches.
- No database writes.
- No public/app-visible pricing.
- No card candidate writes.
- No rollup writes.

## Findings

- package_fingerprint_mismatch
- request_results_manifest_hash_mismatch
- raw_snapshot_manifest_hash_mismatch
- projected_observation_manifest_hash_mismatch

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: 5ce5e8372a40031d58e10c8bdc9d322c89e7bcf3119df6f987f7b0dc4e28c0e3. Row manifest hash: fe54018dae1c927eb38dab783ec5aae62cbb9a3ed38cab013670ba9d9fef2ce6. Source package fingerprint: 13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1. Request results manifest hash: 7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0. Raw snapshot manifest hash: abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c. Projected observation manifest hash: eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 0 market_listing_acquisition_runs row, 0 market_listing_query_cache rows, 0 market_listing_raw_snapshots rows, 0 market_listing_observations rows, 0 market_listing_seller_snapshots rows, and 0 market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
