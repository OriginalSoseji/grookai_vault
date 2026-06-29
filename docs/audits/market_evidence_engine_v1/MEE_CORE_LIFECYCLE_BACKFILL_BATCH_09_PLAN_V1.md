# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T17:05:21.086Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-09-V1`
- Package fingerprint: `ed8010a8702c3b2e0e6add67f5adfc5d7552a60b8f64c88371997dfd41268cef`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 10000
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "6bf39d83facee175fa3ec3d1aea633eb2d4016000cc397056cddeb0975085d49",
  "market_evidence_lifecycle_events_jsonl_sha256": "432c99ffba40429525d1f90473b12b85261dce8ed98fff42469c2ed33c9b2b31",
  "readback_sql_sha256": "b5b10d524f5786c84fb535ca2f05a204f905db7beff843b0a120a60c9dc95b27"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_09_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_09_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_09_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_09_PLAN_V1/manifest.json`
