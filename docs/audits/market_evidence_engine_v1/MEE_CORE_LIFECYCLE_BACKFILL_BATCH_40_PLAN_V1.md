# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-28T18:32:44.747Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-40-V1`
- Package fingerprint: `d34d4e9a3b4820ef8c33259b362da6795a49dd3d4a1b356a87208061a6dfda68`
- Target observation cap: 10000
- Reference observations: 10000
- Active-listing observations: 0
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "a4d95ca43e33e11d5652accd0cd8d075b71d60cb4c12c420483fd08d8801c0f0",
  "market_evidence_lifecycle_events_jsonl_sha256": "742737e3382bc698f8bb29257cbd7eb396f73f16553d231afc33ca335e59fe18",
  "readback_sql_sha256": "3fe1f2d91d94e523de3ef02afb80c42527758639c3a8469319f1035bc174ce23"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_40_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_40_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_40_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_40_PLAN_V1/manifest.json`
