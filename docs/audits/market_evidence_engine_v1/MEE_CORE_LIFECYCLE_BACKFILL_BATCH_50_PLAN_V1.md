# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-28T19:33:14.768Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-50-V1`
- Package fingerprint: `faf7b47c64b28c7e596fbef4beefbe7d266de16f9756d04cc5eec773f3146594`
- Target observation cap: 10000
- Reference observations: 10000
- Active-listing observations: 0
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "e8adfd9a6a385946d0fdf42e4c0521acac3beb8bfb962bf642af7aa0fb517ae2",
  "market_evidence_lifecycle_events_jsonl_sha256": "d42149de47adf66893d6b1cfcf9554b8ba919fa96c7e349fa72fe37695f478ce",
  "readback_sql_sha256": "b1f998d4c64894c8f119bd9790c6f943b33130329506bff1996ddd83f1b8efda"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_50_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_50_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_50_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_50_PLAN_V1/manifest.json`
