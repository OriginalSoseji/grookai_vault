# CHECKPOINT — Battle Academy Phase 9 BA Canon Promotion V3

Date: 2026-04-02

Status: COMPLETE
Scope: Fully automated, deterministic BA canon promotion under the identity subsystem
Phase: BA_PHASE9_BA_CANON_PROMOTION_V3

---

## 1. Execution Flow

This is the authoritative final BA execution checkpoint.
`BATTLE_ACADEMY_PHASE9_BA_CANON_PROMOTION_V2.md` remains preserved as the historical lawful stop record that preceded this successful execution.

Phase 9 V3 executed in the required order:

1. Pre-flight dry-run
2. FK and domain validation
3. Apply promotion
4. Post-apply verification
5. Explicit second apply for write-path idempotency

The pipeline ran without manual DB intervention.

---

## 2. Identity Law Used

BA promotion used the approved subsystem identity:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

Stored as:

- `identity_domain = 'pokemon_ba'`
- `identity_key_version = 'pokemon_ba:v1'`

---

## 3. Pre-Flight Result

Dry-run passed exactly:

- `total_candidates = 328`
- `insert_card_prints_count = 328`
- `insert_identity_rows_count = 328`
- `blocker_count = 0`

FK/domain gates also passed:

- exactly `1` canonical Pokemon row exists in `public.games`
- all BA release sets resolve through that row
- `tcg_pocket` remains excluded
- blocked unknown domains remain `0`

---

## 4. Promotion Result

Apply inserted:

- `328` BA `card_prints` rows
- `328` BA `card_print_identity` rows

No non-BA canon domains were touched.
No external mapping anchor changed.
No `variant_key` shortcut was used.

---

## 5. Verified Invariants

Post-apply verification passed:

- BA `card_prints` count = `328`
- BA active identity rows = `328`
- active identity hash uniqueness holds
- one active identity row exists per BA parent row
- BA `gv_id` uniqueness holds
- `tcg_pocket` identity rows remain `0`
- `external_mappings` still references `card_prints`
- no BA cross-domain leakage exists

---

## 6. Idempotency Proof

The explicit second apply produced:

- inserted `card_prints = 0`
- inserted identity rows = `0`
- skipped existing = `328`

This proves the Phase 9 BA promotion path is idempotent at the write path itself, not only at dry-run.

---

## 7. Final System State

The Battle Academy canon surface is now live locally under the identity subsystem.

Locked invariant:

```text
All BA canonical cards are represented by exactly one card_print and one active identity row under pokemon_ba:v1.
```

Domain isolation also holds:

```text
BA rows exist only under pokemon_ba and tcg_pocket remains excluded from identity rows.
```
