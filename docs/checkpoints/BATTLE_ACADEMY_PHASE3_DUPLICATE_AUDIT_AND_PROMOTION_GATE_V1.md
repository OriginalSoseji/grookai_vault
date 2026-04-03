# CHECKPOINT — Battle Academy Phase 3 Duplicate Audit And Promotion Gate V1

Date: 2026-04-01

Status: LOCKED
Scope: BA exact-key duplicate audit and lawful promotion gate only
Phase: `BA_PHASE3_DUPLICATE_AUDIT_AND_PROMOTION_GATE_V1`

---

## 1. Context

Phase 2 validated a phase-local working key for Battle Academy:

`(ba_set_code, printed_number, normalized_printed_name)`

That phase did not prove the duplicate surface was harmless. Phase 3 exists to determine whether exact-key duplicates are:

- harmless source-row duplication
- proof that the working key is still insufficient
- or proof that audited evidence is insufficient

No promotion is allowed in this phase.

---

## 2. Why Phase 3 Exists

Phase 2 ended with a non-trivial duplicate surface under the working key.

Without classifying that surface, any promotion attempt would risk:

- silently treating repeated source rows as distinct canon
- silently collapsing distinct printed evidence into one working key
- implying a contract amendment that does not exist

Phase 3 therefore audits duplicate risk before any lawful promotion discussion.

---

## 3. Phase 2 Counts Carried Forward

Locked Phase 2 counts were read from the persisted artifacts and matched exactly:

- `distinct_canonical_model_key_count = 115`
- `ba_model_single_group_count = 52`
- `ba_model_duplicate_group_count = 63`

Phase 3 STOP condition for count drift did not trigger.

---

## 4. Duplicate Taxonomy

Phase 3 used the following duplicate classes:

### `SOURCE_ROW_DUPLICATE`

Rows share the same working key and audited evidence proves the duplicate exists only at the source / audit row layer.

### `MODEL_INSUFFICIENT`

Rows share the same working key, but audited artifacts contain additional printed evidence differences not represented in that key.

### `EVIDENCE_INSUFFICIENT`

Rows share the same working key, but audited artifacts do not contain enough printed evidence to prove whether they are the same or distinct.

This phase used only audited repo artifacts. No fuzzy logic, no external calls, and no cross-set inference were introduced.

---

## 5. Duplicate Classification Results

Counts per duplicate class:

- `SOURCE_ROW_DUPLICATE = 0`
- `MODEL_INSUFFICIENT = 63`
- `EVIDENCE_INSUFFICIENT = 0`

Persisted artifacts:

- `docs/checkpoints/ba_phase3_duplicate_audit_input.json`
- `docs/checkpoints/ba_phase3_duplicate_classification_v1.json`

Current Phase 3 conclusion:

- every exact-key duplicate group in the current BA surface is evidence that the Phase 2 working key is not sufficient for lawful promotion
- no duplicate group was proven harmless source duplication
- no duplicate group remained purely evidence-insufficient once the audited raw printed fields were compared

---

## 6. Named Findings: Bug Catcher / Potion

Named duplicate findings:

- `ba-2022::226::bug catcher` -> `MODEL_INSUFFICIENT`
- `ba-2024::188::potion` -> `MODEL_INSUFFICIENT`

For both groups, the audited artifacts showed additional printed evidence differences not represented in the Phase 2 working key:

- `source_name_raw`
- `number_raw`
- `parsed_printed_total`

Persisted artifact:

- `docs/checkpoints/ba_phase3_named_conflict_duplicate_findings_v1.json`

These two groups remain blocked because the current working key does not capture all printed evidence surfaced by the repo artifacts.

---

## 7. Promotion Gate

Every one of the `115` Phase 2 working keys was partitioned exactly once.

Promotion gate counts:

- `PROMOTION_ELIGIBLE = 0`
- `BLOCKED_DUPLICATE = 63`
- `BLOCKED_CONTRACT = 52`

Persisted artifact:

- `docs/checkpoints/ba_phase3_promotion_gate_partition_v1.json`

Interpretation:

- all `63` duplicate groups are blocked at the duplicate-risk layer
- the remaining `52` clean working keys are still contract-blocked because this phase does not amend BA canonical identity law
- no key is lawfully promotable in Phase 3

---

## 8. Verification

Persisted verification artifact:

- `docs/checkpoints/ba_phase3_duplicate_audit_verification_v1.json`

All verification checks passed:

- `V1_EVERY_PHASE2_DUPLICATE_GROUP_CLASSIFIED_ONCE`
- `V2_EVERY_WORKING_KEY_PARTITIONED_ONCE`
- `V3_NO_KEY_IN_MULTIPLE_GATE_BUCKETS`
- `V4_NO_HEURISTIC_LOGIC_EXISTS`
- `V5_NO_SILENT_CONTRACT_AMENDMENT_IMPLIED`
- `V6_NO_CANON_ROWS_INSERTED`
- `V7_NO_MAPPINGS_WRITTEN`
- `V8_NO_GV_ID_VALUES_GENERATED`

This phase remained read-only.

---

## 9. Boundary Statement

This phase does not promote BA rows and does not amend BA canonical identity law. It only determines whether the remaining duplicate surface is a source-duplication problem, a model insufficiency problem, or an evidence insufficiency problem.

Phase 3 result:

- the duplicate surface is a model insufficiency problem, not a harmless source-duplication problem

Therefore the only lawful next artifact from the allowed boundary list is:

- `BA_PHASE4_EVIDENCE_ACQUISITION_V1`

`BA_PHASE4_CONTRACT_AMENDMENT_V1` is not yet lawful because the current working key was not proven sufficient for BA promotion.

---

LOCKED
