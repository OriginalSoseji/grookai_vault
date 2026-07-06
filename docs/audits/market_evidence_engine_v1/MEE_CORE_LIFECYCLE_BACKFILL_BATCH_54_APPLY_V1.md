# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-28T19:58:31.410Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-54-APPLY-V1`
- Package fingerprint: `dd31e9a3e61864bbc8f5516ec92128b4250f4f3464bd563cbdd2ba010386b063`
- Source plan fingerprint: `2f47369a81d21bc3d56d8ebc286bbe4bba872cf16f511526776933e9c3a963b5`
- Inserted observations: 744
- Inserted lifecycle events: 5208
- Findings: 0

## Readback

```json
{
  "observations": {
    "expected": 744,
    "actual": 744
  },
  "events": {
    "expected": 5208,
    "actual": 5208,
    "distinct_event_hashes": 5208
  },
  "current_view": {
    "expected": 744,
    "actual": 744,
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
