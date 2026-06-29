# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `11b14f9fbb899364261e53a12333498591861365eabaa13891ae5645ec055647`
- Row manifest hash: `ecc5cc2591660e4016c4f6bcd4d6c026517c960623eb3bbfeed7bdfddd80d219`
- Source package fingerprint: `13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1`
- Request results manifest hash: `7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0`
- Raw snapshot manifest hash: `abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c`
- Projected observation manifest hash: `eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b`
- Fetch artifact: `docs/audits/market_evidence_engine_v1/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-06-26T04-31-22-318Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 3000 |
| `market_listing_raw_snapshots` | 16075 |
| `market_listing_observations` | 16075 |
| `market_listing_seller_snapshots` | 5452 |
| `market_listing_price_events` | 16075 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Summary

```json
{
  "source_projected_observation_count": 23597,
  "deduped_observation_count": 16075,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 1647,
    "raw_single": 8978,
    "slab": 5450
  },
  "exclusion_flag_counts": {
    "bulk": 4,
    "choose_your_card": 207,
    "code_card": 2,
    "complete_set": 18,
    "custom_fake": 5,
    "foreign_language": 1047,
    "jumbo": 12,
    "lot": 816,
    "menu_listing": 37,
    "minimum_order": 9,
    "proxy_custom": 1,
    "sealed": 117,
    "sleeve_accessory": 23
  },
  "dedupe_summary": {
    "duplicate_raw_payload_rows_skipped": 7522,
    "duplicate_seller_rows_skipped": 10623
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

- none

## Next Approval Prompt

```text
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: 11b14f9fbb899364261e53a12333498591861365eabaa13891ae5645ec055647. Row manifest hash: ecc5cc2591660e4016c4f6bcd4d6c026517c960623eb3bbfeed7bdfddd80d219. Source package fingerprint: 13b6d732a3efeda0b479eb74e4092346ab640e0aaf7702271f628940928eefb1. Request results manifest hash: 7c7f6dee0e840a68bb2c3c9f212f856134c2bbf8dfc9d10339b1f147c1675dd0. Raw snapshot manifest hash: abfaec2549feefbbbf1fc0dbe8e731b08267f1668feb1a707c7ef26ca29dd04c. Projected observation manifest hash: eac6fdb2bbe3b2f0e058fb99e2a8a5121e74858327439924be9be16226cf0f9b. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 3000 market_listing_query_cache rows, 16075 market_listing_raw_snapshots rows, 16075 market_listing_observations rows, 5452 market_listing_seller_snapshots rows, and 16075 market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
