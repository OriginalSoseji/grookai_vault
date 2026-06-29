# MEE Core Lifecycle Backfill Batch Apply V1

Generated: 2026-06-28T17:32:23.617Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-29-APPLY-V1`
- Package fingerprint: `ac595b9a9aacc0d6a64188c6fcbee1a7d57cea405e301c5b0cf7a7ce8de80db3`
- Source plan fingerprint: `4462fd31bfa0a355bd4296c8ac75d2f1fa8a81e41573b666a3ccae8436a96043`
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
