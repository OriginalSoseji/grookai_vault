# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T16:55:19.130Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-06-V1`
- Package fingerprint: `cad2d4acabb46e7ecb6bb72db6cb9ed6f4cbe1b1f39369b615586f7197df6bc4`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 10000
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "21abba0073e9dd0e037304663ebb2ae1616541e053c5c8c2eeaf8a1732fd99f4",
  "market_evidence_lifecycle_events_jsonl_sha256": "47c7ac33271af0f622631480a24a12f2ecb9d2173718543a406c88219b3ee89d",
  "readback_sql_sha256": "a57059c69f25352a0fb969305b0e1c07514c68cafa1bdf0450ccced5ce04b233"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_06_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_06_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_06_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_06_PLAN_V1/manifest.json`
