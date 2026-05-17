# Lane A 247-Row Number Normalization Write Plan - 2026-05-17

Status: no-write write-plan draft only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Define a narrower Lane A number-normalization write candidate that excludes the one referenced row found by the pre-execution gate.

The 248-row pre-execution gate proved the committed matrix still matched live DB evidence exactly, but it blocked execution because one row carries user/market references. This plan splits the lane into:

- 247 unreferenced clean Lane A candidates eligible for a future guarded write request;
- 1 manual evidence row for `svp` Pikachu with Grey Felt Hat #85.

This plan still does not approve execution.

## Source Evidence

- `number_normalization_lane_a_248_write_plan_20260517.md`
- `number_normalization_lane_a_248_write_plan_matrix_20260517.json`
- `number_normalization_lane_a_248_preexecution_gate_20260517.md`
- `number_normalization_lane_a_248_preexecution_gate_matrix_20260517.json`
- `number_normalization_lane_a_247_write_plan_matrix_20260517.json`
- `number_normalization_grey_felt_hat_manual_evidence_20260517.md`
- `number_normalization_grey_felt_hat_manual_evidence_matrix_20260517.json`

## Exact Candidate Scope

The exact 247-row candidate matrix is:

```text
docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_247_write_plan_matrix_20260517.json
```

Set breakdown:

| Set | Name | Rows | Range |
| --- | --- | ---: | --- |
| `2021swsh` | Macdonald's Collection 2021 | 25 | 1-25 |
| `A3a` | Extradimensional Crisis | 103 | 1-103 |
| `ecard3` | Skyridge | 4 | 4-9 |
| `fut2020` | Pokemon Futsal 2020 | 5 | 1-5 |
| `mep` | MEP Black Star Promos | 10 | 1-10 |
| `P-A` | Promos-A | 100 | 1-100 |
| Total |  | 247 |  |

## Explicit Manual Exclusion

The following row is excluded from this 247-row plan:

| Card print | Set | Card | Number | Reason |
| --- | --- | --- | --- | --- |
| `50386954-ded6-4909-8d17-6b391aeb53e4` | `svp` | Pikachu with Grey Felt Hat | 85 | Referenced by user, vault, pricing, slab, shared-card, and JustTCG market tables. |

This row must stay in the separate manual evidence lane until explicitly approved.

## Inherited Exclusions

This plan also continues to exclude:

- all 256 collision-blocked Lane A rows;
- all 83 `me01` duplicate candidates;
- all hard-stop set rows;
- all review-stop set rows;
- all prefixed source candidates;
- all complex source candidates;
- all source-tail conflict rows;
- all missing-card backfill rows;
- all variant/finish rows.

## Future Write Boundary

Future execution, if explicitly authorized later, may update only:

- `card_prints.number`
- `card_prints.number_plain`
- `card_prints.updated_at`

Only the 247 approved ids from the matrix may be targeted.

Future execution must not update:

- set rows;
- external mappings;
- raw imports;
- identity rows;
- card printings;
- card traits;
- vault rows;
- pricing rows;
- slab rows;
- shared-card rows;
- variant rows;
- source payloads;
- generated identity keys.

The Grey Felt Hat Pikachu row must not appear in the 247-row transaction.

## Preflight Gates

Before any future execution:

- migration ledger must be aligned;
- current branch and commit must be recorded;
- `npm run preflight` must pass with no critical failures;
- live derivation must still produce the same 248 clean Lane A candidates;
- the 247 approved ids must match the 247-row matrix exactly;
- `50386954-ded6-4909-8d17-6b391aeb53e4` must be absent from the write candidate table;
- no approved 247-row candidate may have user/vault/pricing/shared/slab/market references;
- hard-stop, review-stop, collision, prefixed, complex, source-conflict, and `me01` rows must be absent;
- each target row must still have both number fields null or blank;
- each target row must still have the expected TCGdex carrier pair;
- proposed values must be numeric only;
- no same-set direct `number` or `number_plain` collision may exist;
- no active identity printed-number conflict may exist.

Any failed gate stops execution. No partial write is acceptable.

## Rollback Strategy

A future executable transaction must snapshot before-values for all 247 rows:

- `card_prints.id`
- `card_prints.number`
- `card_prints.number_plain`
- `card_prints.print_identity_key`
- `card_prints.gv_id`
- `card_prints.updated_at`

Rollback restores only those fields for the same 247 ids.

Rollback must not delete rows, move cards, move mappings, mutate sets, mutate identity rows, mutate vault/pricing/shared/slab rows, mutate raw imports, or mutate variants.

## Post-Write Verification

If future execution is approved, post-write checks must prove:

- exactly 247 rows were updated;
- every 247-row matrix id now has the approved `number` and `number_plain`;
- the Grey Felt Hat Pikachu row remains unchanged;
- missing-number count decreased by exactly 247 for the approved scope;
- no hard-stop or review-stop row changed;
- no `me01` row changed;
- no collision-blocked row changed;
- no external mapping moved;
- no raw import changed;
- no set row changed;
- no active identity duplicate appeared;
- no card row was inserted or deleted;
- no missing-card backfill occurred;
- no variant row changed.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No data changes.
