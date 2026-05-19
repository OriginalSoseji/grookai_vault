# Child Printing Public Identity V1 Guard Diagnosis

Generated: 2026-05-18

Status: TOOLING-ONLY FAILURE IDENTIFIED; APPLY STILL BLOCKED UNTIL GUARD RERUN PASSES.

## Scope

This diagnosis covers the previous `migration_preflight_strict.ps1 -Phase AuditLinkedSchema` timeout/failure for `CHILD_PRINTING_PUBLIC_IDENTITY_V1`.

No migration was applied. No database write was performed.

## Instrumentation Added

`scripts/migration_preflight_strict.ps1` now emits:

- elapsed-time markers per section
- step start markers for external commands
- stdout read completion markers
- stderr read completion markers
- exit code and elapsed time per external command

This makes future guard failures diagnosable without guessing which internal command stalled or failed.

## Manual Command Results

### Linked Migration Ledger

Command:

```powershell
supabase migration list --linked
```

Result: PASS.

Elapsed: approximately `00:00:02.8`.

Ledger status:

- linked project is accessible
- only expected local-only migration remains: `20260518180000_child_printing_public_identity_v1.sql`
- no unexpected remote-only migration was observed

### Linked Schema Diff

Command:

```powershell
supabase db diff --linked
```

Result: FAIL, tooling/environment.

Elapsed: approximately `00:00:01.7`.

Error:

```text
failed to start docker container
Bind for 0.0.0.0:54331 failed: port is already allocated
```

Supabase CLI recommends:

```powershell
supabase stop --project-id ycdxbpibncqcchqiihfz
```

or configuring a different shadow database port in `supabase/config.toml`.

## Port Diagnosis

Command:

```powershell
Get-NetTCPConnection -LocalPort 54331
```

Result:

- port `54331` is listening through Docker/WSL relay processes
- observed owners include `wslrelay` and `com.docker.backend`

Command:

```powershell
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
```

Relevant result:

```text
7a2046653163   cranky_merkle   0.0.0.0:54331->5432/tcp
```

The local Supabase project also has expected containers on nearby ports, including `supabase_db_ycdxbpibncqcchqiihfz` on `54330`.

## Instrumented Guard Result

Command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Result: FAIL, tooling/environment.

Observed markers:

- `step 1`: `supabase migration list --linked` completed successfully
- `step 2`: `supabase db diff --linked` started at approximately `00:00:02.240`
- `step 2`: stdout and stderr reads completed
- `step 2`: exited with code `1` after approximately `00:00:01.418`

The earlier timeout is therefore not an unbounded migration replay failure. The current reproducible failure is a local Docker/Supabase shadow database port conflict.

## Classification

Diagnosis: tooling-only local environment failure.

Reason:

- linked migration ledger is readable
- failure occurs before schema diff can start
- failure is caused by Docker port allocation on local shadow DB port `54331`
- no SQL migration step is executed
- no local replay is reached
- no production database write is attempted

## Apply Decision

Decision: DO NOT APPLY YET.

Even though the failure is tooling-only, the required gate has not passed. Apply remains blocked until:

1. stale container or shadow-port conflict is cleared
2. `migration_preflight_strict.ps1 -Phase AuditLinkedSchema` passes
3. `supabase db reset --local` passes
4. live candidate regeneration shows drift count `0`
5. remote read-only precheck passes

## Safe Recovery Options For Next Run

Preferred:

```powershell
supabase stop --project-id ycdxbpibncqcchqiihfz
```

Then rerun:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Alternative if the stale container is unrelated and verified safe to remove:

```powershell
docker stop 7a2046653163
```

Do not apply the migration until the full gate passes after cleanup.

## Confirmations

- no parent `gv_id` changes
- no Species Dex denominator changes
- no scanner changes
- no public child route enablement
- no migration applied
- blocked candidates remained blocked
