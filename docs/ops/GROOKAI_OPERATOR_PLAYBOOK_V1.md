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
