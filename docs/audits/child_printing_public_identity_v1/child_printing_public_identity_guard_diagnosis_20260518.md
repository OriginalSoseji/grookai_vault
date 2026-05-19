# Child Printing Public Identity V1 Guard Diagnosis

Generated: 2026-05-18

Status: SHADOW PORT CLEANED; GUARD TOOLING REPAIRED; APPLY BLOCKED BY LINKED SCHEMA DIFF.

## Scope

This diagnosis covers the `migration_preflight_strict.ps1 -Phase AuditLinkedSchema` guard for `CHILD_PRINTING_PUBLIC_IDENTITY_V1`.

No migration was applied. No production database write was performed.

## Instrumentation

`scripts/migration_preflight_strict.ps1` now emits:

- elapsed-time markers per section
- external command start markers
- stdout/stderr read completion markers
- exit code and elapsed duration per command
- bounded stdout/stderr transcript printing
- temp-file based stdout/stderr capture to avoid redirected pipe deadlocks on large `supabase db diff` output

## Shadow Container Cleanup

The original stale shadow database container was stopped:

```text
7a2046653163 cranky_merkle
```

Later `supabase db diff --linked` attempts created additional auto-remove shadow containers on port `54331`. Each removed container was first verified as a Supabase shadow Postgres container for project `ycdxbpibncqcchqiihfz`, with:

- image `public.ecr.aws/supabase/postgres:17.4.1.074`
- label `com.supabase.cli.project=ycdxbpibncqcchqiihfz`
- host port `54331`
- `AutoRemove=true`

The normal local Supabase database container was not removed:

```text
supabase_db_ycdxbpibncqcchqiihfz 54330->5432
```

## Manual Internal Command Results

### Linked Migration Ledger

Command:

```powershell
supabase migration list --linked
```

Result: PASS.

Ledger status:

- linked project is accessible
- only expected local-only migration remains: `20260518180000_child_printing_public_identity_v1.sql`
- no unexpected remote-only migration was observed

### Linked Schema Diff

Command:

```powershell
supabase db diff --linked
```

Result: FAIL, linked schema diff is non-empty.

After the stale shadow port blocker was cleared, the command completed and emitted a large schema diff. The diff includes the expected local-only child printing identity delta:

```text
drop index if exists "public"."card_printings_printing_gv_id_key"
alter table "public"."card_printings" drop column "printing_gv_id"
```

It also includes unrelated drift classes outside this lane, including extension/schema changes, many view drops/recreates, `admin.import_runs`, `ingest.card_prints_raw`, `public.collapse_map_phase1`, `public.scanner_fingerprint_index`, `pricing_jobs.locked_at`, `pricing_jobs.locked_by`, and `sets` metadata columns.

This is not safe to classify as tooling-only drift.

## Strict Guard Result

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Result: FAIL, linked schema diff.

Observed markers:

- `step 1`: `supabase migration list --linked` completed successfully
- `step 2`: `supabase db diff --linked` completed in approximately `00:00:47`
- `step 2`: stdout and stderr reads completed
- `step 2`: exited with code `0`
- guard failed closed because schema diff stdout was non-empty

The strict wrapper no longer hangs. It reaches the intended linked-diff gate and blocks apply.

## Classification

Diagnosis: apply-blocking linked schema diff after local tooling repair.

Reason:

- linked migration ledger is readable
- stale shadow database containers were cleared
- guard wrapper output capture was repaired
- linked schema diff is non-empty beyond the expected local-only child printing identity migration
- local replay was not run
- no production database write occurred

## Apply Decision

Decision: DO NOT APPLY.

Apply remains blocked until:

1. linked schema diff is reconciled or formally classified as acceptable expected drift outside this lane
2. `migration_preflight_strict.ps1 -Phase AuditLinkedSchema` passes
3. `supabase db reset --local` passes
4. live candidate regeneration shows drift count `0`
5. remote read-only precheck passes

## Confirmations

- no parent `gv_id` changes
- no Species Dex denominator changes
- no scanner changes
- no public child route enablement
- no migration applied
- blocked candidates remained blocked
