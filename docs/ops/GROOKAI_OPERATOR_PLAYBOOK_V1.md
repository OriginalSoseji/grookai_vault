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
