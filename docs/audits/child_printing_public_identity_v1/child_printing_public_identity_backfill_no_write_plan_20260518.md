# Child Printing Public Identity Backfill Apply Plan V1

Generated: 2026-05-19T03:42:40.280Z

Status: NO-WRITE PLAN ONLY.

## Objective

Define the future governed backfill for the 44,698 approved `printing_gv_id` candidates. This document does not authorize or execute the backfill.

## Current State

- nullable schema migration applied: `20260518180000_child_printing_public_identity_v1.sql`
- `public.card_printings.printing_gv_id` exists and is nullable
- partial unique index exists: `card_printings_printing_gv_id_key`
- approved candidates: `44,698`
- blocked candidates: `10,884`
- proposed collisions: `0`
- unsupported finish keys: `0`
- owned child printings at audit time: `0`

## Hard No-Write Rules

- Do not update `public.card_printings` in this plan task.
- Do not backfill blocked candidates.
- Do not change parent `card_prints.gv_id` values.
- Do not change Species Dex denominator logic.
- Do not enable public child printing routes.
- Do not touch scanner.

## Candidate Source Of Truth

Use:

```text
docs/audits/child_printing_public_identity_v1/child_printing_public_identity_candidates_20260518.json
```

Future apply must select only rows where:

```text
risk_classification = APPROVED_CANDIDATE
proposed_printing_gv_id is not null
parent_gv_id is not null
```

Do not infer additional candidates during apply. Regenerate evidence first and stop if counts drift.

## Approved Finish Distribution

- holo: 13075
- masterball: 67
- normal: 16320
- pokeball: 230
- reverse: 15006

## High-Risk Set Approved Counts

- sv03.5: 360
- sv8pt5: 447
- sv8: 0
- me01: 329
- smp: 736

## Future Dry-Run Gate

Before any write, run a dry-run transaction that loads the approved candidate matrix into a temporary table and verifies:

- approved candidate rows loaded: `44698`
- duplicate proposed IDs in candidate table: `0`
- proposed IDs already present on a different `card_printings.id`: `0`
- proposed IDs already used by parent `card_prints.gv_id`: `0`
- candidates whose parent `card_print_id` changed: `0`
- candidates whose parent `gv_id` changed: `0`
- candidates currently blocked by non-null existing `printing_gv_id`: `0`, unless explicitly running an idempotent resume
- blocked candidates match count: `0`

The dry-run must end with `rollback;`.

## Future Apply Order

1. Regenerate candidate audit.
2. Confirm drift count `0` against this plan.
3. Run remote read-only precheck.
4. Run dry-run transaction and save output.
5. Apply in one explicit transaction only if every dry-run assertion passes.
6. Verify post-apply counts and uniqueness.
7. Commit verification evidence.

## Future Apply Transaction Shape

Use a temporary candidate table loaded from the approved matrix. The update must be idempotent and constrained by both child and parent identity:

```sql
update public.card_printings cpng
set printing_gv_id = candidate.proposed_printing_gv_id
from tmp_child_printing_public_identity_backfill_v1 candidate
join public.card_prints cp
  on cp.id = cpng.card_print_id
where cpng.id = candidate.card_printing_id
  and cpng.card_print_id = candidate.card_print_id
  and candidate.risk_classification = 'APPROVED_CANDIDATE'
  and candidate.proposed_printing_gv_id is not null
  and cp.gv_id = candidate.parent_gv_id
  and cpng.printing_gv_id is null;
```

Expected updated rows: `44698`.

## Post-Apply Verification

- populated `printing_gv_id` count increases by exactly `44698`
- duplicate `printing_gv_id` count remains `0`
- every assigned child ID starts with its parent `gv_id` plus a finish suffix
- blocked rows remain null
- no parent `card_prints.gv_id` changed
- Species Dex denominator remains parent-print based
- no public child printing route is enabled

## Rollback

If rollback is required before dependent app behavior ships, clear only this candidate set:

```sql
update public.card_printings cpng
set printing_gv_id = null
from tmp_child_printing_public_identity_backfill_v1 candidate
where cpng.id = candidate.card_printing_id
  and cpng.printing_gv_id = candidate.proposed_printing_gv_id;
```

Expected rollback rows: `44698`.

## Stop Conditions

Stop before apply if any of these occur:

- candidate count differs from `44698`
- collision count is non-zero
- unsupported finish keys are present
- any blocked candidate would be updated
- any parent `gv_id` changed for an approved candidate
- any existing non-null `printing_gv_id` conflicts with a proposed ID
- remote schema no longer has nullable `printing_gv_id` and partial unique index
