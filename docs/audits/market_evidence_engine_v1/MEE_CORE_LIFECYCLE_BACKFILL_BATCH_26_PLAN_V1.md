# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-28T17:13:14.128Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-26-V1`
- Package fingerprint: `2eab09e4433e51dcf6d57696affe6de86c61af23e7c33439f0895c02c62459f0`
- Target observation cap: 10000
- Reference observations: 10000
- Active-listing observations: 0
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "135ebcb8ae9cfbb5302e2e75283def0fd25014161cc456d957176456d53f19b5",
  "market_evidence_lifecycle_events_jsonl_sha256": "35b058769e0bbefdc654226a5041bf37c88f4a8be6df4ecb9e44ed610e32b3e3",
  "readback_sql_sha256": "42717d95120667a553c60d2fb0cc2be56d76f057e4cd73c0191fc589edf5a37e"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_26_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_26_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_26_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_26_PLAN_V1/manifest.json`
