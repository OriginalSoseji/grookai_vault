# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44`
- Row manifest hash: `92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a`
- Source package fingerprint: `58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a`
- Request results manifest hash: `69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c`
- Raw snapshot manifest hash: `27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a`
- Projected observation manifest hash: `85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a`
- Fetch artifact: `docs/audits/market_evidence_engine_v1/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-06-26T00-30-41-288Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 4000 |
| `market_listing_raw_snapshots` | 129665 |
| `market_listing_observations` | 129665 |
| `market_listing_seller_snapshots` | 23856 |
| `market_listing_price_events` | 129665 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Summary

```json
{
  "source_projected_observation_count": 168744,
  "deduped_observation_count": 129665,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 21065,
    "raw_single": 75918,
    "slab": 32682
  },
  "exclusion_flag_counts": {
    "bulk": 75,
    "choose_your_card": 3229,
    "code_card": 18,
    "complete_set": 537,
    "custom_fake": 141,
    "foreign_language": 18137,
    "jumbo": 319,
    "lot": 4297,
    "menu_listing": 795,
    "minimum_order": 353,
    "proxy_custom": 24,
    "sealed": 3077,
    "sleeve_accessory": 221
  },
  "dedupe_summary": {
    "duplicate_raw_payload_rows_skipped": 39079,
    "duplicate_seller_rows_skipped": 105809
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: 2ebd59a1c8b56e8f613ebd7c5a616a82c655bb0b2eed9899b71d309ba2226c44. Row manifest hash: 92b002b5831f77b75c4ede1445a5dd2993bbee7df1a41ae78f83b539b185704a. Source package fingerprint: 58975dc5090431a83ca4b513fa3d8be97fc182c541580d796a63260a4808514a. Request results manifest hash: 69f37f83fad3afffd897c7b3fee45fd53d070ad16ac1c07408b83eaca47bad0c. Raw snapshot manifest hash: 27cf71b55eebc84ce5444871435bee61dfafdd7fd17fe1a6182a9628bfec131a. Projected observation manifest hash: 85abe190326dadf92ccbccd041ef4e76043a984868c468f337660b6630247a2a. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 4000 market_listing_query_cache rows, 129665 market_listing_raw_snapshots rows, 129665 market_listing_observations rows, 23856 market_listing_seller_snapshots rows, and 129665 market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
