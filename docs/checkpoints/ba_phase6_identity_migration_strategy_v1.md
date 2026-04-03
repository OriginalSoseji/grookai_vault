# CHECKPOINT — BA Phase 6 Identity Migration Strategy V1

Date: 2026-04-02

Status: LOCKED
Scope: Migration-design boundary for Option B identity subsystem
Phase: BA_PHASE6_IDENTITY_SUBSYSTEM_ARCHITECTURE_V1

---

## 1. Purpose

This artifact defines the exact migration phases required to introduce the identity subsystem without drift.

It is design only.
No migration is written here.

---

## 2. Phase A — Create `card_print_identity` Table And Constraints

Inputs:

- `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md`
- current live `card_prints` schema and uniqueness
- current live `external_mappings` foreign-key behavior

Outputs:

- migration-ready table definition for `card_print_identity`
- migration-ready uniqueness constraints
- migration-ready active-identity constraint strategy

No-drift checks:

- required contract fields are represented
- uniqueness is owned by `card_print_identity`
- `card_prints` authority is not silently moved
- no identity dimension is hidden in `variant_key`

Failure gates:

- required contract fields cannot be represented cleanly
- active-identity rule is ambiguous
- uniqueness still depends on `card_prints` shortcuts

Rollback posture:

- do not apply the migration
- keep current schema unchanged
- revise migration design before execution

---

## 3. Phase B — Backfill Identity Rows For Existing Canon

Inputs:

- live `card_prints`
- existing domain contracts for current canon
- explicit domain-to-identity projection rules

Outputs:

- one candidate canonical identity row per existing `card_print`
- deterministic `identity_domain`, `identity_key_version`, and `identity_key_hash`

No-drift checks:

- every existing `card_print` projects deterministically
- no hash collisions under the same domain and version
- no heuristics are used

Failure gates:

- any current canon row cannot be projected deterministically
- collisions appear inside a domain/version pair
- a domain contract is missing

Rollback posture:

- stop before binding anything to downstream behavior
- keep backfill in staging or transaction scope only

---

## 4. Phase C — Bind `card_prints` To Active Canonical Identity Rows

Inputs:

- completed backfill output
- validated active-identity selection rule

Outputs:

- one active canonical identity row bound to each `card_print`
- auditable parent-to-identity linkage

No-drift checks:

- exactly one active identity per `card_print`
- no orphan identity rows
- no `card_print` without an active identity

Failure gates:

- more than one active identity per `card_print`
- no active identity for any `card_print`
- linkage would force canon mutation outside approved rules

Rollback posture:

- revert the binding step only
- preserve pre-bind canon state

---

## 5. Phase D — Adapt `gv_id` Derivation Path

Inputs:

- bound active identity rows
- `GV_ID_ASSIGNMENT_V1.md`
- existing `gv_id` builder behavior

Outputs:

- migration-ready derivation path that reads from active identity rows
- compatibility plan for existing `card_prints.gv_id`

No-drift checks:

- public `gv_id` remains stored on `card_prints`
- existing lawful `gv_id` values are preserved unless an explicit backfill contract says otherwise
- derivation uses only governed identity inputs

Failure gates:

- `gv_id` ownership becomes ambiguous
- proposed derivation breaks existing public routing
- planned derivation depends on heuristics

Rollback posture:

- preserve current `gv_id` assignment path
- do not switch runtime derivation

---

## 6. Phase E — Enable BA Promotion Using Identity Subsystem

Inputs:

- approved subsystem contract
- approved migration execution
- live identity subsystem
- BA release set registration plan
- BA promotion candidates

Outputs:

- lawful BA canonical insert path through `card_print_identity`
- `gv_id` derivation from active identity rows
- post-insert mapping path anchored to `card_prints`

No-drift checks:

- BA candidates project into `pokemon_ba` without collision
- BA release sets exist lawfully
- BA inserts are idempotent and contract-compliant

Failure gates:

- any BA identity collision remains
- BA release containers are missing
- `gv_id` derivation path is not verified under the subsystem

Rollback posture:

- stop before BA insert
- leave canon unchanged

---

## 7. Sequence Rule

These phases are ordered.

Hard rule:

- Phase E must not begin before Phases A through D are approved and verified

This artifact exists to keep the migration path replayable from the Phase 6 baseline.
