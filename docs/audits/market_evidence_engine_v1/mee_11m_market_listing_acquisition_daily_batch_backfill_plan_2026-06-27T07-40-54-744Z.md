# MEE-11M Market Listing Acquisition Daily Batch Backfill Plan

- Package: `MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-PLAN-V1`
- Ready for apply approval: `true`
- Package fingerprint: `8e1f48a13fc630ef9c7129603bb0b23ea489e88ac364aa8180f2c4bb5bc7da78`
- Row manifest hash: `e3f225bd29964120cd4aeb131578cd1ecff5077d5e98cbfa8b8fec0a02fdec8e`
- Source package fingerprint: `efc3fb2642a541f1345f833b003e43be75e74f3ab271098b861b81fa2e16b92d`
- Request results manifest hash: `f2793cd7f245419d56fb9db3e246385417fc782d90913375985ff516cfaf05bd`
- Raw snapshot manifest hash: `c0c075f68d2d76adaff9ceef96de24ac0406adf42663ed294710375ee3bc62ad`
- Projected observation manifest hash: `f08a8eebbe8f1820955591b203b3e85d9ab5b43243dfa42d65c137c3adf430f9`
- Fetch artifact: `docs/audits/market_evidence_engine_v1/mee_11l_market_listing_acquisition_daily_batch_fetch_2026-06-27T06-33-42-326Z.json`

## Proposed Row Counts

| Table | Rows |
| --- | ---: |
| `market_listing_acquisition_runs` | 1 |
| `market_listing_query_cache` | 3000 |
| `market_listing_raw_snapshots` | 98439 |
| `market_listing_observations` | 98439 |
| `market_listing_seller_snapshots` | 19208 |
| `market_listing_price_events` | 98439 |
| `market_listing_card_candidates` | 0 |
| `market_listing_rollups` | 0 |

## Summary

```json
{
  "source_projected_observation_count": 128460,
  "deduped_observation_count": 98439,
  "evidence_class_counts": {
    "excluded_or_ambiguous": 14198,
    "raw_single": 58873,
    "slab": 25368
  },
  "exclusion_flag_counts": {
    "bulk": 55,
    "choose_your_card": 1935,
    "code_card": 13,
    "complete_set": 195,
    "custom_fake": 94,
    "foreign_language": 12552,
    "jumbo": 184,
    "lot": 2428,
    "menu_listing": 522,
    "minimum_order": 256,
    "proxy_custom": 17,
    "sealed": 2500,
    "sleeve_accessory": 154
  },
  "dedupe_summary": {
    "duplicate_raw_payload_rows_skipped": 30021,
    "duplicate_seller_rows_skipped": 79231
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
Approve real MARKET-LISTING-ACQUISITION-DAILY-BATCH-BACKFILL-APPLY-V1 apply only. Package fingerprint: 8e1f48a13fc630ef9c7129603bb0b23ea489e88ac364aa8180f2c4bb5bc7da78. Row manifest hash: e3f225bd29964120cd4aeb131578cd1ecff5077d5e98cbfa8b8fec0a02fdec8e. Source package fingerprint: efc3fb2642a541f1345f833b003e43be75e74f3ab271098b861b81fa2e16b92d. Request results manifest hash: f2793cd7f245419d56fb9db3e246385417fc782d90913375985ff516cfaf05bd. Raw snapshot manifest hash: c0c075f68d2d76adaff9ceef96de24ac0406adf42663ed294710375ee3bc62ad. Projected observation manifest hash: f08a8eebbe8f1820955591b203b3e85d9ab5b43243dfa42d65c137c3adf430f9. Schema migration hash: 2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4. Scope: insert 1 market_listing_acquisition_runs row, 3000 market_listing_query_cache rows, 98439 market_listing_raw_snapshots rows, 98439 market_listing_observations rows, 19208 market_listing_seller_snapshots rows, and 98439 market_listing_price_events rows from local MEE-11M daily batch backfill row artifacts only, preserving slab/raw-single classification metadata in event_payload. No provider calls. No source fetches. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No app-visible pricing. No public price rollups. No card candidate writes. No rollup writes. No identity-table writes. No vault writes. No image writes. No deletes. No upserts. No merges. No migrations. No global apply.
```
