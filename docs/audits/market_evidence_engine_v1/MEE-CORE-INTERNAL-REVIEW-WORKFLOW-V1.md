# MEE Core Internal Review Workflow V1

Generated: 2026-06-26T19:00:29.718Z

Mode: plan only, local artifacts only

## Summary

- Package: `MEE-CORE-INTERNAL-REVIEW-WORKFLOW-V1`
- Fingerprint: `081dbf7c0db4816ac6e232fd4b3380ee190f43ed6970094226132431ebc742c9`
- Cards in review queue: 2152
- Findings: 0

## Lane Counts

- candidate_review: 1536
- low_signal_monitor: 380
- high_signal_review: 213
- classification_review: 19
- reference_only_review: 4

## Source Mix

```json
{
  "active_only": 1159,
  "both_reference_and_active": 78,
  "neither": 0,
  "reference_only": 915
}
```

## Boundary Proof

```json
{
  "remote_migration_apply": false,
  "db_writes": false,
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
