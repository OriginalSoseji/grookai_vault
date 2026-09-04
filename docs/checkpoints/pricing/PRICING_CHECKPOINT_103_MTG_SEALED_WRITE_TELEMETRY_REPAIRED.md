# Pricing Checkpoint 103: MTG Sealed Write Telemetry Repaired

## Context

Checkpoint 102 proved the durable MTG sealed production apply and exact
readback. It also recorded one artifact-only defect: the aggregate writer
telemetry counted `qualification_holds` as inserted rows and omitted the MTG
release pointer.

## Decision

Derive write telemetry from the nine payload arrays the writer actually
inserts, report the release pointer separately, and retain qualification holds
only as diagnostics. Do not change the plan schema, payload, fingerprint,
workflow authority, database, visibility, pricing, Storage, images, cards,
sets, Vault, or One Piece.

## Implementation

`buildMtgSealedWriteTelemetryV1` now reports:

- `table_rows_by_resource` for the nine inserted payload resources;
- `table_rows_written` as their exact sum;
- `pointer_rows_written` separately;
- `database_rows_written` as table rows plus pointer rows;
- `diagnostic_counts.qualification_holds` outside inserted-row totals.

The durable operator uses that helper for apply artifacts. The source-derived
plan remains unchanged, so its plan and source fingerprints are unaffected.

## Validation

- `node --check backend/pricing/mtg_sealed_world_v1.mjs`: passed.
- `node --check scripts/audits/mtg_sealed_world_v1.mjs`: passed.
- Targeted MTG sealed contract tests: `16/16` passed.
- The regression varies diagnostic hold counts independently and proves they do
  not change `database_rows_written`.
- `git diff --check`: passed.
- Production database writes: `0`.

## Current Truths

- The checkpoint 102 production apply remains exact and unchanged.
- The telemetry defect no longer blocks reuse of the writer pattern under a
  future, separately authorized payload.
- The consumed checkpoint 101 apply authority remains unusable.
- MTG sealed remains hidden and unpublished.

## Invariants

- Diagnostic counts can never be reported as inserted rows.
- Pointer writes remain explicit rather than hidden in aggregate telemetry.
- Exact table projections remain stronger evidence than summary counters.
- A telemetry repair grants no production mutation or publication authority.

## Explicit Next Gate

Run a read-only MTG sealed verification from the merged telemetry-repair SHA.
Then freeze separate productization gates for self-hosted images, pricing
publication, and signed-in visibility. Do not combine or activate those gates.
