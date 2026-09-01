# Catalog Founder Outcome Automation V1

## Status

`IMPLEMENTED_AND_PRODUCTION_SMOKED`

The general phone-approved catalog outcome path is deployed. A supported,
writer-ready catalog candidate can now be packaged as one frozen outcome,
approved from the founder client, dispatched by the scheduled control plane,
applied by an allowlisted writer, and closed only after exact durable readback.

This checkpoint does not claim that a new real catalog outcome was applied after
the generalization. The first production discovery run found no writer-ready
promotion candidate and correctly produced no executable work item.

## Context

The first catalog phone approval was a review-only decision. It recorded that
the founder accepted a set candidate, but its contract explicitly disabled
execution. Completing that set still required a separately prepared executable
work item and operator-driven workflow.

TK-SM-R later proved the complete phone-to-executor path for one source-specific
action. This project generalized that proven boundary to supported catalog
writers without allowing database content or the phone client to choose scripts,
arguments, SQL, or arbitrary execution behavior.

## Problem

Approving a review-only candidate from the phone did not mean "complete this
catalog outcome." The approval created no command, so the founder still had to
return to a computer for preflight, writer selection, apply, and reconciliation.

## Risk

A generic implementation could widen reviewed scope after approval, execute an
unreviewed writer, use stale or tampered artifacts, apply from a different
commit, add Japanese enrichment outside a selected set, or report success
without exact durable readback.

## Decision

- Keep discovery and Master Index admission read-only.
- Package executable outcomes only from clean, supported, non-empty preflights.
- Pin the exact target, source run, source commit, payload fingerprint, artifact
  hashes, exclusions, and expected durable counts before founder review.
- Select writers from a versioned source-code registry only.
- Require every apply invocation to present the expected payload fingerprint.
- Re-read child artifacts by file bytes before packaging them.
- Require the package and work item to come from the same discovery candidate
  set, commit, and GitHub run.
- Keep unsupported, ambiguous, incomplete, and tampered targets review-only or
  held.
- Require exact durable readback before a command can succeed.
- Keep all Japanese legacy enrichment outside the generic set outcome.

## Supported Outcome Writers

- MTG exact missing-set writer
- One Piece exact missing-set writer
- English Pokemon Master-Index-gated writer
- Japanese Pokemon structured full-set writer, with legacy enrichment disabled

Other catalog lanes remain discovery or review-only until their complete writer
contract is registered and tested.

## Implementation Provenance

- Pull request: `https://github.com/OriginalSoseji/grookai_vault/pull/363`
- Merged main commit: `95a2941dc9800ef65a2ad574d7a259c56464508c`
- Outcome contract: `CATALOG_FOUNDER_OUTCOME_V1`
- Outcome workflow contract: `FOUNDER_OUTCOME_WORKFLOW_V1`
- Discovery workflow: `universal-catalog-discovery.yml`
- Dispatcher workflow: `operations-control-plane-maintenance.yml`

The implementation added deterministic outcome packaging, a code-registered
executor, exact invocation metadata, artifact tamper checks, target-aware
supervisor planning, and review-only fallback publication.

## Prior Phone Decision Readback

Production history preserves the original distinction:

- Review-only item: `8fd61c41-d4d2-484a-a312-4891826d529e`
- Action: `review_catalog_set_candidate`
- Decision: `approve`
- `execution_enabled`: `false`
- Command created: none

The later executable TK-SM-R item proves the intended outcome boundary:

- Outcome item: `68e8e48b-babc-42eb-b234-92131de1e185`
- Command: `39fc4f45-ba76-497e-a88f-1d383e2a766f`
- Decision: `approve`
- `execution_enabled`: `true`
- Command status: `succeeded`
- Attempts: `1`
- Durable reconciliation: exact

Old review-only approvals are not retroactively widened into write authority.

## Production Discovery Proof

- Run: `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33529825752`
- Producer commit: `95a2941dc9800ef65a2ad574d7a259c56464508c`
- Result: `success`
- Source requests: `121`
- Source sets inspected: `1,258`
- Source failures: `0`
- Actionable catalog gaps: `7`
- Canonical promotion candidates: `0`
- Selected writer targets: `0`
- Executable outcomes: `0`
- Published work items: `0`
- Canonical writes: `0`
- Writer dispatches: `0`

The seven actionable gaps were all English Pokemon gaps:

- five incomplete sets: `jumbo`, `mfb`, `tk-hs-g`, `tk-hs-r`, `tk-sm-l`
- two missing sets: `miscp`, `sp`

They did not pass Master Index and independent-source admission, so no outcome
package was created. The run also identified `62` Master Index update candidates
(`59` English and `3` Japanese), all requiring independent language-source
evidence and a rebuilt Master Index before promotion.

## Production Dispatcher Smoke

- Run: `https://github.com/OriginalSoseji/grookai_vault/actions/runs/33530607391`
- Producer commit: `95a2941dc9800ef65a2ad574d7a259c56464508c`
- Maintenance job: `success`
- Dispatcher job: `success`
- Queue state before run: empty
- Command found: `false`
- Frozen executor checkout: skipped
- Writer invocation: skipped
- Canonical writes: `0`

The empty queue was independently read back from production before the smoke:
one historical command existed, it was already `succeeded`, and no command was
queued, leased, or running.

## Verification

- Focused catalog outcome suite: `74/74` passed before the final P1 repair.
- Final P1 focused suite: `23/23` passed.
- Full repository contract suite: passed.
- Full repository shipcheck: passed, including web build, Flutter analysis, and
  `646` Flutter tests.
- GitHub CodeQL, drift, runtime protection, scan, Windows rollout, and Vercel
  checks: passed on the implementation PR.
- Production discovery and idle dispatcher workflows: passed from merged main.

## Current Truths

- Future supported writer-ready catalog candidates no longer require a desktop
  apply after phone approval.
- The phone still cannot execute arbitrary code or write canonical rows directly.
- A discovery gap is not automatically an executable outcome.
- Master Index/source admission remains a required upstream truth boundary.
- No current catalog command is waiting for execution.
- No canonical data was changed merely to manufacture an end-to-end proof.

## Invariants

- One approval authorizes only one frozen target and payload fingerprint.
- Writer selection comes from reviewed source code, never database content.
- Selected IDs, artifact bytes, source commit, source run, and durable counts
  must reconcile exactly.
- A failed or unsupported target cannot be silently substituted or widened.
- No command succeeds without exact durable readback.
- Discovery, held targets, and review-only candidates cannot write canonical
  catalog data.

## What Must Never Be Broken

- Do not turn old review-only decisions into executable authority.
- Do not bypass Master Index or independent-source admission to create work.
- Do not accept caller-provided script paths, SQL, URLs, or writer arguments.
- Do not include legacy Japanese enrichment in a generic set outcome.
- Do not report a no-op discovery run as a real canonical apply proof.

## Exact Next Gate

Allow the scheduled discovery and Master Index automation to produce the first
supported, independently admitted, non-empty writer target. Confirm that its
phone card is an executable `catalog_set_completion_v1` outcome, approve it once
from the phone, and observe the scheduled dispatcher apply and exact durable
readback without any desktop action. Stop and surface a founder exception only
if source evidence changes, collisions appear, reconciliation fails, or the
target belongs to an unregistered writer lane.
