# Production Supabase Restore Drill V1

**Checkpoint date:** `2026-08-25`

**Executor branch:** `release/production-backend-launch-v1`

**Frozen executor SHA:** `7e6309821930f417f7dcb5968b434a5e816c0b0b`

**Permanent audit:** `C:\secure-ops\production-backend-launch\restore-execution\2026-08-25T00-24-05-909Z_dkuiaiorwirujnrmbpvq`

## Context

Production launch readiness required proof that a frozen Supabase physical backup could be restored into an isolated project and still satisfy Grookai's migration, schema, security, data, and signed-in application contracts.

## Problem

Managed backups and WAL-G were available, but there was no completed restore-to-new-project exercise. Without a real restore and readback, recovery remained an entitlement rather than an operationally proven capability.

## Risk

A restored project can execute copied schedules, drift from the source security contract, contain incomplete data, or appear healthy while application reads fail. A provider host can also expose collation-version drift that requires index maintenance before the clone is safe as a replacement.

## Decision

Restore backup `2026-08-24T19:12:52.617Z` from production `ycdxbpibncqcchqiihfz` into isolated clone `dkuiaiorwirujnrmbpvq`, disable all clone schedules, reconcile the frozen recovery point, run a disposable signed-in smoke, and retain the clone until a separate teardown decision.

## Alternatives Rejected

- Restore in place: rejected because production mutation was outside the safety boundary.
- Treat provider project health as recovery proof: rejected because it does not prove schema, RLS, grants, data, or app behavior.
- Refresh the clone collation version before all indexes are rebuilt: rejected because it would hide a real managed-index safety warning.
- Delete the clone automatically: rejected because destructive teardown was not authorized.

## Current Truths

- The restore completed in `43m 36.091s`; source and clone are `ACTIVE_HEALTHY`.
- Migration ledger, schema objects/columns, RLS, functions, and grants match.
- `42` representative exact counts were checked; `41` equal current production and one expected post-backup event table advanced in production.
- Signed-in bounded search, Vault RLS, governed pricing, image delivery, and memory privacy passed.
- The disposable clone-only Auth user was removed and verified absent.
- All clone cron jobs are disabled. Twelve pre-disable runs were clone-local and none targeted production.
- Full `ANALYZE` completed.
- All `297` customer-owned collation-dependent indexes were rebuilt and verified.
- `55` Supabase-managed indexes remain provider-owned follow-up; the clone collation version is intentionally not refreshed.
- Production was not written, repointed, restored in place, or exposed to clone schedules.
- The clone remains active and incurs metered cost until separately authorized deletion.

## Invariants

- Production remains the only live application authority.
- A clone never inherits permission to execute production-facing schedules.
- Recovery validation compares the clone with the frozen recovery point, not only with a later moving production state.
- RLS, grants, functions, and canonical data are part of recovery correctness.
- Managed-role objects are not altered through unsupported privilege escalation.
- Subsequent blanket authorization permits clone deletion only after provider repair and a zero-failure post-provider smoke.

## What Must Never Be Broken

- Canonical identity and Vault ownership truth.
- Signed-in isolation and private-memory boundaries.
- Pricing provenance and governed read paths.
- Production application, worker, DNS, and Storage pointers.
- Immutable audit evidence tied to the frozen executor SHA.

## Verification

- Reconciliation: passed; fingerprint `d1f6f774af525fad20a7e4c2815a9cd1b5763fd2acabc29b377c8db0c4493a75`.
- Signed-in smoke: passed; fingerprint `92009222647682e086b11ee878ac598adfe09314fb98eb240a948761231eb735`.
- Customer-owned reindex readback: `297 / 297`, zero missing.
- Final clone cron count: `0`.
- Final disposable-user count: `0`.
- Final active reindex session count: `0`.
- Production and clone provider snapshots: `ACTIVE_HEALTHY`.

## Known Debt

- Supabase must rebuild `55` managed-role default-collation indexes and refresh the clone's collation version before replacement readiness can pass.
- Legacy five-argument `search_card_prints_v1` timed out; the current bounded `search_game_card_prints_v4` app path passed.
- PITR remains disabled and provider autoscale settings remain unconfirmed through the Management API.

## Cost

- Provider estimate: `$118.18/month` for Medium compute plus `480 GB` disk.
- Estimated accrued cost at checkpoint: `$0.6845`.
- Estimated 48-hour cost: `$7.7707`, within the authorized `$8.00` ceiling.

## Explicit Next Gate

The Supabase-managed reindex and collation-refresh request was submitted at `2026-08-25T04:53:03Z` under Gmail message `1a03743c5cc95ffd` and acknowledged as ticket `SU-454155`. A destination-only follow-up requesting an ETA was sent at `2026-08-26T04:32:00Z` under Gmail message `1a03c57467b9967b`; no maintenance-completion response had been received at that check. Windows task `Grookai-Supabase-Restore-Drill-Monitor-V1` checks the clone read-only every 15 minutes through `2026-08-27T00:24:05.909096Z` and stops when provider maintenance is visible or the deadline is reached. Its Task Scheduler execution proof returned exit code `0`.

After provider completion, the guarded finalizer reruns the database boundary and signed-in smoke. It deletes the isolated clone, verifies provider absence, removes the clone credential, and unregisters the monitor only if every check passes. Any failed smoke prevents deletion, disables unattended retries, preserves the clone for review, and neither script can query or mutate production.
