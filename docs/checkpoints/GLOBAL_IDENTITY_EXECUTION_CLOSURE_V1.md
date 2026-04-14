# GLOBAL_IDENTITY_EXECUTION_CLOSURE_V1

Status: Established
Type: Global System Checkpoint
Scope: Full identity execution wave closure
Date: 2026-04-12

## Context
The full identity execution wave is complete across the targeted execution surfaces:

- `duplicate bucket -> COMPLETE`
- `cel25 -> COMPLETE`
- `xy7 -> COMPLETE`
- `xy10 -> COMPLETE`
- `xy9 -> COMPLETE`
- `xy6 -> COMPLETE`
- `xy3 -> COMPLETE`
- `xy4 -> COMPLETE`
- `ecard2 -> COMPLETE`
- `g1 -> COMPLETE`

This wave followed the same governing pattern throughout:

- `audit -> contract -> dry-run -> apply -> verify`

The database snapshot for the processed set-code surfaces (`cel25`, `xy7`, `xy10`, `xy9`, `xy6`, `xy3`, `xy4`, `ecard2`, `g1`) now shows:

- unresolved rows remaining: `0`
- normalization drift remaining: `0`
- duplicate canonical identities: `0`
- active identity violations: `0`
- FK orphans: `0` across all checked dependent tables

This establishes the new canonical baseline for future work.

## Problem Solved
The execution wave resolved the three identity failures that blocked the system from acting as truth infrastructure:

- canonical identity inconsistencies
- canonical-name normalization drift
- ingestion-to-canonical misalignment

The result is a stable canonical card-print layer that no longer depends on ad hoc collapse behavior, unsafe suffix guesses, or partially normalized naming surfaces.

## Decision
Grookai now enforces a strict identity-first canonical model.

That means:

- the database is the canonical truth layer for processed identity surfaces
- canonical identity changes require audit-backed deterministic proof
- no `gv_id` assignment is lawful without contract-backed resolution
- identity repair is governed by replay-safe bounded artifacts, never informal DB mutation

This is consistent with the rulebook invariant that canonical truth layers must not be mutated outside explicit governed workflows.

## System Changes Locked In
The execution wave established reusable resolution patterns that are now part of the baseline operating model:

- collapse patterns
  - base-variant collapse
  - exact-token precedence collapse
  - mixed execution decomposition before apply

- promotion patterns
  - collision-free exact-token promotion
  - bounded prefix-lane promotion
  - contract-first namespace handling before any canon expansion

- reuse patterns
  - canonical reuse realignment when identity equivalence is already proven
  - FK repoint plus deterministic merge without rewriting canonical truth

- new identity dimensions modeled explicitly
  - RC-prefix identity lane
  - delta-species / special printed-identity lanes
  - lawful persisted ambiguity rather than unsafe forced collapse

## Global Invariants
The following invariants are now locked for the processed identity wave.

### Identity Invariants
- every canonical row must resolve to exactly one active identity row
- printed identity must be preserved
- distinct printed identity lanes must remain explicit rather than inferred by unsafe fallback

### Database Invariants
- zero FK orphans
- zero duplicate canonical identities on the governed surfaces
- deterministic uniqueness remains enforceable by canonical identity key

### Normalization Invariants
- canonical names must conform to `NAME_NORMALIZE_V3`
- punctuation drift is not allowed to remain after closure
- display normalization must not alter canonical ownership

### Execution Invariants
- transformations must be deterministic
- artifacts must be replay-safe and dry-run capable
- no manual DB edits are part of the lawful identity workflow

## System Guarantees
With this baseline in place, Grookai can now safely rely on the canonical identity layer for downstream work:

- ingestion can map into canonical space without re-solving old identity debt
- pricing can trust identity ownership and canonical token uniqueness
- UI can rely on deterministic identity rendering and card targeting
- future product layers can build on stable canonical row ownership

This matters because Grookai is treating the database as system truth infrastructure, not as a loose cache of partially resolved card records.

## Forbidden Regressions
The following regressions are now explicitly prohibited:

- reintroducing duplicate canonical rows
- allowing unresolved rows to silently enter canonical surfaces
- bypassing normalization contracts
- collapsing identity without audit plus contract proof
- assigning `gv_id` without deterministic evidence
- mutating canonical truth layers through manual DB edits

## Next System Phase
With the identity layer stabilized, the next lawful directions are system expansion, not identity rework:

1. Ingestion expansion
   - additional set coverage
   - controlled JustTCG enrichment and external discovery lanes

2. Pricing system refinement
   - stronger reference/use separation
   - higher-confidence downstream pricing behavior on clean identity surfaces

3. Vault and ownership scaling
   - ownership and collection systems can now target stable canonical rows

4. Interaction network layer
   - card -> owner -> action systems can build on deterministic identity truth

## Why It Matters
This checkpoint marks the transition from identity repair mode to canonical platform mode.

Grookai no longer has to negotiate basic identity truth inside the processed execution wave. That frees future work to assume a clean foundation:

- canonical identity is stable
- normalization is clean
- FK integrity is clean
- replay-safe governance exists for future changes

The identity system is now stable enough to act as baseline infrastructure for ingestion, pricing, UI, and ownership features.
