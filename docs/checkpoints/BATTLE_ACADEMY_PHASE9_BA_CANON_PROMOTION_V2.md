# CHECKPOINT — Battle Academy Phase 9 BA Canon Promotion V2

Date: 2026-04-02

Status: LOCKED STOP
Scope: Phase 9 BA canon promotion attempt under the identity subsystem
Phase: BA_PHASE9_BA_CANON_PROMOTION_V2

---

## 1. Context

Phase 8 and Phase 8A established that:

- the identity subsystem exists and replays locally
- `tcg_pocket` is excluded from canonical identity rollout
- BA identity is lawfully represented by:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

- BA storage is possible in `card_print_identity`

Phase 9 attempted pure execution of BA canon promotion under Option B.

---

## 2. Identity Law Used

Phase 9 used the approved BA identity subsystem realization:

- `identity_domain = 'pokemon_ba'`
- `identity_key_version = 'pokemon_ba:v1'`
- full BA identity key:
  - `ba_set_code`
  - `printed_number`
  - `normalized_printed_name`
  - `source_name_raw`

`gv_id` planning also used the full BA identity inputs.

---

## 3. Promotion Execution Summary

Locked authorities held:

- BA promotion candidates: `328`
- BA sets registered locally:
  - `ba-2020`
  - `ba-2022`
  - `ba-2024`
- `tcg_pocket` excluded cleanly from identity rollout

Initial dry run planned:

- `328` candidate rows
- `328` parent `card_prints` inserts
- `328` `card_print_identity` inserts
- `0` existing rows to reuse

Apply then stopped lawfully before any committed BA canon write.

---

## 4. Exact Stop Reason

Phase 9 exposed a remaining storage blocker on the parent `card_prints` surface.

Confirmed local schema fact:

- `card_prints.number_plain` is a generated column:

```text
regexp_replace(number, '[^0-9]', '', 'g')
```

- `card_prints` still enforces:

```text
uq_card_prints_identity = (game_id, set_id, number_plain, variant_key)
```

This means lawful BA parent inserts still collide before the identity subsystem can own uniqueness, because BA has many same-release same-number rows that are only distinguished by the subsystem identity dimensions.

Measured BA collision surface against the parent-row uniqueness shape:

- duplicate `(ba_set_code, printed_number)` groups: `62`
- rows participating in those groups: `282`

Representative duplicate groups:

- `ba-2020::043` -> `5`
- `ba-2020::119` -> `16`
- `ba-2020::120` -> `9`
- `ba-2020::189` -> `8`
- `ba-2024::188` -> `5`

Because `variant_key` cannot be used as a BA identity shortcut and `number_plain` is generated from `number`, parent-row insertion remains unlawful under the current Phase 8 schema.

---

## 5. Verification Summary

Phase 9 did not reach post-insert verification.

Reason:

- dry-run preflight was patched to fail closed on the parent-row uniqueness blocker
- apply therefore cannot proceed lawfully
- verification script was not run after the blocker was confirmed

What is confirmed:

- BA identity ambiguity is not the blocker
- `tcg_pocket` isolation is not the blocker
- external mappings continuity is unchanged
- `gv_id` continuity design remains unchanged

---

## 6. Idempotency Status

Idempotent promotion was not demonstrated because no lawful BA insert path currently exists on the parent `card_prints` surface.

No BA canon rows were committed in this phase.

Current execution result:

- inserted `card_prints`: `0`
- inserted `card_print_identity`: `0`
- reused existing rows: `0`

---

## 7. Domain Isolation Confirmation

Confirmed during the Phase 9 attempt:

- `tcg_pocket` remains excluded from canonical identity rollout
- no `tcg_pocket` identity rows were created
- no `external_mappings` anchor changed
- `gv_id` storage did not move off `card_prints`
- `variant_key` was not repurposed as a BA identity discriminator

---

## 8. Invariant Status

The requested target invariant was **not established** in this phase.

Target invariant:

```text
All BA canonical cards are represented by exactly one card_print and one active identity row under pokemon_ba:v1
```

Current truth:

```text
No BA canonical cards were inserted because parent-row uniqueness still blocks lawful BA promotion.
```

---

## 9. Boundary

This phase did not promote BA canon rows.

No BA `card_prints` were committed.
No BA `card_print_identity` rows were committed.
No BA `gv_id` values became live canon rows.

The stop is now explicitly architectural:

- identity subsystem storage is present
- BA identity law is proven
- parent `card_prints` uniqueness is still incompatible with lawful BA same-number parent rows
