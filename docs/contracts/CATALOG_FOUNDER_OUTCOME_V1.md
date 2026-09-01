# Catalog Founder Outcome V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Objective

One founder approval completes an exact supported catalog-set insertion from
preflight through durable readback. Ordinary execution does not require a
desktop follow-up.

## Preparation

Universal Catalog Discovery remains read-only. For each admitted gap, it may
run a code-registered source-specific writer in `plan` mode. An executable
outcome package is created only when all of the following hold:

- the Master Index or source authority admitted the exact gap;
- the writer and target shape are registered in repository code;
- the writer ran from the exact source commit;
- collision preflight is zero;
- the payload fingerprint is valid and frozen;
- expected canonical write counts are nonzero and exact;
- updates, deletes, Storage, image pointers, pricing, Vault, publication, and
  public visibility changes are all zero.

No canonical row is written while preparing or publishing the outcome.

## Phone Approval

The work item shown in Founder Operations contains the target, writer class,
expected row counts, terminal outcome, stages, exclusions, source revision,
and evidence fingerprint. **Approve complete outcome** creates one immutable
command bound to that plan.

The approval does not authorize arbitrary scripts, SQL, URLs, environment
values, secrets, target substitution, or rows discovered later.

## Execution

The scheduled control-plane dispatcher checks out the command's source commit.
The registered handler reconstructs the allowlisted writer invocation from
code, not from executable plan data. The writer must recompute the same payload
fingerprint before mutation.

The writer uses its existing serializable, insert-only transaction, collision
preflight, exact row-count checks, and durable readback. A source change that
alters the payload fails closed and requires a newly prepared phone item.

## Supported Writers

- MTG exact missing-set promotion;
- One Piece exact missing-set promotion;
- English Pokemon Master-Index-gated incremental completion;
- Japanese Pokemon structured full-set incremental completion.

The frozen-official Japanese checklist lane remains review-only until its
source package can be reproduced by the executor without broadening authority.
Any future writer must separately adopt expected-payload fingerprint checking,
exact durable readback, and a repository registry entry.

## Reconciliation

Success requires:

- writer mode `apply`;
- the approved payload fingerprint;
- a committed transaction;
- exact durable readback for every approved count;
- zero public visibility changes;
- an append-only successful workflow-stage receipt;
- terminal command reconciliation.

Anything else is a failed or exception outcome. The system never reports a
phone-approved catalog job as complete merely because it was queued.
