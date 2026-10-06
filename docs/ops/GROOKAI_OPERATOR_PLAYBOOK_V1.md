# Production control-plane operations

The main branch contains the full Grookai operator playbook. This operational
release branch preserves the separately pinned control-plane runtime.

## GitHub workflow read recovery — September 29, 2026

The live reader's server-side branch-filtered request returned historical
workflow evidence even when a current main-branch audit was available. Read up
to 100 unfiltered runs per workflow, select only explicit `head_branch=main`
records with valid creation timestamps, and use the newest creation time.
Do not let a newer feature-branch success or an older rerun hide a failed main
run. No matching main evidence stays unmeasured; provider errors stay failed.

The request has a 30-second transport limit. Existing freshness and execution
windows, shared-workflow request deduplication, and alert behavior are preserved.
This read-only repair needs no new GitHub credentials or account permissions.
It does not prove GitHub's native schedule has fired.

Deploy this change only to the control-plane runtime, preserve its previous
release pointer, and verify the actual report against current workflow IDs.
Do not replace the separate pricing or MEE runtimes from this branch.

Incident receipts, deployment state, and the completed pricing recovery are in
`C:/grookai_vault_operator_artifacts/worker_pricing_recovery_20260929/RECOVERY_CHECKPOINT.md`.

## MTG worker supervision — September 29, 2026

GitHub's MTG schedule remained overdue after the cron repair and re-enable.
The operational release now includes a separately pinned, read-only worker using
the current main-branch public-catalog acceptance fix and the same frozen manifest.
See `docs/contracts/MTG_CATALOG_SUPERVISOR_V1.md` for its unchanged write boundaries.

Runtime: `/opt/grookai_mtg_supervisor_current`; service/timer:
`grookai-mtg-catalog-supervisor`. The root-private environment contains only the
existing verified session-pooler database URL and a path to the validated public
CA bundle. Do not copy a desktop GitHub token or grant new database permissions.
Source, runtime dependencies and the frozen manifest must be packaged from one
merged immutable commit; verify each packaged file's hash before switching links.
The separate pricing and MEE pointers must remain unchanged.

Artifacts: `/var/lib/grookai/mtg-catalog-supervisor/runs/<run-id>` and `latest.json`.
Every attempt persists its start and terminal state; interruption and audit failure
replace latest health with explicit failure evidence without removing earlier runs.
The systemd unit is serialized, resource-limited, and read-only outside its evidence
directory. It pauses under the existing 15 GB capacity target or when launch-critical
health is stale/unhealthy. The database connection and each transaction are read-only,
TLS is verified, and public GitHub transport admits only the two frozen GET endpoints.

Once installed, the control plane measures this worker for MTG supervision and
retains GitHub workflow status as separate evidence. The timer must be active,
the latest service successful, the immutable SHA correct, artifact hashes valid,
and exact catalog proof less than 45 minutes old. Never make an old receipt fresh
by rewriting timestamps. Missing/drifted data, failed provider reads and active
writers remain visible; no automated writer dispatch is possible from this entry point.

Verify a real automatic timer trigger and terminal report after deployment.
For rollback, stop the new timer and preserve its evidence before restoring the
previous control-plane link and retiring only the new worker link. Keep all immutable
releases and previous recovery pins. Native GitHub scheduling and worker scheduling
must be reported separately; the worker is not proof of GitHub recovery.

Current preparation/deployment receipts remain in the external September 29 recovery
directory linked above. No cloud backup destination is created by this repair.

## Private worker backups — September 29, 2026

The founder subsequently selected private Supabase storage. Follow
`docs/contracts/WORKER_CLOUD_BACKUPS_V1.md`. The separate immutable runtime is
`/opt/grookai_worker_backup_current`; service/timer `grookai-worker-cloud-backup`
runs daily at 04:15 UTC after retention. Only its receipt directory under
`/var/lib/grookai/worker-cloud-backups` is writable. Use the existing root-private
worker environment and the non-secret seed manifest index at
`/etc/grookai/worker-backup-seed.json`. Keep pricing/MEE/control-plane links.

The private bucket is `worker-recovery-archives`, using 6 MiB chunks, create-only
uploads and downloaded hash verification before completion manifests. Seed the
14 existing recovery archives and retain local copies. Daily runs verify seed
manifests, copy finalized MEE retention archives within a 512 MiB/20-package
budget, and back up/restore a narrow health snapshot. The 10 GB tracked payload
budget stops growth visibly; metadata and partial uploads also consume quota.
Inspect `latest.json` and per-run receipts for deferred archives and failures.

Verify an actual timer-triggered receipt and downloaded restore after deployment.
Stop the timer for rollback, preserving cloud/local evidence. No source deletion,
new permissions, catalog writes or database backup configuration belong to this
worker. Deployment/seed/restore receipts remain in the external recovery directory
linked above; consult them for actual live status.

## Completed canary monitoring — September 29, 2026

MEE September 30 reference timeout repair: read
`docs/contracts/MEE_REFERENCE_BATCH_BUDGET_V1.md` and the latest external
`C:/grookai_vault_operator_artifacts/worker_pricing_recovery_20260929/RECOVERY_CHECKPOINT.md`.
The provider adapter uses bounded workers, request pacing, an aggregate deadline
and per-result progress evidence. Incomplete acquisition fails before normalization.
Progress directories are diagnostic evidence, not resume or publication authority.
Preserve the independent MEE release branch and existing artifact-selection fixes;
local tests and small provider probes do not establish a full successful refresh.

Contract: `docs/contracts/COMPLETED_PRICING_CANARY_HEALTH_V1.md`.

Backup startup exposed a stale six-hour GitHub observer for the already closed
August 13–16 canary. It incorrectly degraded launch health and paused MTG and
backup workers even while current production pricing was healthy. Checkpoint 94
records the passed gate and permanent run32194979152 artifacts. The control plane
now verifies those exact hashes and the unchanged frozen workflow before reporting
the gate as completed. Its original August evidence date remains explicit; current
GitHub stale/failure history remains attached. Missing/changed proof or a replacement
canary workflow fails closed. Current pricing/source/publication health probes and
their freshness thresholds remain independent and unchanged. Never rerun an expired
no-op schedule just to renew its timestamp, or activate pricing to repair monitoring.

Deploy only the control-plane package with its permanent closeout artifacts, keeping
MTG, pricing, MEE and backup runtimes pinned. Refresh real control-plane evidence,
rerun the paused read-only MTG audit, and verify manual then automatic backup runs.
Keep the startup failure and earlier control-plane reports as incident history.

## Recovered pricing health — October 6, 2026

Pricing retries can retain `failed_at` after a successful completion. The control
plane accepts that historical failure only when the current state is published
or verified, reconciliation succeeded, both error fields are cleared, and valid
completion time is strictly later than the failure and no later than observation.
Freshness still uses the completion time and the existing threshold. An active
failure, ambiguous chronology, missing completion, or uncleared error stays failed.
Never clear stored incident timestamps or manufacture healthy worker receipts.

The repair checkout is `C:/gv_agent_health_20261006`, based on the actually deployed
control-plane producer `1379bbf192e92bba86ef1d4cf8b6c3161b5fa85e`; these runtime
files are absent from the current application main tree. Keep the application
release and the separate pricing/MEE/catalog worker runtimes unchanged. Private
qualification and deployment receipts belong in
`C:/grookai_vault_operator_artifacts/agent_health_recovery_20261006`.
After a qualified immutable control-plane release, collect real health evidence
and rerun the blocked read-only catalog audits sequentially. Their actual catalog
findings remain visible; a recovered pricing status is not catalog completeness.
