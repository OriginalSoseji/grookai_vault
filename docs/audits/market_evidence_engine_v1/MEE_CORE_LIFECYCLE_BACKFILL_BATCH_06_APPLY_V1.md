# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-26T16:57:09.530Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-06-APPLY-V1`
- Package fingerprint: `0f94ce1f04a6edcd4c2cea533a244cd66f2ba083d066cfa272af6f9b3210aff5`
- Source plan fingerprint: `cad2d4acabb46e7ecb6bb72db6cb9ed6f4cbe1b1f39369b615586f7197df6bc4`
- Inserted observations: 10000
- Inserted lifecycle events: 70000
- Findings: 0

## Readback

```json
{
  "observations": {
    "expected": 10000,
    "actual": 10000
  },
  "events": {
    "expected": 70000,
    "actual": 70000,
    "distinct_event_hashes": 70000
  },
  "current_view": {
    "expected": 10000,
    "actual": 10000,
    "app_visible_true": 0,
    "market_truth_true": 0
  },
  "public_pricing_surface": {
    "pricing_observations_count": 0,
    "ebay_active_prices_latest_count": 1690,
    "v_card_pricing_references_market_evidence": false
  }
}
```

## Boundary Proof

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "identity_table_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "deletes": false,
  "upserts": false,
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Findings

- none
