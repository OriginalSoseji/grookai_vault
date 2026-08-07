# Account Deletion Operations V1

## Purpose

This runbook processes verified Grookai Vault account-deletion requests without exposing service credentials, deleting the wrong collector, or discarding required operational evidence.

The public policy permits deletion or anonymization. A hard delete is used only when production foreign-key and Binder readback proves it is safe. An account with required operational history follows an anonymized retention path instead.

## Security Boundaries

- Run the worker only from a trusted operations environment.
- Never place the service key in Flutter, browser code, committed files, command output, or permanent artifacts.
- Identify the collector from a verified support request and record a private request ticket.
- Permanent artifacts contain a SHA-256 target fingerprint, not the raw user UUID or email.
- The default command is read-only.
- Apply requires the exact live plan SHA-256 in both the CLI and `GROOKAI_ACCOUNT_DELETION_ACK`.
- Active or archived owned Binders must be transferred or deleted before account deletion.
- Storage objects are removed before the Auth user.
- A post-apply readback must prove the Auth row, direct references, and owned Storage are absent.

## Dry Run

```powershell
node scripts/ops/account_deletion_worker_v1.mjs `
  --user-id=<PRIVATE_USER_UUID> `
  --request-ticket=<PRIVATE_REQUEST_TICKET>
```

Review `dry_run_plan.json`. Confirm the target fingerprint against the private support record and inspect the decision.

## Decisions

- `hard_delete_allowed`: no retained operational blocker is populated. The worker can delete user-owned listings, scrub nullable attribution, remove owned Storage, run Binder cleanup, hard-delete Auth, and reconcile.
- `manual_binder_resolution_required`: transfer or delete owned Binders and create a new plan.
- `soft_delete_and_anonymized_retention_required`: required warehouse or interaction history is present. Do not force a hard delete. Disable access, remove public identity and user-owned content, and retain only pseudonymous operational evidence under the approved retention schedule. V1 intentionally refuses this mutation until its dedicated scrub plan is independently reviewed.
- `policy_repair_required`: a new hard-delete blocker exists. Stop and update the policy and contract tests before processing the request.

## Hard Delete Apply

```powershell
$env:GROOKAI_ACCOUNT_DELETION_ACK='<PLAN_SHA256>'
node scripts/ops/account_deletion_worker_v1.mjs `
  --apply `
  --user-id=<PRIVATE_USER_UUID> `
  --request-ticket=<PRIVATE_REQUEST_TICKET> `
  --expected-plan-sha256=<PLAN_SHA256>
Remove-Item Env:GROOKAI_ACCOUNT_DELETION_ACK
```

If the live target state changes after planning, the worker refuses the apply. Never replace the expected hash with a new value without reviewing the new dry-run plan.

## Required Evidence

- Hashed request ticket and target fingerprint.
- Exact plan SHA-256.
- Decision and populated-reference counts.
- Storage object counts by bucket.
- Binder cleanup result.
- Auth absence readback.
- Zero direct-reference rows and zero owned Storage objects after a hard delete.
- Test account proof before release; no real user is used for the exercise.

## Incident Handling

If Storage cleanup or Auth deletion fails, stop automatic processing. Preserve the sanitized failure artifact, keep the support ticket open, and rerun a fresh dry-run inventory. Do not delete unrelated objects, alter foreign-key constraints, or use direct destructive SQL against an unverified collector.
