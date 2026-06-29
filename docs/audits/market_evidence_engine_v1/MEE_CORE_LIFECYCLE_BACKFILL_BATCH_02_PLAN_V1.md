# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T15:57:06.251Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-02-V1`
- Package fingerprint: `cd9fc4cecd4d09bad578be7300383f4cbd5f41c50696d72678e40824815ce125`
- Target observation cap: 5000
- Reference observations: 2500
- Active-listing observations: 2500
- Total observations: 5000
- Lifecycle events: 35000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "99c9fc118301e533ff9dfd12f2c474cb13a4b84c1e2b9c063a27565fc557117f",
  "market_evidence_lifecycle_events_jsonl_sha256": "4f3ecd04caba9d53efe8141d7ecb7827a4c315476faeede06e6f1dbd6786db71",
  "readback_sql_sha256": "3e251b5d9ef52fd0819f788c7cfeedd7fb6895d4173334056d77b526cb36f68d"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_02_PLAN_V1/manifest.json`
