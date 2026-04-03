# CHECKPOINT — Battle Academy Phase 2 Bridge V1

Date: 2026-04-01

Status: LOCKED
Scope: Battle Academy current truth, completed Phase 1 harvest, and exact Phase 2 handoff target
Phase: Battle Academy Phase 2 bridge / canon expansion preparation

---

## 1. Context

Battle Academy was originally treated as a simple set-number domain.

Prod conflict audit disproved that model. The audited BA staging surface showed that `(ba-YYYY, printed number)` is not unique across the current Battle Academy releases, so naive promotion by BA release plus printed number is not lawful.

---

## 2. What Was Completed

Battle Academy discovery and staging were completed across three upstream BA families:

- `battle-academy-pokemon`
- `battle-academy-2022-pokemon`
- `battle-academy-2024-pokemon`

Staged clean candidate counts:

- `battle-academy-pokemon` = 97
- `battle-academy-2022-pokemon` = 99
- `battle-academy-2024-pokemon` = 138
- total = 334

Battle Academy Phase 1 mapping completed with the following audited result:

- `structured_single_match_count = 184`
- `structured_multi_match_count = 6`
- `no_underlying_match_count = 138`
- `excluded_from_audit_count = 6`
- `184` active `justtcg` mappings written
- `0` incorrect mappings

This captured the deterministic underlying-identity wins only. No BA sets or BA `card_prints` were created.

---

## 3. Corrected BA Identity Law

The corrected Battle Academy contract is locked.

- Battle Academy is a curated-product overlay domain
- `(ba-YYYY, printed number)` is a routing / grouping hint only
- full BA identity requires:
  - BA release
  - BA printed number
  - validated underlying card identity
- if underlying identity is unresolved, promotion is not lawful

This conclusion is already locked in `docs/contracts/BATTLE_ACADEMY_CANON_CONTRACT_V1.md`.

---

## 4. Conflict Audit Reality

Exact audited conflict summary:

- total conflict groups = 9
- `IDENTITY_NAME_AND_TOTAL_CONFLICT = 7`
- `IDENTITY_PRINTED_TOTAL_CONFLICT = 2`
- `IDENTITY_NAME_CONFLICT = 0`

Representative proven examples:

- `ba-2020 | 043` -> `Electabuzz 43/156` vs `Electivire 43/147`
- `ba-2020 | 119` -> `Cynthia 119/156` vs `Great Ball 119/149`
- `ba-2022 | 029` -> `Turtonator 29/202` vs `Vulpix 29/264`
- `ba-2024 | 188` -> `Potion 188/198` vs `Potion 188/192`

These conflicts are the reason the old BA identity assumption was corrected in place instead of implemented.

---

## 5. Current BA Domain Split

### Phase 1 Harvested

Rows that map deterministically to existing canon:

- `184` complete

### Still Pending

- `6` structured multi-match rows
- `138` no-underlying-match rows
- `6` excluded rows

The remaining `138` no-underlying-match rows are the real BA canon-creation surface.

---

## 6. What Phase 2 Actually Is

Battle Academy Phase 2 is NOT:

- TK-style mapping
- simple overlay-only work
- naive `(ba-YYYY, number)` promotion

Battle Academy Phase 2 IS:

- creation of lawful BA canonical inventory for the no-underlying-match surface
- conflict-aware handling for the `9` known conflict groups
- preservation of the corrected BA identity law

The `6` structured-multi-match rows also remain pending, but they are not part of the already-harvested Phase 1 value and must not be treated as resolved.

---

## 7. Next Objective (Single Target)

### `BA_PHASE2_MODEL_AND_PROMOTION_V1`

This is the exact next target.

Its job is to answer, in order:

1. what canonical row shape BA Phase 2 should use
2. how BA rows with no underlying match become canon
3. how conflict groups are represented without violating the corrected contract
4. how optional linkage to underlying canon is stored when available
5. how promotion writes back to staging safely

This checkpoint does not choose schema. It only locks the next required audit / design target.

Execution scaffolding for that target is documented in `docs/plans/BATTLE_ACADEMY_PHASE2_NEXT_STEPS_V1.md`.

---

## 8. Hard Boundaries / Do Not Break

- do not revert to `(ba-YYYY, number)` uniqueness
- do not force BA into TK routing logic
- do not promote rows without lawful underlying-identity handling
- do not use fuzzy matching
- do not trust upstream BA labels as canonical truth
- do not merge BA rows into non-BA canon sets
- do not write BA canon before the Phase 2 model is chosen

---

## 9. Repo Artifacts To Read First In The New Chat

1. `docs/contracts/BATTLE_ACADEMY_CANON_CONTRACT_V1.md`
2. `docs/checkpoints/BATTLE_ACADEMY_PHASE1_AND_TK_RESOLUTION_COMPLETE.md`
3. `docs/checkpoints/BATTLE_ACADEMY_PHASE2_BRIDGE_V1.md`
4. `backend/pricing/ba_conflict_audit_v1.mjs`
5. `backend/pricing/ba_underlying_identity_audit_v1.mjs`
6. `backend/pricing/ba_phase1_mapping_write_v1.mjs`
7. `backend/pricing/ba_promote_v1.mjs`

---

## 10. Paste-Ready New Chat Opener

```md
MODE: CODEX

ROLE: Senior Engineer
REPO: C:\grookai_vault

Resume from checkpoint: BATTLE_ACADEMY_PHASE2_BRIDGE_V1

Read first:
1. docs/contracts/BATTLE_ACADEMY_CANON_CONTRACT_V1.md
2. docs/checkpoints/BATTLE_ACADEMY_PHASE1_AND_TK_RESOLUTION_COMPLETE.md
3. docs/checkpoints/BATTLE_ACADEMY_PHASE2_BRIDGE_V1.md
4. backend/pricing/ba_conflict_audit_v1.mjs
5. backend/pricing/ba_underlying_identity_audit_v1.mjs

OBJECTIVE
Design the lawful Phase 2 model and execution path for the remaining Battle Academy surface:
- 138 no-underlying-match rows
- 6 structured-multi-match rows
- 9 known conflict groups

Do not re-audit Phase 1.
Do not redo solved mapping work.
Start from the corrected BA contract and current checkpoint reality.
```

---

## 11. Why This Matters

- BA Phase 1 already captured the easy value
- Phase 2 is the real canon-expansion work
- this checkpoint exists to prevent rediscovery, contract drift, and wrong-model regression

---

LOCKED
