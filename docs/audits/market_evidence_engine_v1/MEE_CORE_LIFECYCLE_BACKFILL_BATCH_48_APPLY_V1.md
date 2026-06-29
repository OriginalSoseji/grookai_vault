# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-28T19:24:59.263Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-48-APPLY-V1`
- Package fingerprint: `5c0ccb1775399b1c76411166099e75eadd5cbe8c59a027ee2b756233c7295b55`
- Source plan fingerprint: `3a6150127a310fd50d66be1cb8c1d5906cde8e3009803657b6f6bba0551e72ac`
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
