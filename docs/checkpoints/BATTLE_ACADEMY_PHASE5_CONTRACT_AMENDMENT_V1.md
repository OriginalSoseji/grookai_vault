# CHECKPOINT — Battle Academy Phase 5 Contract Amendment V1

Date: 2026-04-02

Status: LOCKED
Scope: BA identity-law amendment + promotion gate definition
Phase: BA_PHASE5_CONTRACT_AMENDMENT_V1

---

## 1. Context

Phase 3 proved the Phase 2 working key was still insufficient.

Locked Phase 3 result:

- `63` `BA_MODEL_DUPLICATE` groups
- all `63` classified as `MODEL_INSUFFICIENT`
- `0` `SOURCE_ROW_DUPLICATE`
- `0` `EVIDENCE_INSUFFICIENT`

Phase 4 then tested explicit identity-dimension expansions using existing repo evidence only.

---

## 2. Why Phase 3 Failed

The Phase 2 working key:

```text
(ba_set_code, printed_number, normalized_printed_name)
```

did not capture enough printed evidence to distinguish all Battle Academy rows safely.

The remaining duplicate surface was not harmless source duplication.
It was proof that the model omitted a required identity discriminator.

---

## 3. Phase 4 Evidence Expansion Findings

Locked Phase 4 expectations all held:

- `K4` selected as minimal sufficient key
- `328` distinct keys
- `328` single groups
- `0` duplicate groups
- both named conflicts resolved:
  - `ba-2022 | 226 | bug catcher`
  - `ba-2024 | 188 | potion`

Dimension diff proof across the `63` Phase 3 duplicate groups:

- `source_name_raw_diff_count = 63`
- `raw_printed_name_diff_count = 0`
- `number_raw_diff_count = 2`
- `parsed_printed_total_diff_count = 2`

This proves `source_name_raw` is the decisive differentiator on the audited duplicate surface.

---

## 4. Candidate Key Testing

| Key | Fields Added Beyond Baseline | Distinct Keys | Duplicate Groups | Classification |
|---|---|---:|---:|---|
| `K1` | none | `115` | `63` | `INSUFFICIENT` |
| `K2` | `number_raw` | `117` | `64` | `INSUFFICIENT` |
| `K3` | `parsed_printed_total` | `117` | `64` | `INSUFFICIENT` |
| `K4` | `source_name_raw` | `328` | `0` | `MINIMALLY_SUFFICIENT` |
| `K5` | `raw_printed_name` | `115` | `63` | `INSUFFICIENT` |
| `K6` | `number_raw`, `parsed_printed_total` | `117` | `64` | `INSUFFICIENT` |
| `K7` | `number_raw`, `source_name_raw` | `328` | `0` | `MINIMALLY_SUFFICIENT` |
| `K8` | `parsed_printed_total`, `source_name_raw` | `328` | `0` | `MINIMALLY_SUFFICIENT` |
| `K9` | `number_raw`, `parsed_printed_total`, `source_name_raw` | `328` | `0` | `MINIMALLY_SUFFICIENT` |

Selected candidate:

```text
K4 = (ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

`K4` is the smallest tested key that eliminated the duplicate surface completely.

---

## 5. Dimension Validation Result

`source_name_raw` was validated as a lawful identity dimension using only existing repo artifacts.

Validation result:

- `validation_status = VALID_DIMENSION`
- originates from raw ingestion payload
- corresponds to source-captured card-facing identity label
- consistently present on the audited duplicate surface
- stable per row
- not computed, inferred, or normalized beyond raw extraction

Locked supporting counts:

- `duplicate_group_count = 63`
- `source_name_raw_diff_count = 63`
- `source_name_raw_missing_row_count = 0`
- `unstable_row_count = 0`

---

## 6. Amended BA Identity Law

The prior Battle Academy identity requirement is superseded.

Old working key:

```text
(ba_set_code, printed_number, normalized_printed_name)
```

Amended canonical Battle Academy identity:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

Rules:

- `R1 — Printed Identity Authority`
  Identity is defined strictly from printed card evidence and directly captured raw attributes.
- `R2 — Dimension Inclusion`
  `source_name_raw` is a required identity discriminator.
- `R3 — No Cross-Set Merge`
  BA identities remain isolated from all non-BA canon.
- `R4 — Underlying Reference Separation`
  Underlying matches remain reference-only and never define BA identity.
- `R5 — Deterministic Uniqueness`
  The identity key must produce zero collisions.

Future canonical implementation must enforce uniqueness on:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

`gv_id` must be generated from this full key.
No partial-key identity is lawful.

No DB migration was executed in this phase.

---

## 7. Promotion Gate

Phase 5 defines the only lawful promotion gate for Battle Academy.

A row may be promoted only if all are true:

- `G1` unique under the full identity key `K4`
- `G2` no duplicate-group membership remains
- `G3` no `MODEL_INSUFFICIENT` classification remains
- `G4` dimension validation passed
- `G5` no conflicting canonical row exists

If any gate fails:

```text
BLOCKED
```

Phase 5 promotion candidate result:

- `promotion_eligible_candidate_count = 328`
- `blocked_count = 0`
- `zero_collision_key_count = 328`

These are promotion-eligible candidates only.
No promotion is executed in this phase.

---

## 8. Verification

`ba_phase5_contract_verification_v1.json` passed all checks:

- `V1` identity key produces zero collisions
- `V2` no heuristic logic introduced
- `V3` no external data used
- `V4` no canon rows inserted
- `V5` no mappings written
- `V6` no `gv_id` generated yet
- `V7` promotion candidates deterministic

---

## 9. Boundary

This checkpoint amends the BA identity model based solely on existing evidence.
No promotion is executed in this phase.

Nothing in this phase:

- inserts BA canonical rows
- writes mappings
- generates `gv_id`
- uses heuristic matching
- uses external data

---

## 10. Next Phase

Next phase:

```text
BA_PHASE6_CANON_PROMOTION_V1
```

Allowed scope in that phase:

- insert canonical `card_prints`
- generate `gv_id`
- write mappings

That scope is only lawful because the identity law is now evidence-backed, the promotion gate is defined, and the current audited surface is zero-collision under the full key.
