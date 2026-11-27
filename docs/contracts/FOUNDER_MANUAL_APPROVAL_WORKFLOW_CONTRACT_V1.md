# Founder Manual Approval Workflow Contract V1

## Status

Active. Owner-directed workflow addition, 2026-11-27.

## Purpose and relationship to the existing system

Use the existing Founder Operations queue for decisions the founder can make
manually from a phone. This applies to images, identity or mapping proposals,
documents, data corrections, policy exceptions, release plans, and other
bounded proposals that need founder judgment.

This is a companion workflow to
[Founder Operations](FOUNDER_OPERATIONS_COMMAND_CENTER_V1.md),
[Founder Work Items](FOUNDER_WORK_ITEM_COMMAND_V1.md), and the
[Operations Agent Protocol](OPERATIONS_AGENT_PROTOCOL_V1.md). It adds preparation,
evidence, handoff, and decision-reconciliation requirements. It does not create
another approval store, replace their state machines, or amend frozen contracts.

## When to use it

- When the founder requests phone/manual review, publish prepared items to
  Founder Operations instead of asking serial confirmation questions in chat.
- Default to this queue for batches of independent decisions. The founder may
  also request it for a single item. Report the exact remaining count and link
  to the queue after publication and readback.
- Manual review is a supported decision method. Model access, paid AI credits,
  or automatic interpretation must not be prerequisites for a decision the
  founder can make from the supplied evidence. Domain requirements for later
  processing and execution still apply.

## Approval unit and meaning

One task represents one independently decidable proposal. A batch identifier
may group tasks, but approval of one task does not approve its neighbors.
Already-confirmed items must be reconciled against retained evidence and
decision scope before creating tasks; do not fabricate founder decisions or
re-prompt unchanged confirmations without a required domain reason.

Every task must state, in plain language:

- what the founder is being asked to confirm or authorize;
- the exact item or target, proposed result, and relevant uncertainty;
- whether approval records a review only or authorizes a bounded execution;
- the effects, exclusions, applicable expiry, and what happens next.

Review-only tasks must set `command_policy.execution_enabled: false` and
`executor_version: null`. **Approve review** records approval of the frozen
review package. It must create no execution command or domain mutation. A task
marked `approved` is not evidence that an image was published, a warehouse
candidate was staged, or an operation succeeded.

When the founder is approving an executable outcome, use the existing
allowlisted command or [Founder Outcome Workflow](FOUNDER_OUTCOME_WORKFLOW_V1.md).
Display all approved stages and effects before the decision. Do not split normal
stages of one already-approved outcome into repeated permission requests. Never
upgrade an existing review-only task into execution authority.

## Evidence must be usable from the phone

Every confirmation request must include a clickable copy of the material being
reviewed, in the task's evidence as well as any chat confirmation request.
A local Windows path, screenshot thumbnail, opaque hash, or JSON dump alone is
not a usable phone handoff.

- Images: link the original image, with its exact identity, provenance, SHA256,
  media type, and byte size. A crop or annotation may supplement the original.
- Data and mappings: provide the current value, proposed value, stable target
  IDs, and clickable source evidence or an exact comparison document.
- Documents, policy exceptions, and releases: link a readable frozen packet
  showing the decision, scope, limits, and applicable verification evidence.
- Preserve evidence bytes and provenance under existing retention rules. Check
  reachable artifact bytes against their retained hashes where applicable.
  A mutable source URL alone does not freeze the evidence.
- Keep private evidence private. Use an authenticated mobile-accessible viewer
  or approved durable evidence route. Do not expose credentials, private data,
  or expiring bearer links in a frozen task.
- Verify that the selected mobile surface exposes the evidence link and decision
  controls. If it cannot, identify the specific limitation and supply a usable
  supported route before calling the phone handoff complete. Do not claim a
  physical-device check from code inspection or database readback alone.

## Publication and decision integrity

Use registered agents and existing service-only publication RPCs through the
shared backend client. Reuse the existing founder entitlement, authentication,
version/fingerprint checks, evidence objects, and append-only decision ledger.
No parallel approval table or client-side writer is authorized by this contract.

Publish a deterministic work-item key and frozen version/fingerprint, with
explicit scope, exclusions, source/contract versions, evidence links, and expiry
when applicable. Select risk and recent-auth policy from the actual effects;
review-only does not automatically mean low risk. New proposal types must fit
the registered agent's allowed types; new execution types still require their
existing reviewed code and registry process.

Retain publication intent and receipts. Independently read back each published
task, its evidence, fingerprint, policy, and state. Reconcile ambiguous responses
before retrying; do not duplicate tasks or replay a consumed execution attempt.
Account for every expected item, including queued, already decided, deferred,
rejected, superseded, or blocked items. Page through bounded queues as needed.

Only the authenticated founder records founder decisions. The assistant may
prepare and publish tasks, explain evidence, and read decisions. It must not
submit approvals on the founder's behalf or infer approval from silence,
elapsed time, queue publication, acknowledgment, a note, or another item's answer.

Reject and request-repair dispositions stop that proposal. Notes and corrections
are not approval of a changed payload. Material changes to targets, evidence,
scope, or effects require a new frozen version and a fresh decision. Preserve
the earlier version and decision; expired or superseded versions cannot execute.

## Reconciliation and continuation

On continuation, read the actual decisions and current work-item versions from
Founder Operations. Record counts of pending, approved, rejected, deferred,
repair-requested, expired, and superseded items, with decision IDs, actors,
timestamps, and fingerprints. Preserve confirmed facts with their exact scope.

Consume a review decision only through the domain's governed next step. In
particular, the [warehouse founder gate](CANON_WAREHOUSE_FOUNDER_GATED_PROMOTION_CONTRACT_V1.md)
still requires its own founder-authorized promotion path, frozen staging payload,
and executor. A visual confirmation alone does not satisfy those transitions.
Pricing, identity, release, security, and migration gates remain binding.

If further execution authority is required, prepare the concrete bounded
proposal in the same queue. If an execution-enabled frozen outcome already
covers the next steps, continue it under its existing gates without asking again.
Report review completion separately from execution and verified publication.

## Verification and reusable artifacts

A handoff is complete only when the exact expected tasks and evidence are read
back, each approval meaning is clear, phone links are usable, and no publisher
has supplied a founder decision. Review-only publication must preserve domain
rows and create zero execution commands. Existing double-tap, stale-version,
expiry, entitlement, and append-only protections must remain in force.

Apply the [runbook](../ops/FOUNDER_MANUAL_APPROVAL_RUNBOOK_V1.md) and
[packet template](../templates/FOUNDER_MANUAL_REVIEW_PACKET_V1.md).
The initial scope audit is [recorded here](../audits/founder_manual_approval_20261127/WORKFLOW_SCOPE_AUDIT_V1.md).
