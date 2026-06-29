# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-28T18:36:30.638Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-40-APPLY-V1`
- Package fingerprint: `b663a280c6502396b231a6c6fbe0e2e401f32ba509f5206fef52629af8c9a3c8`
- Source plan fingerprint: `d34d4e9a3b4820ef8c33259b362da6795a49dd3d4a1b356a87208061a6dfda68`
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
