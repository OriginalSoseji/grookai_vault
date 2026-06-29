# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-26T17:00:09.419Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-07-APPLY-V1`
- Package fingerprint: `018c267f7e4be93fc47b5eae9ec8a4598c64af000764f4dd365be260565d4c0f`
- Source plan fingerprint: `dd083e67bd8c5e143dc315a1a54083ae48df5fea1f7a82685872d5a9977c49a1`
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
