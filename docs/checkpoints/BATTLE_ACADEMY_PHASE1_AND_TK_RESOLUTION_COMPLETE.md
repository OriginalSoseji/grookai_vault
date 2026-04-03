# CHECKPOINT — TK Resolution + Battle Academy Phase 1 Complete

Date: 2026-04-01

Status: LOCKED
Scope: TK domain resolution + BA Phase 1 mapping
Phase: External Identity Resolution -> Canon Expansion Preparation

---

## 1. CONTEXT

Grookai was processing unresolved external data from JustTCG ingestion.

Unresolved bucket snapshot:

- OTHER = 5,286
- DECK_EXCLUSIVE_VERIFY = 477
- BATTLE_ACADEMY_VERIFY = 420
- TK_KIT_TARGET = 213
- CELC_VERIFY = 7

Goal:

- reduce unresolved domains into deterministic, bounded workflows
- avoid canon corruption
- follow Audit -> Contract -> Dry-Run -> Apply -> Verify

---

## 2. PROBLEM

### TK Kits

- initial mapping failed
- identity ambiguous due to dual-deck structure
- naive matching caused collisions

### Battle Academy

- treated initially as standalone set domain
- promotion failed due to:
  - number collisions
  - mixed upstream identity
  - product-context noise

---

## 3. ROOT CAUSE

### TK

- identity = (deck + slot)
- missing deck resolution caused ambiguity

### Battle Academy

- `(ba-YYYY, number)` is NOT unique
- upstream mixes multiple source sets into one numbering space
- underlying card identity is required

---

## 4. DECISION

### TK

Adopt deterministic manifest-driven resolution:

`identity = (deck + slot)`

Workflow:

`raw -> staged -> manifest resolution -> mapping repair`

### Battle Academy (Phase 1)

Adopt hybrid model:

identity requires:

- BA release
- BA printed number
- underlying card identity

Split BA into:

- Phase 1 -> underlying identity mapping (existing canon)
- Phase 2 -> BA canonical overlay (future)

---

## 5. IMPLEMENTATION RESULTS

### TK (Completed)

- deterministic resolution achieved
- mapping repaired safely
- no canon corruption
- reusable pattern established

### Battle Academy Phase 1 (Completed)

Results:

- total_target_rows = 334
- structured_single_match_count = 184
- mappings_written = 184
- missing_count = 0
- incorrect_count = 0

Remaining:

- structured_multi_match = 6
- no_underlying_match = 138
- excluded = 6

No BA sets or BA `card_prints` created.

---

## 6. CURRENT TRUTH

Grookai now has:

### External Identity Resolution Pattern (LOCKED)

```text
raw_imports
-> staging (bucketed)
-> deterministic identity resolution
-> audit existing mappings
-> repair-only mapping write
```

### Domain Types

1. Standard Sets
   identity = (set + number)

2. TK
   identity = (deck + slot)

3. Battle Academy
   identity = (ba release + number + underlying card identity)

---

## 7. INVARIANTS (CRITICAL)

- Never map without deterministic identity
- Never promote without contract alignment
- Never overwrite correct mappings
- Never trust upstream as canonical authority
- Always fail closed on ambiguity
- Staging is the only lawful promotion surface

---

## 8. WHAT WAS SOLVED

- TK domain fully operational
- BA Phase 1 value captured (184 mappings)
- unresolved data reduced and structured
- ambiguity isolated into small bounded sets

---

## 9. WHAT REMAINS

### Battle Academy Phase 2

- 138 rows require canonical BA overlay creation
- requires schema decision (overlay vs separate prints)

### BA Conflicts

- 9 conflict groups
- require explicit identity handling

### Other Buckets

- Deck Exclusives
- Battle Academy Phase 2
- OTHER (system-level work)

---

## 10. WHY THIS MATTERED

- prevented incorrect canon model
- avoided large-scale data corruption
- converted unbounded problem -> structured execution
- created reusable ingestion + resolution system

---

## 11. NEXT RECOMMENDED STEP

Do NOT continue BA blindly.

Next artifact:

`BA_OVERLAY_MODEL_CONTRACT_V1`

This defines how BA canonical prints are created.

---

## 12. FINAL STATE

Grookai moved from:

`"unresolved external data"`

to:

`"deterministic identity system with bounded unresolved domains"`

---

LOCKED
