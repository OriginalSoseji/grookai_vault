# Founder Outcome Workflow V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Purpose

A founder approves an outcome, not a single implementation step. One phone
decision authorizes every stage explicitly listed in one immutable plan. The
registered executor advances those stages without requiring the founder to
return to a computer.

The workflow remains a bounded operations interface. It is not remote shell,
arbitrary SQL, a generic URL runner, or permission to discover additional
writes after approval.

## Approval Unit

An execution-enabled outcome work item contains:

- one source commit and plan fingerprint;
- one versioned `outcome_workflow` object;
- the terminal result the founder is approving;
- an ordered list of registered stages;
- expected effects and exclusions for every stage;
- cost, write, retry, and execution-deadline ceilings;
- the conditions that stop automation and return the item to Pulse.

The plan fingerprint covers the complete workflow. A later stage may not add a
row, object, publication action, or external side effect absent from that plan.

## Stage Contract

Every stage has a stable key, code-registered handler key, mode, fingerprint,
expected effects, exclusions, and attempt ceiling. Stage handlers are selected
from a repository registry. Plan data cannot provide SQL, shell, executable
paths, URLs, endpoints, environment values, or secrets.

Successful stages must reconcile their expected effects. Their receipts are
append-only and survive process restarts. A resumed workflow skips stages that
already have a successful receipt. A stage that may write must therefore be
idempotent and must perform exact readback before repeating any mutation.

## Automatic Continuation

The scheduled dispatcher claims one approved outcome command and executes its
registered stages in order. The founder receives terminal success or a genuine
exception, not requests to authorize normal continuation.

Only these failure classes may be retried automatically within the frozen
attempt and deadline ceilings:

- executor lease expiration;
- transient executor failure;
- provider rate limit;
- network timeout.

All other failures remain stopped. Previously reconciled stages are not run
again.

## Mandatory Stop Conditions

Automation stops when:

- scope expansion is required;
- evidence contradicts the frozen plan;
- a cost or write ceiling would be exceeded;
- a destructive action was not approved;
- a public action was not approved;
- exact reconciliation fails.

The failed item and evidence return to Founder Operations. Repair creates a new
version when the plan must change.

## Founder Experience

The phone shows the terminal outcome, all stages, current progress, exclusions,
and immutable authority before approval. The approval action is **Approve
complete outcome**. After approval, no desktop follow-up is required for any
stage already listed in the frozen plan.

## Registration Rule

A new workflow class requires reviewed repository code, contract tests, and an
explicit registry entry once. Subsequent work-item instances of that workflow
class do not require code changes or desktop dispatch. Unregistered workflows
and stage handlers fail closed.

## Compatibility

Existing source-specific V1 commands remain supported. Their old approvals are
not broadened retroactively. New multi-stage operations must publish the full
outcome before the phone decision; omitted work cannot be inferred after
approval.

## Registered Domain Workflows

`catalog_set_completion_v1` is the first canonical-write domain workflow. It
accepts only a code-registered catalog writer, an exact target identity, a
clean collision preflight, a non-empty expected row-count map, the source
commit, and the writer's payload fingerprint. Its final stage is successful
only when the writer reports a committed transaction and exact durable
readback for every approved count. It cannot write Storage, image pointers,
pricing, Vault data, public visibility, updates, deletes, or another target.

Catalog candidates that cannot produce this complete package remain
review-only. A review-only item is never converted into write authority by an
executor.
