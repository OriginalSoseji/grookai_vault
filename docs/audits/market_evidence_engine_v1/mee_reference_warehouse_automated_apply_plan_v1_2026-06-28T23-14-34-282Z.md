# MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1

Generated: 2026-06-28T23:14:34.282Z
Fingerprint: `b2e009848b3b81a51c6e924182f34f0e5008acc7b1cf5249fe0b4fa2d5f215f8`

## Objective

Define the nightly-safe path from refreshed free/reference artifacts into internal market_reference warehouse rows, internal assignment/quality views, and non-public signal rollups.

## Boundary

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "db_writes": false,
  "remote_apply": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "identity_table_writes": false,
  "card_prints_writes": false,
  "card_printings_writes": false,
  "vault_writes": false,
  "image_storage_writes": false,
  "deletes": false,
  "upserts": false,
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Sources

- tcgdex_tcgplayer_reference: reference_price, free_api_reference, review gated
- tcgdex_cardmarket_reference: reference_price, free_api_reference, review gated
- pokemontcg_io_reference: reference_price, free_api_reference, review gated
- tcgcsv_reference: reference_price, public_snapshot_api, review gated

## Lifecycle

1. artifact_discovery: Select the newest successful reference refresh artifacts for each source and record hashes before planning rows.
2. warehouse_preflight: Verify source constraints, service-role RLS, public-boundary flags, and duplicate natural keys before insert planning.
3. row_projection: Project acquisition, raw snapshot, candidate, normalized evidence, and coverage rows locally with stable hashes.
4. missing_row_insert: Future automation may insert only missing rows by natural key. Existing evidence rows are never updated, upserted, deleted, or merged.
5. assignment_queue_refresh: Read internal assignment and quality views after warehouse writes; uncertain rows remain queued.
6. internal_signal_rollup_refresh: Future automation may append a new internal rollup_version only when all rollup rows remain review-gated and non-public.
7. publication_gate_recheck: Re-read publication gate and bridge views. This package never writes public pricing or app-visible rollups.

## Idempotency

- acquisition_runs: run_key unique; skip already-present run_key
- raw_snapshots: source + source_object_type + source_object_id + payload_hash unique; skip exact duplicate raw payloads
- candidates: source + candidate_hash unique; skip exact duplicate candidate rows
- normalized_evidence: candidate_id + normalizer_version unique; insert only after candidate_id is resolved
- coverage_reports: report_key unique; skip already-present report_key
- rollups: rollup_version must be new; preserve old versions for replay

## Failure Guards

- unsupported_source_constraint
- source_registry_boundary_failed
- artifact_hash_mismatch
- candidate_hash_duplicate_inside_package
- raw_snapshot_key_duplicate_inside_package
- missing_candidate_id_for_normalized_row
- direct_publish_flag_detected
- needs_review_false_detected
- public_boundary_leak_detected
- identity_table_write_detected
- price_publication_write_detected
- rollup_version_already_exists
- readback_count_mismatch

## SQL Artifacts

- Preflight: docs/sql/mee_reference_warehouse_automated_apply_v1_preflight.sql
- Readback: docs/sql/mee_reference_warehouse_automated_apply_v1_readback.sql
- Preflight hash: `56e644ea937d8853e550320fdbbb366ed5ddcecc1424450c9d954d93fae405dd`
- Readback hash: `80ae83b5bda666bb28c65c84949fc9862e51a7f363d3077e53653d237f821200`

## Next Contract

The next contract may implement the actual internal writer. It must use this plan's natural-key idempotency, stop on any guard failure, and still keep all public pricing boundaries closed.
