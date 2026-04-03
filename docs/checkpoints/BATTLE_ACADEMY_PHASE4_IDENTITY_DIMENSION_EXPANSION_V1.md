# CHECKPOINT — Battle Academy Phase 4 Identity Dimension Expansion V1

Date: 2026-04-02

Status: LOCKED
Scope: BA identity-dimension expansion using existing repo evidence only
Phase: `BA_PHASE4_IDENTITY_DIMENSION_EXPANSION_V1`

---

## 1. Context

Phase 3 proved the Phase 2 working key was insufficient.

The exact-key duplicate audit classified all `63` duplicate groups as `MODEL_INSUFFICIENT`, which means the Phase 2 key:

`(ba_set_code, printed_number, normalized_printed_name)`

did not capture all printed evidence already present in repo artifacts.

Phase 4 therefore tested explicit key expansions using only existing artifact fields. No new data source, no heuristic logic, and no canon write path were introduced.

---

## 2. Why Phase 3 Failed

Locked Phase 3 result carried into this phase:

- `BA_MODEL_DUPLICATE groups = 63`
- all `63` classified as `MODEL_INSUFFICIENT`

Dimension-diff surface confirmed:

- `source_name_raw` differed in all `63` duplicate groups
- `number_raw` differed in `2` duplicate groups
- `parsed_printed_total` differed in `2` duplicate groups
- `raw_printed_name` differed in `0` duplicate groups

Persisted diff artifact:

- `docs/checkpoints/ba_phase4_dimension_diff_surface_v1.json`

This means the duplicate surface was entirely attributable to printed evidence already present in saved artifacts, with `source_name_raw` as the dominant missing dimension.

---

## 3. Tested Dimension Keys

Tested keys:

- `K1 = (ba_set_code, printed_number, normalized_printed_name)`
- `K2 = K1 + number_raw`
- `K3 = K1 + parsed_printed_total`
- `K4 = K1 + source_name_raw`
- `K5 = K1 + raw_printed_name`
- `K6 = K1 + (number_raw, parsed_printed_total)`
- `K7 = K1 + (number_raw, source_name_raw)`
- `K8 = K1 + (parsed_printed_total, source_name_raw)`
- `K9 = K1 + (number_raw, parsed_printed_total, source_name_raw)`

Rules remained unchanged from the phase definition:

- no derived fields
- no normalization beyond Phase 2 rules
- no inference
- combinations explicit only

Persisted test artifact:

- `docs/checkpoints/ba_phase4_dimension_test_results_v1.json`

---

## 4. Duplicate Reduction Per Key

Results:

- `K1` -> `distinct_keys=115`, `groups_single=52`, `groups_duplicate=63`, `remaining_duplicates=63`, `INSUFFICIENT`
- `K2` -> `distinct_keys=117`, `groups_single=53`, `groups_duplicate=64`, `remaining_duplicates=64`, `INSUFFICIENT`
- `K3` -> `distinct_keys=117`, `groups_single=53`, `groups_duplicate=64`, `remaining_duplicates=64`, `INSUFFICIENT`
- `K4` -> `distinct_keys=328`, `groups_single=328`, `groups_duplicate=0`, `remaining_duplicates=0`, `MINIMALLY_SUFFICIENT`
- `K5` -> `distinct_keys=115`, `groups_single=52`, `groups_duplicate=63`, `remaining_duplicates=63`, `INSUFFICIENT`
- `K6` -> `distinct_keys=117`, `groups_single=53`, `groups_duplicate=64`, `remaining_duplicates=64`, `INSUFFICIENT`
- `K7` -> `distinct_keys=328`, `groups_single=328`, `groups_duplicate=0`, `remaining_duplicates=0`, `MINIMALLY_SUFFICIENT`
- `K8` -> `distinct_keys=328`, `groups_single=328`, `groups_duplicate=0`, `remaining_duplicates=0`, `MINIMALLY_SUFFICIENT`
- `K9` -> `distinct_keys=328`, `groups_single=328`, `groups_duplicate=0`, `remaining_duplicates=0`, `MINIMALLY_SUFFICIENT`

Key observations:

- `number_raw` alone and `parsed_printed_total` alone only split the two named prior-conflict groups and did not reduce the broader duplicate surface
- `raw_printed_name` added no new separation
- `source_name_raw` eliminated the entire duplicate surface when added to the key

---

## 5. Named Conflict Resolution

Named prior-conflict duplicates:

- `ba-2022::226::bug catcher`
- `ba-2024::188::potion`

Resolution results:

- `K1` did not resolve either group
- `K2`, `K3`, and `K6` partially split each group into `2` resulting groups but left duplicates
- `K4`, `K7`, `K8`, and `K9` fully resolved both groups into `5` single-row groups each

This confirms that `source_name_raw` is the decisive artifact field for the current duplicate surface, including the named prior-conflict cases.

---

## 6. Selected Candidate Identity Key

Selected:

- `candidate_identity_key_v1 = K4`

Expanded key:

`(ba_set_code, printed_number, normalized_printed_name, source_name_raw)`

Reason:

- it is the smallest tested key by dimension count that achieved `MINIMALLY_SUFFICIENT`
- it reduced `remaining_duplicates` from `63` to `0`
- it used only fields already present in existing repo artifacts

This is a candidate key for contract evaluation only. It is not canon law yet.

---

## 7. Verification

Persisted verification artifact:

- `docs/checkpoints/ba_phase4_dimension_verification_v1.json`

All verification checks passed:

- `V1_ALL_DIMENSIONS_FROM_REPO_ARTIFACTS`
- `V2_NO_FUZZY_MATCHING_USED`
- `V3_NO_CROSS_SET_INFERENCE`
- `V4_NO_EXTERNAL_DATA_USED`
- `V5_NO_CANON_WRITES_PERFORMED`
- `V6_NO_GV_ID_GENERATED`
- `V7_NO_MAPPINGS_WRITTEN`

This phase remained read-only.

---

## 8. Boundary Statement

This phase expands the identity model using existing evidence only. It does not amend canonical identity law. The resulting key is a candidate for contract evaluation.

No promotion was performed.

---

## 9. Next Phase Boundary

Because a minimally sufficient candidate key was found, the lawful next phase is:

- `BA_PHASE5_CONTRACT_AMENDMENT_V1`

`BA_PHASE5_FURTHER_DIMENSION_EXPANSION_V2` is not indicated by the current evidence because at least one minimal tested key already resolves the duplicate surface.

---

LOCKED
