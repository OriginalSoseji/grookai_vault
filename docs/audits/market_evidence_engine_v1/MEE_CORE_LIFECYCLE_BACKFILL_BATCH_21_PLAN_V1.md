# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-27T09:34:14.981Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-21-V1`
- Package fingerprint: `55e6d64ed86484dbbcc4d07219a97cde57c820803ad3ef54da520b74d7cdff64`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 10000
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "16c708cf8d5e77d6b82c31e5b369b557e44d9bfda9ab289bf6c2ae64bdbd94ef",
  "market_evidence_lifecycle_events_jsonl_sha256": "2fe10113f043dbd8f81421f944d45b8a0b0c88802b60975ae4919da5d1d43f4d",
  "readback_sql_sha256": "69ad96dafbe0cb662cedd5983f6022cb3847307b3012cd093dedc9e7f2c54bfa"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_21_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_21_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_21_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_21_PLAN_V1/manifest.json`
