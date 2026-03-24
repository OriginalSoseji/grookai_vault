# DRIFT_GUARD_V1

## Purpose

`scripts/drift_guard.ps1` is a read-only migration ledger helper.

ADVISORY ONLY — NOT A SAFE APPLY GATE

It is useful for:

- local vs linked migration ledger comparison when local Supabase is available
- repo-file vs linked migration comparison when the local DB is unavailable
- spotting pending, error, remote-only, or local-only migration drift

It is not rebuild proof and it is not sufficient pre-push evidence.

Authoritative rebuild validation remains:

```powershell
supabase db reset --local
```

## Why The Old Wrapper Failed

The old wrapper used PowerShell native command capture with `2>&1` while `$ErrorActionPreference = 'Stop'` was active.

Supabase CLI emits harmless status chatter such as `Connecting to local database...` on stderr.

PowerShell converted that stderr output into `NativeCommandError` / `RemoteException` records, so DriftGuard could stop even when the command itself had not actually failed.

## Current Handling

DriftGuard now:

- launches Supabase CLI through `System.Diagnostics.Process`
- captures stdout and stderr separately
- treats stderr as informational unless the process exit code is non-zero
- decides success/failure from `ExitCode`, not stderr presence
- prints a clear skip message when local Supabase is unavailable

## Operational Note

If local Supabase is unavailable, DriftGuard can still compare repo migration files to the linked ledger.

For definitive validation, run the strict migration gate:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>
```

For replay proof, start local Supabase and run:

```powershell
supabase db reset --local
```
