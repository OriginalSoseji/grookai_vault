# Migration History Repair Plan

Date: 2026-07-15

Status: PLAN_ONLY_AWAITING_EXPLICIT_APPROVAL

Branch: `feature/card-visual-description-agent`

Commit: `312c74bbf592b3fc232d2a1429654678007e894d`

## Purpose

This plan defines the exact migration-history repair step needed to reconcile the linked Supabase ledger before returning to the Canonical Card Visual Description Agent apply gate.

No remote database mutation was performed.

No `supabase migration repair` was run.

No `supabase db push` was run.

No card visual description migration or one-card database apply was run.

## Baseline Ledger

Linked ledger baseline:

- remote-only IDs: none
- local-only IDs: 15

Local-only IDs:

- `20260523183000`
- `20260629190000`
- `20260703090000`
- `20260706100000`
- `20260706110000`
- `20260706120000`
- `20260706121000`
- `20260706122000`
- `20260706123000`
- `20260708174000`
- `20260712090000`
- `20260713190000`
- `20260715104500`
- `20260715110000`
- `20260715120000`

## Repair Candidates

The following 12 IDs are repair candidates:

- `20260629190000`
- `20260703090000`
- `20260706100000`
- `20260706110000`
- `20260706120000`
- `20260706121000`
- `20260706122000`
- `20260706123000`
- `20260708174000`
- `20260712090000`
- `20260715104500`
- `20260715110000`

Evidence:

- Full catalog parity readback passed with `174` checks, `0` missing expected catalog objects, and `0` security-definer mismatches.
- The `20260706122000` cron placeholder gap is explained by later applied migration `20260707182000`, which superseded `notification-dispatcher-disabled-v1` with the active `notification-dispatcher-every-minute-v1` runtime-config schedule.
- Runtime config keys were verified as present without recording secret values.

## Excluded IDs

The following IDs must not be repaired in this batch:

- `20260523183000`
- `20260713190000`
- `20260715120000`

Reason:

- Representative remote schema objects are absent.
- `20260715120000` is the card visual description migration and must remain pending until the actual schema apply gate.

## Proposed Command

Do not run this command without explicit approval.

```powershell
supabase migration repair `
  20260629190000 `
  20260703090000 `
  20260706100000 `
  20260706110000 `
  20260706120000 `
  20260706121000 `
  20260706122000 `
  20260706123000 `
  20260708174000 `
  20260712090000 `
  20260715104500 `
  20260715110000 `
  --status applied `
  --linked `
  --yes
```

The same command is preserved in:

`docs/audits/migration_history_repair_plan_v1/2026-07-15Tnext_step/03_proposed_repair_command.ps1`

## Stop Conditions Before Repair

Do not run repair if any of the following are true:

- `supabase migration list --linked` shows any remote-only IDs.
- Any of the 12 repair-candidate IDs are no longer local-only.
- Any excluded ID is missing from the local-only set before its separate gate.
- The target project ref is not `ycdxbpibncqcchqiihfz`.
- The operator has not explicitly approved migration-history repair.
- The current branch/worktree is not the isolated feature branch context.

## Required Proof After Repair

If repair is explicitly approved and executed later, capture all of the following:

- exact repair command output
- linked migration list immediately after repair
- parsed ledger summary proving:
  - remote-only IDs: none
  - repaired 12 IDs are no longer local-only
  - excluded IDs still local-only: `20260523183000`, `20260713190000`, `20260715120000`
- strict prepush result for the next approved pending set
- updated artifact hash manifest
- checkpoint update recording the repair

## Expected Post-Repair Ledger Shape

After successful repair, the expected local-only set should be:

- `20260523183000`
- `20260713190000`
- `20260715120000`

This still does not authorize the card visual description migration apply. It only clears the 12 schema-present/superseded ledger inconsistencies.

## Next Gate After Repair

After the repair is proven, decide how to scope the two unrelated schema-absent migrations:

- `20260523183000_printing_truth_review_sidecar_v1.sql`
- `20260713190000_trust_safety_block_report_v1.sql`

The card visual description apply gate should resume only when strict prepush has an approved pending set and `20260715120000` can be applied without dragging unrelated schema-absent migrations into the same gate.

## Artifacts

- `00_metadata.txt`
- `01_linked_migration_list_repair_plan_baseline.txt`
- `02_repair_plan_baseline_summary.json`
- `03_proposed_repair_command.ps1`
- `MIGRATION_HISTORY_REPAIR_PLAN.md`
- `artifact_hashes.json`

## Exact Next Gate

Request explicit approval for the migration-history repair command above.

Stop before running `supabase migration repair`.

## Readiness Follow-Up

The pre-execution readiness check was captured in `docs/audits/migration_history_repair_readiness_v1/2026-07-15Tnext_step/MIGRATION_HISTORY_REPAIR_READINESS.md`.

All stop conditions are clear except explicit operator approval:

- target ref is `ycdxbpibncqcchqiihfz`
- remote-only IDs: none
- all 12 repair IDs are still local-only
- all 3 excluded IDs are still local-only

No repair command was executed.

## Execution Follow-Up

Explicit approval was provided and the 12-ID repair command was executed.

Execution proof is preserved in `docs/audits/migration_history_repair_execution_v1/2026-07-15Tapproved_repair/MIGRATION_HISTORY_REPAIR_EXECUTION_REPORT.md`.
