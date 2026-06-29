# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `8a794ce81eed48429e4a507a04a92ddcc2e1c453b4290e5068448363dd3f5901`
- Row manifest hash: `aecf4a4508aefda751895004c907892125243f65f36a0b1404e71e9a47f89276`
- Source package fingerprint: `73719b843d31ec09bebd4bdbfb42393971c369dbae92596a8bba45e6301f2e50`
- Request results manifest hash: `f6118dc396d52954550dd843420fa2b70592a15c69fe000e5c073b94c937ae34`
- Raw snapshot manifest hash: `8b6751bff04cd2ed7030d0603b16d9e62d318c6f290fd6fb495700e5b8ecc788`
- Projected observation manifest hash: `84c59dd0af4a0b0bc2cb7705474f5359f10d91e2d44d7e980a3142b279b06e8a`
- Fetch artifact: `docs/audits/market_evidence_engine_v1/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-06-29T22-02-47-235Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 1 |
| `market_listing_raw_snapshots` | 102 |
| `market_listing_observations` | 102 |
| `market_listing_seller_snapshots` | 98 |
| `market_listing_price_events` | 102 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Summary

```json
{
  "source_projected_observation_count": 102,
  "deduped_observation_count": 102,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 4,
    "raw_single": 61,
    "slab": 37
  },
  "exclusion_flag_counts": {
    "foreign_language": 1,
    "sealed": 2,
    "sleeve_accessory": 1
  },
  "dedupe_summary": {
    "duplicate_raw_payload_rows_skipped": 0,
    "duplicate_seller_rows_skipped": 4
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: 8a794ce81eed48429e4a507a04a92ddcc2e1c453b4290e5068448363dd3f5901. Row manifest hash: aecf4a4508aefda751895004c907892125243f65f36a0b1404e71e9a47f89276. Source package fingerprint: 73719b843d31ec09bebd4bdbfb42393971c369dbae92596a8bba45e6301f2e50. Request results manifest hash: f6118dc396d52954550dd843420fa2b70592a15c69fe000e5c073b94c937ae34. Raw snapshot manifest hash: 8b6751bff04cd2ed7030d0603b16d9e62d318c6f290fd6fb495700e5b8ecc788. Projected observation manifest hash: 84c59dd0af4a0b0bc2cb7705474f5359f10d91e2d44d7e980a3142b279b06e8a. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 1 market_listing_query_cache rows, 102 market_listing_raw_snapshots rows, 102 market_listing_observations rows, 98 market_listing_seller_snapshots rows, and 102 market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
