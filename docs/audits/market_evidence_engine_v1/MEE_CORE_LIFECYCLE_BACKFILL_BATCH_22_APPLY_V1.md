# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-27T09:40:05.193Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-22-APPLY-V1`
- Package fingerprint: `53fa592dbd239133bd51919aff128c3086542522268cb014234a33c05dd5afe1`
- Source plan fingerprint: `2a02e77eda0c4fe0fe182b58f8e42e3393ea493b63a19cf0e0d62ca371d66736`
- Inserted observations: 5035
- Inserted lifecycle events: 35245
- Findings: 0

## Readback

```json
{
  "observations": {
    "expected": 5035,
    "actual": 5035
  },
  "events": {
    "expected": 35245,
    "actual": 35245,
    "distinct_event_hashes": 35245
  },
  "current_view": {
    "expected": 5035,
    "actual": 5035,
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
