# MIGRATION_TASK_PROMPT_V1

Use this prompt for every schema or migration task.

## Required Workflow
1. Print target:
   - `SUPABASE_URL`
   - `REMOTE` or `LOCAL`
   - project ref if available
2. Audit first:
   - run `supabase migration list --linked` when remote is involved
   - run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`
   - inspect repo migration files for duplicate timestamps
3. Classify the state:
   - clean pending local-only
   - remote-only drift
   - mixed state
   - replay failure
4. Plan forward-only work:
   - never edit applied migrations
   - create new migrations only
   - define exact pending IDs expected for apply
5. Apply only after audit is proven:
   - run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`
   - run migration apply commands
6. Verify:
   - rerun `supabase migration list --linked`
   - rerun any task-specific SQL proofs
   - confirm `supabase db reset --local` passes when schema changed

## Hard Stops
- STOP on remote-only drift.
- STOP on `error` or `pending` migration rows.
- STOP on duplicate timestamp prefixes.
- STOP on any attempt to edit an applied migration.
- STOP on non-empty linked diff until reconciled.
- STOP on local replay failure.

## Required Response Shape
- Audit
- Classification
- Plan
- Apply
- Verify

## Forbidden Moves
- No direct remote schema edits in normal workflow.
- No `supabase db push` before strict preflight passes.
- No ledger repair as a substitute for schema reconciliation.
