# CHECKPOINT — BA Phase 7 Identity Backfill Plan V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact phased backfill design for the identity subsystem
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Phase 7A — Schema Introduction Design

Prerequisites:

- subsystem contract approved
- table/constraint/index design approved

Inputs:

- Phase 7 table design
- Phase 7 constraint design
- Phase 7 index design

Outputs:

- migration-ready DDL plan for `public.card_print_identity`
- migration-ready partial-unique enforcement plan

Verification:

- table shape matches design exactly
- C1-C5 are migration-ready
- no `variant_key` shortcut is introduced

Stop conditions:

- any column, constraint, or index remains ambiguous
- domain guard is not exact

Rollback posture:

- do not write migrations

---

## 2. Phase 7B — Existing Canon Domain Backfill Design

Prerequisites:

- Phase 7A design approved
- domain field matrix approved
- hash design approved

Inputs:

- existing `card_prints`
- current domain contracts
- current `gv_id` and mapping continuity decisions

Outputs:

- one active identity-row design projection per existing `card_print`
- domain-specific `identity_domain`, `identity_key_version`, and `identity_key_hash`

Verification:

- every existing `card_print` can be projected
- no domain/version hash collisions remain
- no required field is missing for the chosen domain projection

Stop conditions:

- any existing row cannot be assigned a lawful domain/version
- any hash collision appears within a domain/version pair

Rollback posture:

- stop at design; do not move to binding or BA enablement

---

## 3. Phase 7C — Binding Verification Design

Prerequisites:

- Phase 7B projection complete

Inputs:

- projected identity rows
- active-row constraint plan

Outputs:

- verification plan proving one active identity row per `card_print`
- final-state proof for C6

Verification:

- `NOT EXISTS` duplicate-active parent rows
- `NOT EXISTS` identity-less parent rows
- active uniqueness and domain/hash uniqueness both hold

Stop conditions:

- any `card_print` has zero active identity rows
- any `card_print` has more than one active identity row

Rollback posture:

- keep subsystem introduction blocked

---

## 4. Phase 7D — GV ID Derivation Alignment Design

Prerequisites:

- active identity-row projection verified
- `gv_id` design approved

Inputs:

- active identity rows
- `GV_ID_ASSIGNMENT_V1`
- domain-specific `gv_id` projection rules

Outputs:

- migration-ready plan for preserving existing `gv_id`s and generating missing/new ones

Verification:

- existing non-null `gv_id`s remain stable
- null `gv_id` backfill path is deterministic
- BA projection uses full BA identity law

Stop conditions:

- any domain lacks an exact projection
- any proposed rewrite would silently change existing public `gv_id`s

Rollback posture:

- preserve current `gv_id` behavior only

---

## 5. Phase 7E — BA Enablement Design

Prerequisites:

- Phases 7A through 7D approved
- BA unblock conditions still active

Inputs:

- BA set registration plan
- `328` BA promotion candidates
- BA storage alignment target

Outputs:

- migration-ready plan for representing BA identity rows in `card_print_identity`
- zero-collision proof for BA domain projection
- exact preconditions for the later BA promotion phase

Verification:

- BA sets are defined as required release containers
- `328` BA candidates map losslessly into `pokemon_ba:v1`
- no BA domain collisions appear

Stop conditions:

- BA identity projection loses any of the 4D fields
- BA sets are not designed as lawful release containers
- BA collision proof fails

Rollback posture:

- BA remains blocked

---

## 6. Order Rule

These phases are sequential.

Hard rule:

- Phase 7E must not be implemented before 7A through 7D are approved and verified
