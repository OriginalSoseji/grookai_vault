# CHECKPOINT — Battle Academy Phase 2 Identity Model V1

Date: 2026-04-01

Status: LOCKED
Scope: BA Phase 2 working identity-model validation only
Phase: `BA_PHASE2_IDENTITY_MODEL_V1`

---

## 1. Baseline

Locked baseline commands were rerun before modeling:

- `node backend/pricing/ba_conflict_audit_v1.mjs`
- `node backend/pricing/ba_underlying_identity_audit_v1.mjs`

Expected and observed baseline:

- `mapped_underlying_count = 184`
- `conflict_group_count = 9`
- `structured_multi_match_count = 6`
- `no_underlying_match_count = 138`
- `excluded_from_audit_count = 6`

Persisted baseline artifact:

- `docs/checkpoints/ba_phase2_identity_model_baseline.json`

STOP condition for baseline drift did not trigger.

---

## 2. Working Identity Key (Phase-Local Only)

This phase validated the following working identity key:

`(ba_set_code, printed_number, normalized_printed_name)`

Where:

- `ba_set_code` = Battle Academy release identity from repo
- `printed_number` = parsed BA printed number
- `normalized_printed_name` =
  - trim whitespace
  - collapse internal whitespace
  - lowercase for comparison only

Not allowed in this phase:

- synonym expansion
- fuzzy matching
- cross-set equivalence
- variant inference
- printed_total inference

This is a working validation key only. It does not amend canonical BA identity law.

---

## 3. Model Input Surface

Source surface came only from existing audited BA data.

Candidate-grade rows included in the model:

- `328`

Rows excluded from the model because they were already excluded from audit:

- `6`

Persisted input artifact:

- `docs/checkpoints/ba_phase2_identity_model_input.json`

Each modeled row carries:

- `ba_row_id`
- `ba_set_code`
- `printed_number`
- `raw_printed_name`
- `normalized_printed_name`
- `underlying_candidate_count`
- `underlying_candidate_ids`
- `prior_classification`

---

## 4. Classification Results

Phase 2 pass 1 result:

- `distinct_canonical_model_key_count = 115`
- `ba_model_single_group_count = 52`
- `ba_model_duplicate_group_count = 63`
- `ba_underlying_reference_proven_row_count = 184`
- `ba_underlying_unknown_row_count = 144`
- `duplicate_surface_row_count = 276`

Persisted model result:

- `docs/checkpoints/ba_phase2_identity_model_pass1.json`

Interpretation:

- the working key separated the candidate-grade BA surface into `115` distinct phase-local identity groups
- `184` rows retained deterministic underlying reference only
- `144` rows remained identity-valid under the model while underlying identity stayed unknown
- duplicate surface still exists and must remain audited before any promotion phase

---

## 5. Conflict Resolution Outcome

Prior audited conflict surface:

- `total_conflict_groups = 9`
- `IDENTITY_NAME_AND_TOTAL_CONFLICT = 7`
- `IDENTITY_PRINTED_TOTAL_CONFLICT = 2`
- `IDENTITY_NAME_CONFLICT = 0`

Model outcome for those `9` groups:

- `ba_number_collision_resolved_count = 7`
- `ba_model_duplicate_count = 2`

Persisted conflict artifact:

- `docs/checkpoints/ba_phase2_conflict_resolution_v1.json`

Meaning:

- `7` prior `(ba_set_code, printed_number)` conflicts were separated by `normalized_printed_name`
- `2` prior conflicts remained isolated as `BA_MODEL_DUPLICATE` because names stayed identical and only printed-total disagreement remained

The isolated duplicate conflict groups are:

- `ba-2022 | 226 | bug catcher`
- `ba-2024 | 188 | potion`

These were isolated, not resolved, and no candidate selection was performed.

---

## 6. Structured Multi Handling

Structured multi surface:

- `source_row_count = 6`
- `ba_model_single_group_count = 1`
- `ba_model_duplicate_group_count = 1`
- `duplicate_surface_row_count = 5`

Persisted structured-multi artifact:

- `docs/checkpoints/ba_phase2_structured_multi_resolution_v1.json`

Underlying ambiguity was ignored for identity modeling in this phase, as required. The model only evaluated whether the phase-local key was unique or duplicate.

---

## 7. No-Underlying Handling

No-underlying surface:

- `source_row_count = 138`
- `ba_underlying_unknown_row_count = 138`
- `ba_model_single_group_count = 19`
- `ba_model_duplicate_group_count = 30`
- `duplicate_surface_row_count = 119`

Persisted no-underlying artifact:

- `docs/checkpoints/ba_phase2_no_underlying_reclassification_v1.json`

All `138` no-underlying rows were reclassified as `BA_UNDERLYING_UNKNOWN` and then grouped only by the phase-local working key.

---

## 8. Verification

Verification artifact:

- `docs/checkpoints/ba_phase2_identity_model_verification.json`

All verification checks passed:

- `V1_NO_HEURISTIC_LOGIC_PRESENT`
- `V2_NO_CANON_WRITES_PERFORMED`
- `V3_NO_GV_ID_GENERATED`
- `V4_ALL_CONFLICTS_RESOLVED_OR_ISOLATED`
- `V5_STRUCTURED_MULTI_HANDLED_DETERMINISTICALLY`
- `V6_NO_UNDERLYING_ROWS_PROPERLY_CLASSIFIED`
- `V7_NO_CROSS_SET_MERGES_PERFORMED`

This phase stayed read-only.

---

## 9. Boundary Statement

This phase validates a working identity key and does not amend canonical BA identity law. Canon promotion is gated to a future phase pending contract confirmation.

No promotion was performed.

Next phase boundary:

- `BA_PHASE3_SAFE_PROMOTION_V1`

Promotion is not lawful until:

- the working model key is treated as sufficient for the intended promotion surface
- duplicates are resolved or explicitly audited
- contract authority explicitly permits promotion

---

LOCKED
