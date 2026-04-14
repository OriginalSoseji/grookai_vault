# CONTROLLED_GROWTH_INGESTION_PIPELINE_V1

## Context

The identity layer is closed and the canonical baseline is locked.

Controlled growth mode is now active under the maturity gate:

- no direct writes to `card_prints`
- no direct `gv_id` assignment
- no promotion or collapse side effects
- external data may enter only through raw intake plus non-canonical staging

This artifact stands up the first production-grade ingestion worker for that posture.

## Ingestion Architecture

The worker is:

- source-bound to `raw_imports` rows where `source = 'justtcg'`
- contract-driven against `EXTERNAL_SOURCE_INGESTION_MODEL_V1`
- non-canonical by design
- replay-safe through deterministic staging upsert on `external_discovery_candidates`

Execution flow:

1. read JustTCG card receipts from `raw_imports`
2. compute local normalization:
   - `NAME_NORMALIZE_V3`
   - normalized collector token
   - extracted `number_plain`
   - candidate set mapping from `justtcg_set_mappings`
3. compare against current canonical `card_prints`
4. classify every row into exactly one of:
   - `MATCHED`
   - `NEEDS_REVIEW`
   - `PROMOTION_CANDIDATE`
   - `NON_CANONICAL`
5. persist only lawful non-canonical staging rows

## Classification Rules

### `MATCHED`

Assigned when one of the following is true:

- an active `justtcg` external mapping already resolves the row
- an active `tcgplayer` bridge mapping resolves the row
- a unique same-set canonical identity exists on the clean normalized surface

Staging encoding:

- `match_status = RESOLVED`
- `candidate_bucket = CLEAN_CANON_CANDIDATE` or `PRINTED_IDENTITY_REVIEW` depending on canon-gate shape

### `NEEDS_REVIEW`

Assigned when the row cannot be resolved deterministically because:

- set mapping is missing
- set mapping is ambiguous
- the collector token enters a review-only lane
- only partial same-set canonical candidates exist

Staging encoding:

- `match_status = AMBIGUOUS`
- `candidate_bucket = PRINTED_IDENTITY_REVIEW`

### `PROMOTION_CANDIDATE`

Assigned only when:

- the row survives canon gate as a clean candidate
- set mapping is unique
- no lawful same-set canonical match exists
- the printed identity surface is stable enough to stage for future promotion review

Staging encoding:

- `match_status = UNMATCHED`
- `candidate_bucket = CLEAN_CANON_CANDIDATE`

### `NON_CANONICAL`

Assigned to rejects such as:

- `number = N/A`
- code cards
- rows missing required identity surface

These rows are reported but intentionally **not** staged.

Reason:

- `external_discovery_candidates` is a non-canonical discovery surface for canon-gate survivors
- `NON_CANONICAL` rows did not pass canon gate and do not belong in discovery staging

## Staging Model

The worker uses `public.external_discovery_candidates` as the lawful equivalent staging table.

Persisted fields come from the existing table contract:

- provenance:
  - `source`
  - `raw_import_id`
  - `upstream_id`
  - `tcgplayer_id`
- raw identity:
  - `set_id`
  - `name_raw`
  - `number_raw`
- normalized comparison surface:
  - `normalized_name`
  - `normalized_number_left`
  - `normalized_number_plain`
  - `normalized_printed_total`
- canon-gate + comparison outcome:
  - `candidate_bucket`
  - `match_status`
  - `resolved_set_code`
  - `card_print_id`
  - `classifier_version`

Equivalent-field note:

- the requested `confidence_score`, candidate ids, and classifier explanation are preserved inside staged payload metadata under `_grookai_ingestion_v1`
- the canonical raw upstream payload remains intact at the top level for provenance safety

## Safety Guarantees

The worker is fail-closed on the following guarantees:

- reads from `raw_imports`, `justtcg_set_mappings`, `card_prints`, `sets`, and `external_mappings`
- writes only to `external_discovery_candidates`
- no writes to canonical truth tables
- exact canonical row count is checked before and after apply
- any detected canonical drift aborts and rolls back the transaction

The worker supports:

- `--dry-run`
- `--apply`

`--dry-run`:

- classifies the full source surface
- emits classification counts
- emits sample rows per class
- rolls back

`--apply`:

- writes only staged rows that remain in the governed non-canonical flow
- commits only after canonical-count verification remains unchanged

## Why Canonical Is Protected

This pipeline expands operational coverage without weakening identity truth because:

- raw source data remains external evidence, not canon
- comparison is deterministic and contract-bound
- ambiguous rows remain ambiguous
- promotion candidates are preserved for later audited promotion work
- non-canonical noise is rejected early
- canonical tables remain untouched

## Result

The system now has a production-grade controlled-growth ingestion lane:

- raw JustTCG data is normalized locally
- canonical comparison is explicit and deterministic
- staging is lawful below the maturity gate
- canonical identity remains protected
