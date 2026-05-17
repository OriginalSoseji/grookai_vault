# Lane A 248-Row Number Normalization Write Plan - 2026-05-17

Status: no-write write-plan draft only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.

## Purpose

Define the first narrow number-normalization write candidate for the 248 collision-free Lane A rows.

This is not approval to execute. It is the transaction design and safety gate checklist for a future explicitly authorized write.

The write scope is intentionally limited to rows where:

- `card_prints.number` is currently null or blank;
- `card_prints.number_plain` is currently null or blank;
- one numeric TCGdex-derived local number is present;
- both `external_ids.tcgdex` and active `external_mappings.tcgdex` carry the same source identity;
- the row is outside hard-stop and review-stop set groups;
- the proposed number does not collide with an existing same-set `number` or `number_plain`;
- the proposed number is unique within the candidate lane;
- there is no active identity printed-number conflict.

## Source Evidence

- `number_normalization_candidate_evidence_20260517.md`
- `number_normalization_candidate_evidence_matrix_20260517.json`
- `number_normalization_collision_investigation_20260517.md`
- `number_normalization_collision_investigation_matrix_20260517.json`
- `number_normalization_me01_duplicate_ownership_20260517.md`
- `number_normalization_me01_duplicate_ownership_matrix_20260517.json`
- `number_normalization_me01_duplicate_resolution_design_20260517.md`
- `number_normalization_dry_run_implementation_plan_20260517.md`
- `number_normalization_lane_a_248_write_plan_matrix_20260517.json`
- `number_normalization_lane_a_248_write_plan_20260517.sql`

## Exact Candidate Scope

The exact candidate matrix is:

```text
docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_248_write_plan_matrix_20260517.json
```

Set breakdown:

| Set | Name | Rows |
| --- | --- | ---: |
| `2021swsh` | Macdonald's Collection 2021 | 25 |
| `A3a` | Extradimensional Crisis | 103 |
| `ecard3` | Skyridge | 4 |
| `fut2020` | Pokemon Futsal 2020 | 5 |
| `mep` | MEP Black Star Promos | 10 |
| `P-A` | Promos-A | 100 |
| `svp` | Scarlet & Violet Black Star Promos | 1 |
| Total |  | 248 |

## Explicit Exclusions

This plan excludes:

| Exclusion | Count / Codes | Reason |
| --- | ---: | --- |
| Collision-blocked Lane A rows | 256 | Existing same-set `number` or `number_plain` collision. |
| `me01` duplicate candidates | 83 | Proven duplicate ownership lane, not number normalization. |
| Hard-stop set rows | `pgo`, `swsh10.5`, `sv04.5`, `sv4pt5`, `sv06.5`, `sv6pt5`, `sv08.5`, `sv8pt5` | Canonical set ownership unresolved. |
| Review-stop set rows | `bog`, `bp`, `tk-ex-latia`, `tk-ex-latio`, `tk-ex-m`, `tk-ex-p`, `tk1a`, `tk1b`, `tk2a`, `tk2b` | Source authority unresolved. |
| Prefixed source candidates | 114 | Prefix policy not approved. |
| Complex source candidates | 5 | Suffix policy not approved. |
| Source-tail conflict rows | 85 | Direct printed number and source tail disagree. |
| Missing cards | all | Backfill must remain separate. |
| Variants/finishes | all | Variant authority model not approved for writes. |

No row outside the exact 248-row matrix belongs in this plan.

## Future Write Behavior

Future execution, if explicitly authorized later, should update only:

- `card_prints.number`
- `card_prints.number_plain`
- `card_prints.updated_at`

The approved number and approved number plain value are the same numeric string for this lane.

The future write must not update:

- set rows;
- external mappings;
- raw imports;
- identity rows;
- card printings;
- card traits;
- vault rows;
- pricing rows;
- variant rows;
- source payloads;
- generated identity keys.

If `print_identity_key`, `gv_id`, or active `card_print_identity` rows need recomputation after number normalization, that is a separate identity-maintenance plan and must not be hidden inside this write.

## Preflight Gates

Before any future execution:

- migration ledger must be aligned;
- current branch and commit must be recorded;
- `npm run preflight` must pass with no critical failures;
- the exact matrix file must still contain 248 rows;
- live read-only derivation must still produce exactly 248 clean Lane A candidates;
- live clean candidate ids must exactly match the matrix ids;
- all 256 collision rows must remain excluded;
- all 83 `me01` duplicate candidates must remain excluded;
- hard-stop and review-stop codes must be absent;
- prefixed, complex, and source-conflict rows must be absent;
- target rows must still have both number fields null or blank;
- each target row must still have the expected TCGdex source carrier pair;
- proposed values must be numeric only;
- no same-set direct number or `number_plain` collision may exist;
- no active identity printed-number conflict may exist;
- no user/vault/pricing/shared/slab references may have appeared on the 248 rows without a manual review decision.

Any failed gate stops execution.

## Rollback Strategy

A future executable transaction must snapshot before-values for all 248 rows:

- `card_prints.id`
- `card_prints.number`
- `card_prints.number_plain`
- `card_prints.print_identity_key`
- `card_prints.gv_id`
- `card_prints.updated_at`

Rollback restores only those fields for the same ids.

Rollback must not:

- delete rows;
- move cards;
- move mappings;
- mutate sets;
- mutate identity rows;
- mutate vault/pricing rows;
- mutate raw imports;
- mutate variants.

## Post-Write Verification

If future execution is approved, post-write checks must prove:

- exactly 248 rows were updated;
- every matrix row now has the approved `number` and `number_plain`;
- missing-number count decreased by exactly 248 for the same scope;
- no hard-stop or review-stop row changed;
- no `me01` row changed;
- no collision-blocked row changed;
- no external mapping moved;
- no raw import changed;
- no set row changed;
- no active identity duplicate appeared;
- no card row was inserted or deleted;
- no missing-card backfill occurred;
- rerunning the number-normalization candidate evidence shows the 248-row lane is cleared without creating new blockers.

## Stop Conditions

Stop before execution if:

- the clean Lane A count is not exactly 248;
- any matrix id no longer matches live derivation;
- any candidate now has a number;
- any target proposed number collides in its set;
- any candidate appears in a hard-stop, review-stop, prefixed, complex, source-conflict, collision, or `me01` lane;
- any write plan includes `delete`;
- any write plan includes set, mapping, identity, vault, pricing, missing-card, or variant mutation.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No card movement.
- No set changes.
- No identity rewrites.
- No mapping movement.
- No missing-card backfill.
- No variant changes.
