# WAREHOUSE_INTAKE_V1_COMPLETE

## Status

`ACTIVE / COMPLETE / VERIFIED`

## Date

`2026-03-28`

## Scope

Canon Warehouse Intake V1 completion.

This checkpoint covers:

- deployed warehouse schema
- deployed warehouse intake RPC
- authenticated remote intake proof
- canon isolation proof

## Context

Grookai needed a safe way to accept user-submitted unknown cards or missing assets without corrupting canon.

Prior to this checkpoint, warehouse contracts and schema were designed, but the system had not yet been proven remotely end-to-end.

The core problem was not intake UX.

The core problem was controlled uncertainty.

Grookai needed a place where unresolved or incomplete reality could be accepted, stored, and audited without being forced into canonical truth.

## What Was Built

Warehouse core tables:

- `canon_warehouse_candidates`
- `canon_warehouse_candidate_evidence`
- `canon_warehouse_candidate_events`
- `canon_warehouse_candidate_credits`
- `canon_warehouse_promotion_staging`

Warehouse enforcement layer:

- constraints
- indexes
- triggers
- row-level security

Atomic authenticated intake RPC:

- `public.warehouse_intake_v1`

Intake validation path now supports:

- required notes
- optional `tcgplayer_id`
- required `submission_intent`
- `MISSING_CARD`
- `MISSING_IMAGE`

## What Was Proven

Valid authenticated intake creates exactly:

- one RAW warehouse candidate
- one or more evidence rows
- one intake event row

Invalid intake is rejected with zero writes.

`MISSING_IMAGE` correctly requires reference context.

No staging rows are created by intake.

No promotion occurs.

No canon mutation occurs.

Warehouse intake works remotely, not just locally.

## Safety Guarantees Now Locked

- warehouse intake is atomic
- warehouse intake is authenticated
- warehouse is non-canonical
- canon is isolated from intake
- invalid input cannot leak into canon
- evidence is append-only by design
- founder-gated promotion architecture remains intact

## What This Unlocks Next

- classification worker
- review surface
- founder approval path
- staging creator
- future canon promotion executor

## Why This Matters

Grookai now has a controlled uncertainty layer.

The system can safely accept unknown or incomplete reality.

The system can intentionally hold unresolved submissions in `RAW`.

Uncertainty is now modeled instead of ignored or forced into canon.

This is infrastructure-level capability, not a cosmetic feature.

## Current Truths

- warehouse schema exists remotely
- intake RPC exists remotely
- remote smoke test passed
- `RAW` is now a meaningful intentional state
- canon remains protected
- valid authenticated intake was proven to create warehouse candidate + evidence + event without creating staging or promotion side effects

## Invariants

1. Intake never writes to canon.
2. Intake never stages promotion.
3. RAW candidates must include notes and evidence.
4. `MISSING_IMAGE` requires reference context.
5. Failed intake writes no rows.
6. Warehouse candidates begin in `RAW`.
7. Promotion remains founder-gated and staging-gated.

## Not Included

- no classification worker yet
- no review UI yet
- no founder approval action yet
- no staging executor yet
- no promotion executor yet
- no canon mutation path from warehouse yet

## Next Step

`Classification Worker V1`
