# MEE Core Lifecycle Backfill Batch 02 Apply V1

Generated: 2026-06-26T16:00:21.843Z

Mode: bounded lifecycle backfill apply

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-02-APPLY-V1`
- Package fingerprint: `fb0755c3f33d3650c4187d8d466d4234bd8238d5d4f0665df254aab251a2adba`
- Source plan fingerprint: `cd9fc4cecd4d09bad578be7300383f4cbd5f41c50696d72678e40824815ce125`
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
