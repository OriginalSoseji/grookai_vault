# MEE Core Internal Review Dispositions Seed Plan V1

Generated: 2026-06-26T19:41:14.020Z

Mode: plan only, local artifacts only

## Summary

- Package: `MEE-CORE-INTERNAL-REVIEW-DISPOSITIONS-SEED-PLAN-V1`
- Fingerprint: `cd2a778a0aa248f6bb33840fc35c05af3a8ce920c1bd152d460c2cd5a6cfdd2f`
- Planned seed rows: 2152
- Duplicate keys in package: 0
- Existing active disposition conflicts: 0
- Findings: 0

## Lane Mapping

- candidate_review: 1536 -> `review_pending_candidate`
- classification_review: 19 -> `review_pending_classification_fix`
- high_signal_review: 213 -> `review_pending_high_signal`
- low_signal_monitor: 380 -> `monitor_only`
- reference_only_review: 4 -> `review_pending_reference_only`

## Evidence Lanes

- mixed_raw_slab: 574
- raw_single: 378
- reference_metric: 915
- slab: 92
- unknown: 18
- classification_blocked: 19
- low_signal: 156

## Boundary Proof

```json
{
  "db_writes": false,
  "evidence_backfill_apply": false,
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
