# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-27T09:38:36.257Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-22-V1`
- Package fingerprint: `2a02e77eda0c4fe0fe182b58f8e42e3393ea493b63a19cf0e0d62ca371d66736`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 5035
- Total observations: 5035
- Lifecycle events: 35245
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "b9eba131b2a357c6115da5aa568f4a2ae6d83a0058bd84e904abd6ccd3a837f3",
  "market_evidence_lifecycle_events_jsonl_sha256": "81a0c7a3292844b9d91b28f010295655f49f9d8cd185ef977007ff6581dcabc0",
  "readback_sql_sha256": "97b6a4a0cea72513f4e39de08e6c78642331865888d4f74b12c0175bd289e855"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_22_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_22_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_22_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_22_PLAN_V1/manifest.json`
