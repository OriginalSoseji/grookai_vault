# REMOTE_SCHEMA_EDIT_POLICY_V1

Status: ACTIVE

## Purpose
Define the only allowed handling for remote schema changes. Prevent direct remote edits from bypassing migration history and creating non-replayable schema state.

## Rule 1 - Normal Workflow
- Remote schema edits are forbidden in normal workflow.
- All schema changes must originate from new forward-only files in `supabase/migrations/`.
- `supabase db push` is the only normal mechanism for changing remote schema.

## Rule 2 - Applied Migration Immutability
- Never edit, rename, or delete a migration that is already applied on the target environment.
- If a prior migration needs correction, create a new forward-only repair migration.

## Rule 3 - Emergency Exception
- A direct remote schema edit is allowed only for an active production recovery or data-integrity emergency.
- The operator must record the exact SQL or UI action used during the emergency.
- The exception ends as soon as service is stabilized.

## Rule 4 - Mandatory Emergency Reconciliation
If an emergency remote schema edit occurs:
1. Stop all other migration work immediately.
2. Create a clean git worktree dedicated to reconciliation.
3. Link that worktree to the affected remote project.
4. Run `supabase migration list --linked`.
5. Run `supabase db pull` before creating, editing, or pushing any other migration.
6. Review the pulled migration, remove non-replay-safe diff artifacts, and resolve duplicate objects.
7. Prove replay locally with `supabase db reset --local`.
8. Merge the reconciliation migration back into the main repo.

No new schema work may continue until reconciliation is complete.

## Rule 5 - Apply Gate
- Before any remote migration apply, run `scripts/migration_preflight_strict.ps1 -Phase PrePush`.
- If strict preflight fails, remote apply is forbidden.

## Rule 6 - Forbidden Moves
- No schema edits in Supabase Studio as part of normal workflow.
- No ad-hoc remote SQL tabs for schema changes.
- No `supabase migration repair` as a first response to schema drift unless ledger corruption is already proven.
- No `supabase db push` while linked drift or replay failure is unresolved.

Lock Statement: This policy is binding. Any exception requires a new versioned contract.
