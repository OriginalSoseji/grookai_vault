# Battle Academy Phase 2 Next Steps V1

Date: 2026-04-01

Status: Planning Only  
Scope: `BA_PHASE2_MODEL_AND_PROMOTION_V1`

---

## Objective

Define the lawful Phase 2 model and execution path for the remaining Battle Academy surface without violating the corrected BA contract.

Target remaining surface:

- `138` no-underlying-match rows
- `6` structured-multi-match rows
- `9` known conflict groups

---

## Inputs

Read in this order:

1. `docs/contracts/BATTLE_ACADEMY_CANON_CONTRACT_V1.md`
2. `docs/checkpoints/BATTLE_ACADEMY_PHASE1_AND_TK_RESOLUTION_COMPLETE.md`
3. `docs/checkpoints/BATTLE_ACADEMY_PHASE2_BRIDGE_V1.md`
4. `backend/pricing/ba_conflict_audit_v1.mjs`
5. `backend/pricing/ba_underlying_identity_audit_v1.mjs`
6. `backend/pricing/ba_phase1_mapping_write_v1.mjs`
7. `backend/pricing/ba_promote_v1.mjs`

---

## Required Questions

The next implementation chat must answer these before any write path is built:

1. What canonical row shape is lawful for BA Phase 2?
2. How do no-underlying-match rows become canon without reverting to `(ba-YYYY, number)` uniqueness?
3. How are the `9` known conflict groups represented under the corrected identity law?
4. How is optional linkage to underlying canon stored when it exists?
5. How does Phase 2 write back to staging safely and deterministically?

---

## Boundaries

- Do not re-audit solved Phase 1 mapping work
- Do not create BA sets or BA `card_prints` before the model is chosen
- Do not use fuzzy matching
- Do not trust upstream BA labels as canonical truth
- Do not merge BA rows into non-BA canon sets
- Do not force BA into TK-style routing
- Do not choose schema without audit support

---

## Expected Output

The next artifact should be:

`BA_PHASE2_MODEL_AND_PROMOTION_V1`

It should be an audit-backed design / governance artifact first, then implementation only after the model is locked.
