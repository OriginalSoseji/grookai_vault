# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-26T16:14:05.776Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-03-APPLY-V1`
- Package fingerprint: `8231822c25cb6be209b8b1682078bf1897d5b38dd03dfb62d501c2219bdaf26f`
- Source plan fingerprint: `06860a3ab0d54291ee13326e0f8d4ba4591fa671125662a5b39d295b3efaf8e0`
- Inserted observations: 5000
- Inserted lifecycle events: 35000
- Findings: 0

## Readback

```json
{
  "observations": {
    "expected": 5000,
    "actual": 5000
  },
  "events": {
    "expected": 35000,
    "actual": 35000,
    "distinct_event_hashes": 35000
  },
  "current_view": {
    "expected": 5000,
    "actual": 5000,
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
