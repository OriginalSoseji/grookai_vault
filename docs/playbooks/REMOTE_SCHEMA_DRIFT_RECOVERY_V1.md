# REMOTE_SCHEMA_DRIFT_RECOVERY_V1

## Purpose
Recover from remote schema drift caused by direct remote edits without rewriting migration history.

## Preconditions
- An emergency remote schema edit occurred, or linked drift has been proven.
- No other migration work is allowed to continue until this playbook is complete.

## Step 1 - Create a Clean Worktree
```powershell
git worktree add ..\grookai_vault_migration_reconcile HEAD
Set-Location ..\grookai_vault_migration_reconcile
git status --short
```
STOP if the new worktree is not clean.

## Step 2 - Link the Worktree to the Target Project
```powershell
supabase link
```
STOP if the project ref is not the intended remote target.

## Step 3 - Audit the Linked Migration Ledger
```powershell
supabase migration list --linked
```
STOP if:
- any migration is in `error`
- any migration is in `pending`
- duplicate timestamps exist locally

Remote-only IDs do not stop this playbook. They are part of the recovery surface and must be recorded before continuing.

## Step 4 - Pull Remote Schema Into a Forward-Only Reconciliation Migration
```powershell
supabase db pull
```
STOP if `db pull` fails.

## Step 5 - Review the Pulled Migration
Open the newly created migration and confirm it represents the remote direct edits that must be preserved.

STOP if the pulled file includes unrelated local work that was never applied remotely.

## Step 6 - Remove Non-Replay-Safe Diff Artifacts
Remove or rewrite any pulled statements that are known to break replay safety:
- `drop extension`
- `drop view`
- generated column default mutation
- malformed or incorrect extension schema references

STOP if the pulled migration still contains destructive diff output that is not required to preserve correctness.

## Step 7 - Check Duplicate Pending Objects
Run strict preflight against the reconciliation worktree and inspect pending migrations for duplicate definitions:
```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <reconciliation_id>
```
Review for duplicate:
- index names
- view names
- function signatures

STOP if duplicates are reported. Resolve the overlap before continuing.

## Step 8 - Prove Local Replay
```powershell
supabase db reset --local
```
STOP if replay fails.

## Step 9 - Merge Back Into Main Repo
Copy the reviewed reconciliation migration into the main repo worktree, then rerun:
```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <reconciliation_id>
```
STOP if either command fails.

## Exit Condition
Recovery is complete only when:
- the reconciliation migration is committed in repo history
- linked drift is understood and represented in migrations
- `supabase db reset --local` passes
- the repo migration chain is replayable again
