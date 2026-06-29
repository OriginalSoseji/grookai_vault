# MEE Core Lifecycle Backfill Batch Plan V1

Generated: 2026-06-27T09:17:03.574Z

Mode: local batch plan only, no DB writes

## Summary

- Package: `MEE-CORE-LIFECYCLE-BACKFILL-BATCH-17-V1`
- Package fingerprint: `da55fcbfb4c48dc3fa831315b35760ad6f95eede12db9a305058233d637dc196`
- Target observation cap: 10000
- Reference observations: 0
- Active-listing observations: 10000
- Total observations: 10000
- Lifecycle events: 70000
- Findings: 0

## Manifest Hashes

```json
{
  "market_evidence_observations_jsonl_sha256": "c34a1a4f58a3cf58a6327063d109d0561e7514697517b5d9aa816980b51a0b32",
  "market_evidence_lifecycle_events_jsonl_sha256": "921777aa618bb45b516d96337a3efb46058acb8f11589e3bee2415409221a01e",
  "readback_sql_sha256": "19cf8716438776cc457a7c26ba1ac06ff78e42a57bda610fb4c1b0892e8c0f5d"
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

- Observations: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_17_PLAN_V1/market_evidence_observations.jsonl`
- Events: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_17_PLAN_V1/market_evidence_lifecycle_events.jsonl`
- Readback SQL: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_17_PLAN_V1/readback.sql`
- Manifest: `docs/audits/market_evidence_engine_v1/MEE_CORE_LIFECYCLE_BACKFILL_BATCH_17_PLAN_V1/manifest.json`
