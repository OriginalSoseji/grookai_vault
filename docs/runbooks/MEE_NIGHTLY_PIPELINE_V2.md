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
6. Apply `20260803020000_mee_price_event_observation_index_v1.sql` once.
7. Apply `20260803021000_mee_price_event_readback_index_v1.sql` once.
8. Run `docs/sql/mee_operational_recovery_v1_readback.sql`.
9. Stop if any index, table, view, RLS, policy, grant, or migration-history check disagrees.

The migration is additive. Code rollback does not require dropping its indexes, cursor table, or view.

## Immutable Deployment

Create a clean checkout at the exact release SHA, then run:

```bash
RELEASE_DIR=/opt/grookai/releases/mee/<git-sha> \
ENABLE_TIMER=0 \
bash deploy/scripts/install-mee-nightly-release-v2.sh
```

The installer refuses tracked changes, installs dependencies, runs a no-provider preflight, atomically switches the current symlink, and leaves the timer disabled.

The release directory basename should match the deployed Git SHA prefix. Confirm both `git rev-parse HEAD` and `readlink -f /opt/grookai_mee_current` after installation.

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

If an incomplete cursor is bound to a prior immutable source plan, preserve that order explicitly:

```bash
MEE_NIGHTLY_ALLOW_RUN=1 \
MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1 \
node scripts/workers/market_listing_nightly_pipeline_v2.mjs \
  --run \
  --call-ceiling=<bounded-count> \
  --run-key=MEE-V2-CANARY-<timestamp> \
  --frozen-dry-run=/var/lib/grookai/mee/audits/<exact-plan>.json
```

The frozen plan must be under the governed runtime artifact root. Its request count and recomputed manifest must exactly match the incomplete cursor. Never use this option to bypass a manifest mismatch, reset a completed cycle, substitute requests, or accept duplicates.

Advance to 500 and then 4,000 only after selected calls, acquired rows, warehouse rows, candidate rows, rollups, cursor movement, retries, failures, disk use, and phase ledgers reconcile.

Strict apply and run-scoped readback must use the source acquisition run key, not the outer pipeline run key. A run-scoped readback with any finding is a critical failure even when its SQL completed successfully.

The first V2 canary advanced the cursor from `0` to `50`. The 500-call canary then advanced it exactly once from `50` to `550`. The 4,000-call canary must begin at `550`; silently returning to zero or regenerating a differently ordered source plan is a rotation failure.

## Legacy Artifact Preservation

Historical fetch and backfill directories in the inactive mutable checkout may be archived only through `scripts/ops/mee_legacy_artifact_archive_v1.sh`. The tool is plan-only by default and accepts only direct-child `mee_11l...fetch` and `mee_11m...backfill_plan` directories under the governed legacy audit root.

Before source removal, the apply path requires the timer and service to be inactive, enforces an inactivity window, hashes every source file, creates a compressed tar archive, runs `zstd --test`, compares the archive against the live source with GNU tar, records archive and manifest hashes, and verifies the final archive hash. Source removal is restricted to the exact allowlisted path and occurs only after those checks pass.

Restore is also plan-only by default:

```bash
bash scripts/ops/mee_legacy_artifact_restore_v1.sh \
  --archive=/var/lib/grookai/mee/archive/legacy_mutable_checkout/<artifact>.tar.zst \
  --manifest=/var/lib/grookai/mee/archive/legacy_mutable_checkout/<artifact>.files.sha256 \
  --destination-root=/opt/grookai_vault_mee_nightly/docs/audits/market_evidence_engine_v1 \
  --apply
```

Never archive the current runtime artifact root, the active immutable release, incomplete/recent output, or a directory outside the explicit fetch/backfill allowlist. Expansion of this retention policy requires a separately reviewed contract.

## Failure Handling

- Provider phase failed or indeterminate: preserve artifacts and use a new gate; do not reuse the run key.
- Warehouse apply failed: inspect state and resume the same run; the apply is idempotent.
- Candidate or strict rollup failed: resume from existing warehouse evidence; do not fetch again.
- Critical run-scoped readback failed or returned findings: preserve artifacts, repair downstream only, and resume without provider refetch.
- Supplementary operational readback failed: record a warning and run its bounded readback separately.
- Disk floor failed or has inadequate run-size margin: stop before provider calls and expand storage or use a separately reviewed, hash-preserving retention action.
- Source manifest changed mid-cycle: stop and reconcile the manifest; do not silently reset the cursor.

## Rollback

1. Disable and stop the timer and service.
2. Point `/opt/grookai_mee_current` to the prior immutable release.
3. Reinstall the prior service unit and reload systemd.
4. Leave the additive migration and all evidence rows intact.
5. Keep the timer disabled until the prior release dry-run passes.

## Completion Standard

Operational recovery is complete only after three unattended rotating-cycle runs finish without provider replay, reconciliation mismatch, blocking timeout, disk breach, or public-boundary violation.

The 50-call and 500-call canaries are complete. The timer must remain disabled until the 4,000-call canary and three unattended cycles all pass.
