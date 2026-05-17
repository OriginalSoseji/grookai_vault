# Number Normalization Dry-Run Implementation Plan 2026-05-17

Status: no-write implementation planning artifact. No Supabase writes, migrations, inserts, updates, deletes, identity rewrites, card movement, set creation, or mapping changes are authorized by this document.

## Purpose

Define the future implementation shape for printed-number normalization without executing it.

The first possible write lane is not "normalize all numbers." The only plausible future candidate lane is narrower:

```text
card_prints.number is null
card_prints.number_plain is null
one TCGdex source-derived number exists
target set is not in a canonicalization hard stop
candidate does not collide with existing set identity
candidate has passed source/identity review
```

Even that lane is not approved yet. This plan defines the dry-run gates that must pass first.

## Source Evidence

- `number_normalization_evidence_20260517.md`
- `number_normalization_evidence_matrix_20260517.json`
- `number_normalization_candidate_evidence_20260517.md`
- `number_normalization_candidate_evidence_matrix_20260517.json`
- `number_normalization_collision_investigation_20260517.md`
- `number_normalization_collision_investigation_matrix_20260517.json`
- `number_normalization_me01_duplicate_ownership_20260517.md`
- `number_normalization_me01_duplicate_ownership_matrix_20260517.json`
- `number_normalization_me01_duplicate_resolution_design_20260517.md`
- `number_normalization_me01_duplicate_resolution_design_20260517.sql`
- `number_normalization_plan.md`
- `set_canonicalization_dry_run_20260517.md`
- `missing_set_universe_decision_20260517.md`

## Non-Goals

- No card inserts.
- No missing-card backfill.
- No set creation.
- No set alias merge.
- No variant or finish work.
- No external mapping changes.
- No raw import changes.
- No identity table rewrite.
- No generated-field overwrite.
- No hard-stop set changes.

## Candidate Lanes

### Lane A: Numeric Missing-Number Candidates

Evidence count: 504 non-hard-stop rows.

Row-level candidate evidence now splits this lane:

- 248 clean future write-plan candidates.
- 256 blocked rows with existing same-set number collisions.
- 0 active identity conflicts.
- 0 missing required TCGdex source-carrier pair rows.
- 0 duplicate candidate-number groups.

Collision investigation for the 256 blocked rows found:

- 154 likely duplicate import rows.
- 27 same-card duplicate-review rows.
- 75 same-number/different-card ambiguities.
- 2 candidate rows with user/market references.

The `me01` duplicate ownership pack confirms all 83 `me01` collision rows are duplicate pairs, not number-normalization candidates. The duplicate resolution design keeps `me01` out of number-normalization writes and defines a future duplicate-ownership remediation shape with survivor selection rules, TCGdex mapping preservation, user/market reference preservation, rollback snapshots, and no deletes until FK/reference migration is proven.

Only the 248 clean rows can become a future write-plan candidate after review. The blocked 256 rows must stay out of any bulk write scope until collision ownership is investigated. This lane must still prove:

- one source candidate per row;
- candidate is numeric after normalization;
- source carrier is TCGdex `external_ids` and active TCGdex mapping;
- no duplicate candidate within the canonical target set;
- no active identity conflict;
- no FK or public route side effect;
- no set canonicalization hard-stop code included.

### Lane B: Prefixed Missing-Number Candidates

Evidence count: 114 non-hard-stop rows.

Examples include `XY66`, `H16`, `RT6`, and `AR8`. These remain manual because `number_plain` often strips the prefix. They require prefix policy before any write.

### Lane C: Complex Suffix Candidates

Evidence count: 5 non-hard-stop rows.

Examples include `15A1`, `15A2`, `15A3`, `15A4`, and `65A`. These are manual-only and should not enter a bulk update.

### Lane D: Hard-Stop Set Rows

Evidence count: 374 rows.

Blocked sets:

- `sv08.5`
- `sv04.5`
- `sv06.5`
- `swsh10.5`

No number work should touch those rows until their set-canonicalization hard stops are resolved.

### Lane E: Existing Number / Generated Field Risk

Evidence count: 1,554 rows.

These rows already have direct printed numbers. They are not update candidates in this pass. They prove that `number_plain` can collapse printed prefixes and should not be treated as canonical identity.

### Lane F: Source Conflict Rows

Evidence count: 85 rows, including 46 active identity conflicts.

These rows are blocked from automation. They need source-specific identity review.

## Future Dry-Run Gates

A future dry-run implementation candidate must output a matrix with:

- candidate row count;
- set-level count;
- source carrier;
- candidate printed number;
- proposed `number` value;
- proposed `number_plain` comparable value;
- collision status;
- identity impact status;
- active external mapping status;
- hard-stop scope status;
- rollback status.

The dry-run must fail if:

- any hard-stop set code is present;
- any candidate has more than one distinct source-derived number;
- any candidate would duplicate an existing direct number in the same set unless the duplicate is an approved variant identity;
- any candidate has an active `card_print_identity.printed_number` conflict;
- any source carrier is missing from both `card_prints.external_ids` and active `external_mappings`;
- any candidate depends on PokemonTCG API or JustTCG alone;
- any candidate has a prefix or complex suffix without explicit approval;
- any candidate would require card movement, set creation, or external mapping movement.

## Future Write Shape

The future write, if separately approved later, should be a guarded transaction with a temp candidate table created from the dry-run output. It should update only the approved card print rows and only after every guard query returns zero unexpected rows.

The future write must not recalculate identity implicitly. If identity rows or `print_identity_key` need changes, that becomes a separate identity-maintenance plan with its own dry-run and approval.

## Rollback Strategy

Any future write must snapshot before-values for:

- `card_prints.id`
- `card_prints.number`
- `card_prints.number_plain`
- `card_prints.print_identity_key`
- `card_prints.gv_id`
- `card_prints.updated_at`

Rollback must restore only the updated rows from that snapshot. It must not delete rows, move cards, move mappings, or mutate raw imports.

## Post-Write Verification

If a future write is approved and executed, post-write checks must prove:

- missing direct-number count decreased by exactly the approved count;
- no hard-stop rows changed;
- no `external_mappings` rows changed;
- no `raw_imports` rows changed;
- no set rows changed;
- no active identity duplicate appears;
- candidate rows now have the approved direct number;
- rerunning the master set audit reduces false missing-card coverage without creating new set ownership ambiguity.

## Recommended Immediate Next Step

Do not write numbers yet.

The Lane A no-write candidate dry-run is complete. The next step is either:

1. a no-write future write-plan draft for only the 248 clean Lane A rows, or
2. set-scoped duplicate/source-ownership investigations for the remaining blocked Lane A rows, with `me01` now requiring a future duplicate-ownership design rather than more number evidence.

Do not draft or execute a write plan for all 504 rows.

## No-Write Confirmation

This plan authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, or variant changes.
