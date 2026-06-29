# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-26T17:53:58.599Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-14-APPLY-V1`
- Package fingerprint: `e1a9473ec8049376def6ba5fd459bc36e7f0a6e7ff09c86d894455034d5f80d8`
- Source plan fingerprint: `476d0aca2dfcebf871fc7f11fd9c07d0e149dd7204adbb52841fe08dea4df5a5`
- Inserted observations: 4622
- Inserted lifecycle events: 32354
- Findings: 0

## Readback

```json
{
  "observations": {
    "expected": 4622,
    "actual": 4622
  },
  "events": {
    "expected": 32354,
    "actual": 32354,
    "distinct_event_hashes": 32354
  },
  "current_view": {
    "expected": 4622,
    "actual": 4622,
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
