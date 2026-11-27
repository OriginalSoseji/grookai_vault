# Founder Manual Approval Runbook V1

Status: Active reference, 2026-11-27.

Authority: [Founder Manual Approval Workflow Contract V1](../contracts/FOUNDER_MANUAL_APPROVAL_WORKFLOW_CONTRACT_V1.md).

## Prepare

1. Identify the founder's actual decision and applicable domain contracts. Split
   independent decisions into individual tasks; keep the registered stages of
   one executable outcome together.
2. Inventory the exact items. Reconcile existing tasks and retained confirmations
   before calculating how many decisions remain. Read current state rather than
   assuming an old artifact is current.
3. Use the [packet template](../templates/FOUNDER_MANUAL_REVIEW_PACKET_V1.md).
   Supply a short question, exact target, proposed result, uncertainty, approval
   meaning, scope, exclusions, and clickable evidence for each task.
4. Retain original artifacts, provenance, hashes, and sizes. Verify the evidence
   route is phone-accessible, remains available for the review window, and
   preserves access controls. Do not publish secrets or local-only file links.
5. Choose review-only unless the proposal explicitly includes an approved
   executable workflow class. Review-only means execution disabled and no
   executor. For execution, freeze every stage, effect, ceiling, deadline, and
   stop condition before asking for approval.

## Publish through the existing system

1. For Supabase-backed publication, perform the rulebook environment sanity
   checks first. Use the shared backend client; never print credentials.
2. Reuse an appropriate registered agent. If needed, register a narrowly scoped
   manual review agent using `operations_register_agent_v1`; do not alter an
   unrelated agent's policy. Record its run/heartbeat through existing APIs.
3. Record the batch manifest, deterministic keys, expected count, frozen
   fingerprints, evidence references, and publication intent.
4. Use `operations_publish_work_item_v1` with attached evidence through the
   existing publisher contract. Preserve receipts. On a timeout or partial
   failure, read back keys and versions before deciding whether a retry is safe.
5. Independently read back all expected tasks and linked evidence. Verify exact
   payloads and policies. For review-only tasks, confirm zero related commands,
   no publisher-made founder decisions, and unchanged domain candidates.
6. Keep a batch reconciliation artifact with task IDs, versions, fingerprints,
   evidence IDs, expected/published/blocked counts, and verification results.

## Hand off to the founder

Send a short summary such as:

> There are **N items left**. They are in
> [Founder Operations](https://grookaivault.com/founder/operations).
> Look for **Review [topic]:**, open each evidence link, then approve, reject,
> or request a correction. These tasks record review only; publication remains
> a separate governed step.

Adapt the last sentence for executable outcomes so the founder knows the exact
effects approval authorizes. Link a supported app/queue route; verify the chosen
surface actually exposes the task evidence. Account for queue pagination.
Do not ask for AI credit when manual review can answer the question.

## Resume and close

1. Read founder decisions through existing authorized read paths; the founder
   uses `founder_operations_decide_v1` from their authenticated client. Never
   invoke it as a substitute founder or fabricate an identity.
2. Reconcile every item against its decided version/fingerprint. Preserve notes
   and actor/decision provenance. Keep pending/deferred items pending; route
   rejection and repair requests to follow-up rather than execution.
3. Prepare a new version for material corrections. Do not reuse approval of old
   evidence or ask again for an unchanged, valid decision already recorded.
4. Continue only the domain actions actually authorized. Review completion,
   warehouse staging, execution, and public publication are distinct outcomes.
5. Retain receipts and report the remaining count. Do not mark the whole batch
   complete until every item has an accounted-for disposition, or mark a domain
   operation successful without its required verification.
