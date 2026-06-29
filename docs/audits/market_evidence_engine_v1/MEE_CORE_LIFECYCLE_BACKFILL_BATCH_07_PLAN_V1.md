# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-26T16:57:35.482Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-07-V1`
- Package fingerprint: `dd083e67bd8c5e143dc315a1a54083ae48df5fea1f7a82685872d5a9977c49a1`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 10000
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "60c2faf2710f2b54339a00fdc9683c82fcbfabe0e18a1e68795363dff3221bd4",
  "market_evidence_lifecycle_events_jsonl_sha256": "dbc3a0327ac0192d79bfa3f7c7bd6ba038808ae5c191656b4cd738c72097869c",
  "readback_sql_sha256": "e3e4dfebb8470776a0825a16d41e37c212efdaf0f351576d30f32e601de32f34"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_07_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_07_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_07_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_07_PLAN_V1/manifest.json`
