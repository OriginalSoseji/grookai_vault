# Founder Approved Command Dispatcher V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Purpose

Remove the manual terminal step between an exact founder phone approval and its
source-specific executor while preserving the Founder Operations trust boundary.

The dispatcher is not a generic writer. It observes queued commands through a
private read-only RPC and selects at most one command from a code-reviewed
registry. The selected source-specific executor remains responsible for leasing,
preflight, mutation, readback reconciliation, and terminal command state.

## Scheduled Flow

1. Operations maintenance runs on its existing 15-minute schedule.
2. The dispatcher checks each registered action and exact executor version.
3. An empty queue exits successfully without an artifact or database mutation.
4. A resolved command must contain a valid UUID, future deadline, exact action,
   exact executor version, lowercase plan fingerprint, and frozen Git commit.
5. GitHub checks out the command's frozen source revision.
6. A hard-coded workflow handler invokes the matching source-specific executor.
7. The executor atomically leases the exact command and revalidates its frozen
   scope before any domain mutation.
8. Success requires independent durable readback and reconciliation.

## Registry Boundary

V1 registers only:

- action: `apply_tk_sm_r_hidden_set_v1`
- executor: `TK_SM_R_HIDDEN_SET_APPLY_EXECUTOR_V1`
- handler: `tk_sm_r_hidden_set_apply_v1`

Registry entries live in reviewed source code. Work items, founder decisions,
commands, database rows, environment variables, and GitHub inputs cannot add a
handler or change an executor mapping.

Adding a future executor requires:

- a dedicated source-specific action and executor version;
- an idempotent lease and completion contract;
- a frozen source revision and immutable plan fingerprint;
- independent preflight and readback reconciliation;
- explicit registry and workflow-handler changes;
- contract tests proving its write and exclusion boundaries.

## Security Invariants

1. Founder clients cannot invoke a writer or provide executor arguments.
2. Approval must create an exact server-derived queued command.
3. The dispatcher uses `operations_peek_command_action_v1` and never leases or
   mutates domain data.
4. Only the frozen source-specific executor may lease the command.
5. Unsupported actions and executor versions remain queued until repaired or
   expired; they are never executed through a fallback.
6. Dynamic shell commands, script paths, SQL, URLs, and environment overrides
   are prohibited.
7. Manual and scheduled workflows use separate non-cancelling GitHub concurrency
   groups so a scheduled tick cannot replace a pending manual fallback.
8. The source-specific executor's atomic exact-command database lease is the
   authoritative exactly-once execution boundary across both workflows.
9. The global execution pause and per-agent pause remain authoritative.
10. A missing, malformed, stale, expired, or drifted command fails closed.
11. No command is successful without exact durable readback reconciliation.

## Operational Policy

- Poll interval: existing operations-maintenance schedule, every 15 minutes.
- Commands processed per dispatcher cycle: at most one.
- Retry authority: the frozen command's existing attempt and deadline policy.
- Idle cycles: successful no-op, no persistent artifact required.
- Resolved or failed cycles: preserve execution evidence for 90 days.
- Manual source-specific workflow: retained as an audited fallback.

## Prohibited Behavior

- automatic approval;
- execution of review-only work items;
- broad or arbitrary command leasing;
- command selection from unregistered action names;
- bypassing frozen-SHA checkout;
- rerunning a canonical writer after exact state already exists;
- public catalog publication unless separately included in an approved executor;
- dynamic registration through database content or founder-supplied text.

## Definition Of Done

V1 is complete when the exact TK-SM-R phone-approved command path has succeeded,
the dispatcher returns a production idle no-op after that success, all dispatcher
and source-executor contracts pass, the scheduled workflow is active on `main`,
and one scheduled run proves it performs no additional canonical writes when no
registered command is queued.
