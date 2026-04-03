# CHECKPOINT — Battle Academy Phase 6 Canon Promotion V1

Date: 2026-04-02

Status: STOPPED
Scope: BA canon-promotion execution audit
Phase: BA_PHASE6_CANON_PROMOTION_V1

---

## 1. Context

Phase 5 finalized the Battle Academy identity law as:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

Phase 6 attempted the first lawful canon-promotion pass against that identity law.

Locked Phase 5 expectations held:

- `328` `PROMOTION_ELIGIBLE_CANDIDATE` rows
- zero identity-key collisions
- zero planned `gv_id` collisions

---

## 2. What Was Tested

The Phase 6 worker performed a deterministic preflight against live canon.

Checked:

- Phase 5 candidate count and identity key
- live `card_prints` support for `normalized_printed_name`
- live `card_prints` support for `source_name_raw`
- presence of Battle Academy release sets:
  - `ba-2020`
  - `ba-2022`
  - `ba-2024`
- existing BA canon rows
- planned `gv_id` uniqueness on the candidate surface

No canon writes were executed.

---

## 3. Promotion Result

Phase 6 did not promote.

Dry run result:

- `status = STOPPED_PRECONDITION_FAILURE`
- `total_candidates = 328`
- `inserted_count = 0`
- `skipped_existing_count = 0`
- `existing_ba_canon_row_count = 0`

The candidate surface is deterministic.
The storage surface is not yet lawful.

---

## 4. Exact Blockers

The worker stopped for two live preconditions:

1. Missing identity columns on `public.card_prints`

- `normalized_printed_name`
- `source_name_raw`

2. Missing Battle Academy release containers in `public.sets`

- `ba-2020`
- `ba-2022`
- `ba-2024`

These are hard blockers.
Phase 6 cannot insert lawful BA canon rows without them.

---

## 5. Live Schema Reality

Direct live Postgres metadata confirmed the current canonical storage shape is still:

- `card_prints.set_id` is required
- `card_prints` uniqueness is enforced by:

```text
uq_card_prints_identity = (game_id, set_id, number_plain, variant_key)
```

That is not the Phase 5 BA identity law.

Using current schema fields as a silent substitute for:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

would require an unaudited representation decision.
This phase does not permit that.

---

## 6. Verification Outcome

`ba_phase6_contract_verification_v1.json` produced:

- `V2` passed: identity key uniqueness
- `V3` passed: planned `gv_id` uniqueness
- `V5` passed: no cross-set contamination
- `V6` passed: no null identity fields on the candidate surface

Blocked:

- `V1` inserted-row count, because no lawful insert could run
- `V4` idempotency rerun, because no lawful insert could run
- `V7` schema can store identity key, because required columns are missing
- `V8` BA release sets present, because release sets are missing

---

## 7. Invariant

No BA canon row exists outside the 4D identity key.

Current live result:

- no BA canonical rows were inserted
- no BA release sets were created
- no mappings were written
- no existing canon rows were mutated

---

## 8. Meaning

Battle Academy identity ambiguity is no longer the blocker.

The blocker is now canonical storage compatibility:

- the live schema cannot yet store the lawful BA identity dimensions
- the required BA release set containers do not yet exist

Phase 6 therefore stops cleanly and non-destructively.

No promotion is lawful until storage is aligned to the Phase 5 identity law.
