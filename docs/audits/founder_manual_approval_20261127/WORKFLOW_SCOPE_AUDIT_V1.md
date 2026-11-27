# Founder Manual Approval Workflow Scope Audit V1

Date: 2026-11-27. Scope: documentation only.

## Owner direction

After 31 stamped-image review tasks were placed in Founder Operations, the
owner requested a reusable workflow contract for future manual phone approvals,
including items other than images, added to the existing system. The owner also
requires a clickable copy whenever confirmation is requested.

## Existing authority and implementation inspected

Source baseline: `a28ec5e9862bfd653f71fe33407280f246061b0f`.

- `FOUNDER_OPERATIONS_COMMAND_CENTER_V1`, `FOUNDER_WORK_ITEM_COMMAND_V1`, and
  `OPERATIONS_AGENT_PROTOCOL_V1` already define the queue, frozen proposals,
  authenticated decisions, evidence, publication, and service-only execution.
- `FOUNDER_OUTCOME_WORKFLOW_V1` already binds a multi-stage executable outcome
  to one approval. Routine stage continuation must not create approval loops.
- `CANON_WAREHOUSE_FOUNDER_GATED_PROMOTION_CONTRACT_V1` keeps review, founder
  promotion authority, staging, and successful execution separate.
- The command-center migrations, including
  `20260831054500_founder_operations_command_center_repair_v1.sql`, create a
  command on approval only when `command_policy.execution_enabled` is true.
- `lib/screens/founder/founder_operations_screen.dart` exposes **Approve review**
  for review-only tasks and **Open evidence** links, preferring `durable_uri`
  over `source_uri`. Web `/founder/operations` is an existing queue; its frozen
  JSON rendering alone is not proof of equivalent clickable evidence controls.

## Narrow addition

The new V1 companion contract governs reusable manual-review preparation,
clickable evidence, one decision per independent item, phone handoff, and
reconciliation of actual founder decisions across domains. It does not duplicate
the command/state-machine contracts or change any frozen source contract.

The new contract is registered in the authoritative index and discoverable from
the master rulebook, operator playbook, and documentation index. A runbook and preparation template
make the existing APIs reusable without copying a one-off image publisher.

## Verification boundary

This change adds no schema, RPC, worker, UI, production task, founder decision,
model call, deployment, or execution authority. No physical phone test is
claimed. Documentation verification checks local links, index registration,
required boundaries, and the documentation-only diff. Existing runtime gates
remain the verification authority for future publications and operations.

Local documentation checks passed: all 12 relative links in the four new
documents resolve, the contract is indexed exactly once, rulebook and top-level
documentation navigation link to it, and `git diff --check` reports no errors.

The initial draft's normal commit hook stopped before running its full
shipcheck because the sparse documentation checkout lacked `package.json`.
That draft and its exact staged patch remain retained on
`docs/founder-manual-approval-20261127`; no hook or gate was bypassed.

## Fresh-main integration

On continuation, freshly fetched `origin/main` was
`a9e515177f258bce2c332f044b5212462b5b2451`. The exact seven-file draft patch
applied cleanly to a separate complete checkout on
`docs/founder-manual-approval-main-20261127`. The operator playbook receives the
same workflow pointer under its living-documentation rule. All inherited OCR
changes remain outside this documentation-only candidate.

Normal commit/push and hosted-check receipts belong under
`C:/grookai_vault_operator_artifacts/founder_manual_approval_release_20261127/`.
Integration preparation itself grants no production data, decision, or runtime
write authority. Merge and any external acceptance remain separate gates;
receipt success must be read directly rather than inferred from this audit.
