# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T17:52:33.688Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-14-V1`
- Package fingerprint: `476d0aca2dfcebf871fc7f11fd9c07d0e149dd7204adbb52841fe08dea4df5a5`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 4622
- Total observations: 4622
- Lifecycle events: 32354
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "2d74dfceca4be030bf0e4bc38e99e0515a9c8409df6a8f0e89337c934ef7e0e1",
  "market_evidence_lifecycle_events_jsonl_sha256": "5fe7b16bae789e3431a5866b2bbefe0e12f9b842706b8262be530baef865541b",
  "readback_sql_sha256": "2f0026a557c192caf6f25e12113ad553486d0c068c27bd41353f7a546519f116"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_14_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_14_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_14_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_14_PLAN_V1/manifest.json`
