# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-28T19:27:17.651Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-49-V1`
- Package fingerprint: `1a150b72267193a43318fbd501bed0b38765bffbef6cc5f76e19492397604839`
- Target observation cap: 10000
- Reference observations: 10000
- Active-listing observations: 0
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "ce9134f354c04d74f7c1ea93c9fc024f03c222370e2751c602e2a7ab7d53d75e",
  "market_evidence_lifecycle_events_jsonl_sha256": "1aa8fc3c81bd6fcc295a10aaf059c8dee10d15f07aa005f81de11b8ddad42db8",
  "readback_sql_sha256": "27b8c5e04b9f726672f9eb1087f61198cc807f1c87f9a8639d90b50c248edf64"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_49_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_49_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_49_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_49_PLAN_V1/manifest.json`
