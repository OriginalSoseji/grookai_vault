# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T16:09:48.480Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-03-V1`
- Package fingerprint: `06860a3ab0d54291ee13326e0f8d4ba4591fa671125662a5b39d295b3efaf8e0`
- Target observation cap: 5000
- Reference observations: 2500
- Active-listing observations: 2500
- Total observations: 5000
- Lifecycle events: 35000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "2777deb69cb5722dedc6d60c8904c20be3516242c6d7c7424c30e8fc8ea6188f",
  "market_evidence_lifecycle_events_jsonl_sha256": "d8a57c6cd4ae6451d05f8610f45d59f2c4fa01c51e3ae1b169debcba82f87e88",
  "readback_sql_sha256": "e846474b5e7a6e5b085f365c8f3606b40adb352fc99f740a99bb642967e43a3c"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_03_PLAN_V1/manifest.json`
