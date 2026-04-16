# SOURCE_BASED_INTAKE_V1_COMPLETE

## Context

Perfect Order (ME03) exposed a system limitation:

- External discovery (JustTCG) could identify valid missing cards
- But warehouse pipeline was designed only for image-backed intake
- No lawful path existed from:
  `external_discovery_candidates -> canon_warehouse_candidates -> promotion`

This created a structural gap between:

- discovery
- canonical promotion

## Problem

Three critical blockers were identified:

1. Search contract drift
   - classifier depended on `number_plain`
   - search surface exposed `number_digits`, not `number_plain`
   - classification crashed

2. Evidence model mismatch
   - warehouse required image evidence
   - source-backed candidates had structured identity instead
   - classification blocked legitimate candidates

3. Staging / promotion incompatibility
   - normalization asset required (image-based)
   - source-backed candidates had no image
   - stage worker blocked
   - promotion risk of accidental auto-approval

Additionally:

4. Variant key semantic error
   - base rows used `variant_key = ""`
   - caused identity ambiguity and uniqueness risks

## Risk

Without correction:

- canon could be polluted by:
  - fake user submissions
  - noisy external data
- identity collisions would:
  - merge distinct cards
  - corrupt pricing and mapping
- promotion could:
  - bypass founder control
  - introduce irreversible DB drift

## Decision

Introduce a new governed intake path:

`SOURCE-BASED IDENTITY INTAKE`

Key rules:

1. Dual evidence model
   - image-backed candidates (existing)
   - source-backed candidates (new)

2. Auto-intake allowed
   - discovery -> bridge -> warehouse
   - classification
   - metadata extraction
   - staging preparation

3. Auto-promotion forbidden
   - no automatic canon writes
   - explicit founder approval required

4. Variant identity enforcement
   - same-name same-number collisions split via `variant_key`
   - base rows must use `variant_key = NULL`
   - collision rows require deterministic non-null keys

## System Changes

1. External Discovery Bridge V1
   - Introduced scoped bridge:
     `external_discovery_candidates -> canon_warehouse_candidates (RAW)`
   - Preserved:
     - `claimed_identity_payload`
     - `reference_hints_payload`
     - `variant_identity`
   - Enforced:
     - product exclusion
     - idempotency
     - collision resolution

2. Warehouse Source Identity Contract V1
   - classifier accepts source-backed identity as valid evidence
   - image requirement bypassed for bridge-sourced candidates
   - metadata extraction derives from payload instead of image
   - staging allows `CREATE_CARD_PRINT` without normalization asset

3. Search contract alignment
   - classifier switched to `number_digits`
   - internal normalization restored canonical `number_plain`

4. Variant key null contract
   - `variant_key = NULL` for base identity
   - empty string prohibited
   - enforced across:
     - backend
     - staging
     - interpreter
     - write-plan
     - web layer

5. Promotion hardening
   - removed auto-approval behavior
   - stage worker no longer simulates founder approval
   - executor requires explicit founder approval
   - source-backed rows now land as:
     `STAGED_FOR_PROMOTION + FOUNDER_APPROVAL_REQUIRED`

6. Staging immutability preserved
   - no mutation of frozen payloads
   - legacy rows superseded, not edited

## Current System State

Perfect Order (ME03):

- 130 valid singles candidates identified
- 25 product rows excluded
- 6 collision groups resolved (12 rows)

Warehouse:

- 130 candidates in:
  `STAGED_FOR_PROMOTION + FOUNDER_APPROVAL_REQUIRED`
- 0 `RAW`
- 0 `BLOCKED`

Canon:

- `sets`: 0
- `card_prints`: 0

Collision integrity:

- all pairs preserved:
  - `illustration_rare`
  - `shiny_rare`

Variant key semantics:

- base rows: `NULL`
- collision rows: deterministic non-null

Executor:

- hard-blocks without founder approval
- verified via dry-run preflight failure

## Invariants (Locked)

1. Canon writes are never automatic
2. Source-backed intake does not imply trust
3. `variant_key = NULL` is the only valid base state
4. Same-number identity collisions must split canon rows
5. Image evidence is optional when identity is structurally proven
6. Staging does not equal approval
7. Executor is the only canon write surface
8. Executor requires explicit founder approval

## Alternatives Rejected

- direct canon creation from JustTCG raws -> rejected (violates authority model)
- auto-promotion of source-backed rows -> rejected (unsafe)
- treating variant splits as child printings -> rejected (incorrect identity)
- using empty string `variant_key` -> rejected (breaks identity model)
- mutating staging payloads in place -> rejected (violates immutability)

## Why This Matters

This checkpoint establishes:

- Grookai can safely ingest reality from:
  - users
  - external sources
  - future AI systems

- canon remains:
  - deterministic
  - auditable
  - founder-controlled

- missing cards become:
  - discoverable
  - structured
  - promotable without risk

This transforms Grookai from:

- a scanner / tracker

into:

- a canonical identity system with controlled ingestion

## Result

`SOURCE-BASED INTAKE V1` is complete.

System is now capable of:

- discovering missing cards from external sources
- resolving identity (including collisions)
- preparing canonical candidates automatically
- preventing unsafe promotion

Canon remains protected and fully governed.

## Next Step

Safe canon promotion (founder-controlled)

- explicit approval of Perfect Order candidates
- controlled executor run
- post-promotion verification checkpoint
