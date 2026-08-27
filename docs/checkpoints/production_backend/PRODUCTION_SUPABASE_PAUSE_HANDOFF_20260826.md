# Production Supabase Pause Handoff - 2026-08-26

## Purpose

Pause the Supabase production-readiness closeout while catalog automation is
finished. This checkpoint is the restart document. Do not repeat the full
capacity, security, backup, or migration audit before reading this file and the
linked gate-status checkpoint.

## Frozen Source

- Repository: `OriginalSoseji/grookai_vault`
- Branch containing the production-backend evidence:
  `release/production-backend-launch-v1`
- Branch HEAD when paused: `6385f6068ae40efc74d6fb72fc1dc1ae080ecac6`
- Production Supabase project: `ycdxbpibncqcchqiihfz`
- Restore-drill project: `dkuiaiorwirujnrmbpvq`
- Supabase support request: `SU-454155`

## Current Truths

- Production is `ACTIVE_HEALTHY` and is not read-only.
- Compute is Medium: 2 CPU cores and 4 GB memory.
- Disk is 320 GB with approximately 218 GiB used, or 69.2%.
- Disk autoscaling is configured with a 600 GB maximum.
- Spend Cap disablement and metered disk/egress were explicitly approved.
- Current database size is approximately 217 GB.
- The largest retained datasets are TCGCSV daily history at approximately
  98 GB / 111.7 million rows and JustTCG snapshots at approximately 49 GB /
  22 million rows.
- Current connection state was healthy: 21 connections, zero blocked sessions,
  and zero long-running transactions at the audit point.
- Twelve production cron jobs had successful latest runs and zero recorded
  failures during the preceding seven days.
- Runtime preflight was `PASS_WITH_DEFERRED_DEBT` with zero critical failures.
- Eight daily physical backups were complete and WAL-G was enabled.
- PITR remains disabled.
- Production RLS coverage was 235 of 236 public tables. The one table without
  RLS, `ebay_browse_daily_budget_v1`, had no anonymous or authenticated grants
  and remained service-only.
- The restore drill passed application-owned schema, security, data, and
  signed-in read verification. The provider-owned collation repair remains
  unresolved through support request `SU-454155`.

## Cost And Capacity Watch

- The restore-drill project remains active on Medium compute with 480 GB of
  provisioned disk. It is an avoidable parallel cost once provider follow-up
  and retained evidence permit teardown.
- Production disk is below the autoscale threshold, but large history tables
  remain the primary storage-growth risk.
- Do not delete or truncate history to reduce cost. Retention must be governed,
  reversible where practical, and proven against pricing/publication needs.
- Capture the next billing-cycle egress and metered-storage statement before
  changing retention or capacity again.

## Deferred Data Debt

The latest read-only preflight reported:

- 62 canonical rows missing GV-ID.
- 5 duplicate external-mapping groups.
- 2,466 rows missing active identity records.

These are deferred data-quality items, not current critical production-health
failures. Repair them only through their canonical identity contracts.

## Migration History State

- Production contains eight applied migrations that were not yet present on
  `origin/main` at the audit point.
- All eight are tracked on `release/production-backend-launch-v1`; they are not
  orphaned local files.
- Do not reapply, rename, squash, or recreate these migrations.
- Reconcile the release branch into the final production candidate and verify
  linked migration history before any further production migration.

## What Must Not Be Broken

- No destructive cleanup of canonical, Vault, pricing-source, publication, or
  Storage data.
- No production migration that bypasses the tracked release branch.
- No claim that backup readiness equals PITR readiness.
- No restore-project teardown until its permanent evidence and provider state
  are reconciled.
- No retention rule based only on table size; retained pricing history must be
  tied to an explicit product and recovery requirement.
- No anonymous pricing expansion through this workstream.

## Exact Resume Sequence

1. Read this checkpoint and
   `PRODUCTION_BACKEND_LAUNCH_V1_GATE_STATUS_20260826.md`.
2. Check support request `SU-454155` for a human response and record the current
   restore-drill project state and cost.
3. Capture current production project health, compute, disk, autoscale, Spend
   Cap, billing/quota, egress, backup, and PITR state.
4. Reconcile the eight production-applied migrations from
   `release/production-backend-launch-v1` into the final release candidate.
5. Run linked-migration, RLS/grant, runtime-preflight, cron, connection,
   blocked-session, and top-table growth checks.
6. Decide PITR separately. Do not infer a purchase decision from the completed
   restore drill.
7. Define and dry-run governed retention for the TCGCSV and JustTCG history
   tables only after product-history requirements are frozen.
8. If support and evidence permit, tear down the restore-drill project and
   verify billing/resource removal.
9. Attach provider evidence to the same-candidate launch manifest, then resume
   the final client verification and soak gates.

## Current Pause Decision

Supabase is stable enough to pause. Catalog automation is the active project.
No Supabase mutation is authorized by this checkpoint.

## Evidence

- `docs/checkpoints/production_backend/PRODUCTION_BACKEND_LAUNCH_V1_GATE_STATUS_20260826.md`
- `docs/checkpoints/production_backend/PRODUCTION_SUPABASE_RESTORE_DRILL_V1_20260825.md`
- `docs/checkpoints/production_backend/PRODUCTION_WORKER_HOST_RELEASE_RETENTION_V1_20260826.md`
- `C:\secure-ops\production-backend-launch\supabase-capacity`
- `C:\secure-ops\production-backend-launch\supabase-managed`
- `C:\secure-ops\production-backend-launch\automated-readiness`

## Explicit Next Gate

Resume only after catalog automation reaches its own checkpoint. The first
Supabase action is a fresh read-only provider and database state capture, not a
schema or data mutation.
