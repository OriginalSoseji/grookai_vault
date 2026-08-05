# PRINTING_CHECKPOINT_INDEX

## Purpose

This checkpoint pack preserves the printing workstream's architectural memory in durable repo-native form.

Its purpose is not to restate task history. Its purpose is to explain:

- what problems required explicit printing governance
- which boundaries are now locked
- what implementation work was completed lawfully
- what future phases must preserve to avoid child/canon drift

These checkpoints should be read as institutional memory for the printing system.

## Checkpoint Sequence

### `SPECIAL_VARIANT_EXACT_IMAGE_REVIEW_CLOSEOUT_V1.md`

This checkpoint closes exact-image review for all `143` authority-qualified hidden special-variant child printings.

Current result:

- `143/143` child rows have exact self-hosted image paths
- `143/143` truth reviews are founder-verified and remain `hidden_pending_review`
- `143/143` private image objects passed final byte/hash/dimension readback
- `0` rows are public or currently priced
- `0` canonical parent rows changed
- the next gate is the separately governed production canary; special-variant publication remains unauthorized

### `SPECIAL_VARIANT_SELF_HOSTED_REVIEW_V1.md`

This checkpoint records the exact-image and review workflow for the `143` hidden special-variant child printings.

Current result:

- `143/143` exact images are self-hosted in private Grookai storage with byte-for-byte readback
- founder review is complete through an immutable `133`-row artifact plus a separate `10`-row evidence amendment
- all `143` image approvals were applied in bounded SHA-bound transactions
- every row remains hidden; publication and pricing authorization counts remain `0`
- exact-image work is closed by `SPECIAL_VARIANT_EXACT_IMAGE_REVIEW_CLOSEOUT_V1.md`

### `SPECIAL_VARIANT_PRINTING_HIDDEN_APPLY_CLOSEOUT_V1.md`

This checkpoint records the completed hidden apply and pricing quarantine for the `143` authority-qualified special-variant printings.

Current result:

- `143` durable child candidates exist with exact `hidden_pending_review` sidecars
- `0` are approved or publicly exposed
- hidden-child pricing qualification was reduced from `9` pre-migration candidates to `0`
- `420` authority failures remain blocked and untouched
- human review, source acquisition, and exact-image acquisition are the next operational gates

### `SPECIAL_VARIANT_PRINTING_AUTHORITY_V1.md`

This checkpoint records the authoritative reconciliation of the `563` reference-only special-variant printing gaps left by the cross-client release repair.

Decision locked there:

- JustTCG remains discovery-only
- only exact active TCGCSV/TCGplayer catalog identity, explicit variant title, exact finish subtype, verified set/Index consistency, and clean live invariants may enter a guarded child manifest

Current result:

- `143` prospective child rows were evidence-ready and collision-free and are now durably applied under hidden review
- `420` rows remain blocked
- no child is approved or publicly visible
- the `143`-row rollback-only proof passed through frozen GitHub runner evidence with identical durable before/after fingerprints
- the apply completed in bounded batches and reconciled `143/143`; current state is governed by `SPECIAL_VARIANT_PRINTING_HIDDEN_APPLY_CLOSEOUT_V1.md`

### `VARIANT_SEARCH_PRINTING_COVERAGE_RELEASE_REPAIR_V1.md`

This checkpoint records the bounded cross-client repair that made exact structured variant search deterministic, exposed the existing exact-copy media controls, and restored the printing authority boundary for coverage repair.

Decision locked there:

- exact search may promote only a unique, fully applied structured result
- JustTCG-only finish evidence remains reviewer-only and cannot authorize automatic child creation

Unresolved work afterward:

- `563` reference-only finish gaps still need authoritative source acquisition or human confirmation
- exact variant imagery remains separate from governed printing identity

### `PRINTING_MODEL_V2_IMPLEMENTATION_CHECKPOINT.md`

This checkpoint records the first lawful implementation phase of Printing Model V2. It captures the transition from under-governed child-printing behavior into a contract-bound, provenance-aware, deterministic finish layer without reopening canon.

Decision locked there:

- stable child-printing ingestion is now live only for `normal`, `holo`, and `reverse`, under current canon

Unresolved work afterward:

- premium parallels are still deferred
- provisional child handling is still deferred
- canon-sensitive promotion remains a separate future workflow

## Current Printing State Summary

Current printing state in plain language:

- `card_prints` remains canonical identity
- `card_printings` remains child-only
- stable child ingestion is bounded to `normal`, `holo`, and `reverse`
- TCGdex is the primary stable finish lane
- PokemonAPI is reinforcement and validation lane
- JustTCG is not a lawful printing identity lane
- user-upload and scan discovery are not child-printing lanes
- zero-print cards are valid and are handled through representation fallback rather than synthetic DB rows
- premium and provisional printing work remain future phases

## Reading Order Recommendation

Recommended reading order for future maintainers:

1. `docs/contracts/CHILD_PRINTING_CONTRACT_V1.md`
   - read first to understand the lawful boundary between canon and child printing

2. `docs/contracts/PRINTING_MODEL_V2.md`
   - read second to understand the bounded schema and ingestion design that governed this phase

3. `docs/checkpoints/printing/PRINTING_MODEL_V2_IMPLEMENTATION_CHECKPOINT.md`
   - read third to understand what was actually implemented, what was proven, and what remains explicitly deferred
