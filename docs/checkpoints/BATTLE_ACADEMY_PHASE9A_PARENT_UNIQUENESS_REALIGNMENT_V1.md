# CHECKPOINT — Battle Academy Phase 9A Parent Uniqueness Realignment V1

Date: 2026-04-02

Status: LOCKED
Scope: Remove legacy identity enforcement from `card_prints` so canonical printed identity lives only in `card_print_identity`
Phase: BA_PHASE9A_PARENT_UNIQUENESS_REALIGNMENT_V1

---

## 1. Context

Phase 9 stopped lawfully because BA parent inserts still collided on the legacy `card_prints` uniqueness surface before the identity subsystem could apply.

Locked proof from the Phase 9 stop artifacts:

- blocker: `uq_card_prints_identity`
- duplicate `(ba_set_code, printed_number)` groups under the parent shape: `62`
- rows participating in those groups: `282`

The identity subsystem itself was not the blocker.

---

## 2. Why Legacy Parent Uniqueness Blocked BA

`card_prints.number_plain` is generated from `number`.

Legacy parent uniqueness was still enforced as:

```text
uq_card_prints_identity = (game_id, set_id, number_plain, variant_key)
```

That parent constraint predates the identity subsystem and still treated `card_prints` as the printed-identity owner.

Battle Academy now has lawful same-parent-number rows that are only distinguishable by subsystem identity dimensions. As a result, the parent constraint collapsed lawful BA rows before `card_print_identity` could own uniqueness.

---

## 3. Decision

The legacy parent identity constraint is removed.

`card_prints` is now confirmed as:

- stable canonical container
- public `gv_id` holder
- downstream reference anchor

`card_print_identity` remains:

- canonical printed-identity authority
- owner of active identity uniqueness
- owner of domain/version/hash uniqueness

No new parent uniqueness was added on:

- `(set_code, number)`
- `(set_code, number_plain)`
- any subset of BA identity fields

---

## 4. Verification Result

After local replay:

- `uq_card_prints_identity` no longer exists
- duplicate `(set_code, number_plain)` parent inserts succeed in a rolled-back verifier transaction
- `card_print_identity` still enforces:
  - one active identity row per parent
  - no duplicate active `(identity_domain, identity_key_version, identity_key_hash)`
- no schema drift was introduced beyond the intended parent-constraint removal

The BA promoter was also patched to stop writing the generated `number_plain` column directly.

---

## 5. Realigned Invariant

```text
card_prints no longer enforces canonical identity.
```

Canonical printed identity now lives in `card_print_identity` only.

---

## 6. Next Phase

Next lawful artifact:

`BA_PHASE9_BA_CANON_PROMOTION_V2 (RE-RUN)`

That rerun is allowed only because:

- parent identity enforcement has been removed
- subsystem uniqueness remains intact
- local replay remains clean
- BA dry-run is now expected to plan all `328` rows without the legacy parent collision
