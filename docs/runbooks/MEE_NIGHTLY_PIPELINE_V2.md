# MEE Nightly Pipeline V2 Runbook

## Safety Boundary

Pipeline V2 writes only the existing internal market-listing warehouse, review-only candidates, internal rollups, append-only phase events, and append-only cursor events. It does not write public pricing, app-visible pricing, canonical identity, vault state, or images.

Never delete old evidence to repair a run. Never restart a failed provider phase with the same run key.

## Runtime Layout

- Immutable releases: `/opt/grookai/releases/mee/<git-sha>`
- Current release symlink: `/opt/grookai_mee_current`
- Protected environment: `/etc/grookai/mee-nightly.env`
- Runtime artifacts: `/var/lib/grookai/mee/audits`
- Service lock: `/tmp/grookai-mee-nightly.lock`

## Required Environment

```text
MEE_NIGHTLY_ALLOW_RUN=1
MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1
MEE_NIGHTLY_ACQUISITION_MODE=rotating_cycle
MEE_NIGHTLY_MIN_FREE_BYTES=12884901888
MEE_RUNTIME_ARTIFACT_ROOT=/var/lib/grookai/mee/audits
SUPABASE_DB_URL=<protected direct connection>
SUPABASE_URL=<protected project URL>
SUPABASE_SECRET_KEY=<protected service credential>
```

The eBay credential remains in the protected environment file. Do not print or copy secrets into audit artifacts.

## Migration Gate

1. Confirm `grookai-mee-nightly.timer` is disabled and inactive.
2. Confirm `grookai-mee-nightly.service` is inactive.
3. Confirm no MEE Node worker or orphaned SQL process is active.
4. Capture the migration-history and schema baseline.
5. Apply `20260803010000_mee_operational_recovery_v1.sql` once.
6. Run `docs/sql/mee_operational_recovery_v1_readback.sql`.
7. Stop if any index, table, view, RLS, policy, grant, or migration-history check disagrees.

The migration is additive. Code rollback does not require dropping its indexes, cursor table, or view.

## Immutable Deployment

Create a clean checkout at the exact release SHA, then run:

```bash
RELEASE_DIR=/opt/grookai/releases/mee/<git-sha> \
ENABLE_TIMER=0 \
bash deploy/scripts/install-mee-nightly-release-v2.sh
```

The installer refuses tracked changes, installs dependencies, runs a no-provider preflight, atomically switches the current symlink, and leaves the timer disabled.

## Historical Partial-Run Recovery

The August 2 raw warehouse run already exists. Do not call eBay again.

```bash
node scripts/audits/market_listing_card_candidate_rollup_plan_v1.mjs \
  --run-key=MEE-11L-DAILY-BATCH-802cd59b40ea
```

Review the plan counts and fingerprint. Apply only the exact generated plan, then create and apply the strict filtered plan for that same acquisition run. Finish with the run-scoped readback. Stop on any mismatch.

## Bounded Live Canaries

Use a unique run key for every provider attempt.

```bash
MEE_NIGHTLY_ALLOW_RUN=1 \
MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1 \
node scripts/workers/market_listing_nightly_pipeline_v2.mjs \
  --run \
  --call-ceiling=50 \
  --run-key=MEE-V2-CANARY-<timestamp>
```

Advance to 500 and then 4,000 only after selected calls, acquired rows, warehouse rows, candidate rows, rollups, cursor movement, retries, failures, disk use, and phase ledgers reconcile.

## Failure Handling

- Provider phase failed or indeterminate: preserve artifacts and use a new gate; do not reuse the run key.
- Warehouse apply failed: inspect state and resume the same run; the apply is idempotent.
- Candidate or strict rollup failed: resume from existing warehouse evidence; do not fetch again.
- Optional readback failed: record a warning and run its bounded readback separately.
- Disk floor failed: stop before provider calls and expand or clean artifact storage through a separately reviewed retention action.
- Source manifest changed mid-cycle: stop and reconcile the manifest; do not silently reset the cursor.

## Rollback

1. Disable and stop the timer and service.
2. Point `/opt/grookai_mee_current` to the prior immutable release.
3. Reinstall the prior service unit and reload systemd.
4. Leave the additive migration and all evidence rows intact.
5. Keep the timer disabled until the prior release dry-run passes.

## Completion Standard

Operational recovery is complete only after three unattended rotating-cycle runs finish without provider replay, reconciliation mismatch, blocking timeout, disk breach, or public-boundary violation.
