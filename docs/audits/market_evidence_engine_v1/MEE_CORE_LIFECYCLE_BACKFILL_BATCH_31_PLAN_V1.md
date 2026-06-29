# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-28T17:39:26.432Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-31-V1`
- Package fingerprint: `6061da8db0b163e987341c1dbc866a7bb5187d33145f33d6a2e8403d6c17083c`
- Target observation cap: 10000
- Reference observations: 10000
- Active-listing observations: 0
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "4daee7d9d0cfc6e6d2495ffd4ebf993ac12cced389c29ff9639e049b11af3e1b",
  "market_evidence_lifecycle_events_jsonl_sha256": "790311799028a8a758d2fb9fc3fcc3a97d848ace54cd4ee94c599dd0ec2d024c",
  "readback_sql_sha256": "232b1e27fb4de583ec8d68286a2bcc2988012bad1c5831f74ad88ce3f8856e96"
}
```

## Duplicate Risk

```json
{
  "observation_ids_unique": true,
  "observation_keys_unique": true,
  "event_hashes_unique": true,
  "excludes_existing_market_evidence_observations": true
}
```

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

## Artifacts

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_31_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_31_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_31_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_31_PLAN_V1/manifest.json`
