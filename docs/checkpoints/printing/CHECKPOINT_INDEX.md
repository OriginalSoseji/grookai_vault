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
