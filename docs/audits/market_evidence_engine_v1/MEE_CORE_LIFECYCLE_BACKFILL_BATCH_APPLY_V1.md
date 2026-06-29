# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-26T15:52:42.539Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-APPLY-V1`
- Package fingerprint: `46e13115d4d77c1164309c23491b0527bf0994605d17e9f7f0134556e5d40480`
- Source plan fingerprint: `142dce4e526c092034c7ba0ac86af23c604c469223fd21062c5c83fd3a744f6c`
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
