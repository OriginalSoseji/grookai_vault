# CANON_WAREHOUSE_FOUNDER_GATED_PROMOTION_CONTRACT_V1

## Status
ACTIVE

## Type
Companion Contract

## Purpose

This contract defines the founder-gated promotion boundary for the Canon Warehouse.

It makes founder approval and mandatory pre-promotion staging binding requirements before any warehouse candidate may mutate canon.

This contract exists to ensure that:

- warehouse processing may scale safely
- reviewer actions do not silently become canon authority
- promotion execution consumes only explicitly founder-approved staged payloads

---

## Amendment Scope

This contract amends the workflow semantics of the canon warehouse contract set where wording is currently too broad or insufficiently explicit.

It is authoritative for:

- founder-gated promotion authorization
- mandatory pre-promotion staging
- authoritative warehouse promotion state vocabulary
- frozen staging payload requirements
- promotion executor consumption rules

If any wording in:

- `CANON_WAREHOUSE_CONTRACT_V1.md`
- `CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1.md`

conflicts with this contract on promotion authorization or state-machine behavior, this contract controls.

---

## Core Principle

Nothing enters canon without explicit founder approval.

Nothing approved by the founder may enter canon until it is staged for promotion with a frozen execution payload.

Approval and promotion are separate events.

Staging and promotion are separate events.

---

## Founder Approval Rule

Founder approval is the only authorization that may move a warehouse candidate into the promotion path.

No reviewer approval, admin acknowledgment, heuristic confidence, background processing result, or notification event may substitute for founder approval.

This rule is mandatory for all canon mutations originating from the warehouse.

---

## Review vs Founder Rule

Review and founder approval are not equivalent.

Review may:

- inspect evidence
- inspect interpreter output
- reject
- archive
- defer
- prepare a recommendation

Review alone must not authorize canon mutation.

Only founder approval may authorize movement from review into the promotion path.

---

## Mandatory Staging Rule

All warehouse candidates approved for canon mutation must pass through a staging state before promotion execution.

The staging state exists to:

- freeze the approved promotion payload
- separate authorization from execution
- support deterministic execution
- preserve rollback-safe auditability

No canon mutation may occur directly from review or approval state.

---

## Automatic Ceiling Rule

`REVIEW_READY` is the highest state any automatic process may assign.

No automated system may assign:

- `APPROVED_BY_FOUNDER`
- `STAGED_FOR_PROMOTION`
- `PROMOTED`

These states are strictly human-gated or execution-gated.

---

## Authoritative State Machine

The authoritative warehouse promotion state machine is:

- `RAW`
- `NORMALIZED`
- `CLASSIFIED`
- `REVIEW_READY`
- `APPROVED_BY_FOUNDER`
- `STAGED_FOR_PROMOTION`
- `PROMOTED`
- `REJECTED`
- `ARCHIVED`

Any older vocabulary such as `PROMOTABLE` or `APPROVED_FOR_PROMOTION` must be treated as non-authoritative shorthand once this contract is active.

---

## State Definitions

### `RAW`

Purpose:
- evidence has entered the warehouse but has not been processed

Entered by:
- intake path only

Requires:
- valid submission record
- uploader identity
- required notes
- evidence attachment or evidence linkage

Allows next:
- `NORMALIZED`
- `ARCHIVED`

Automatic:
- yes

Founder-only:
- no

### `NORMALIZED`

Purpose:
- evidence and metadata have been prepared for interpretation

Entered by:
- automatic processing

Requires:
- `RAW`
- normalized submission metadata
- normalized reference hints if present

Allows next:
- `CLASSIFIED`
- `ARCHIVED`

Automatic:
- yes

Founder-only:
- no

### `CLASSIFIED`

Purpose:
- interpreter output exists

Entered by:
- automatic processing

Requires:
- `NORMALIZED`
- interpreter decision
- interpreter reason code

Allows next:
- `REVIEW_READY`
- `ARCHIVED`

Automatic:
- yes

Founder-only:
- no

### `REVIEW_READY`

Purpose:
- candidate is fully processed and ready for human review

Entered by:
- automatic processing

Requires:
- `CLASSIFIED`
- proposed action
- reviewer-visible context package

Allows next:
- `APPROVED_BY_FOUNDER`
- `REJECTED`
- `ARCHIVED`

Automatic:
- yes

Founder-only:
- no

### `APPROVED_BY_FOUNDER`

Purpose:
- founder has explicitly authorized the candidate for the promotion path

Entered by:
- founder action only

Requires:
- `REVIEW_READY`
- founder identity
- approval note or approval rationale
- locked approved action selection

Allows next:
- `STAGED_FOR_PROMOTION`
- `REJECTED`
- `ARCHIVED`

Automatic:
- no

Founder-only:
- yes

### `STAGED_FOR_PROMOTION`

Purpose:
- approved promotion payload has been frozen and is ready for execution

Entered by:
- explicit founder-controlled staging action or a controlled staging step that runs only after founder approval

Requires:
- `APPROVED_BY_FOUNDER`
- frozen staging payload
- staged actor
- staged timestamp
- execution status placeholder

Allows next:
- `PROMOTED`
- `ARCHIVED`

Automatic:
- no

Founder-only:
- yes for authorization; staging may be performed by a controlled execution lane only after founder approval

### `PROMOTED`

Purpose:
- canon mutation has executed successfully

Entered by:
- promotion executor only

Requires:
- `STAGED_FOR_PROMOTION`
- successful canon mutation
- explicit promotion result linkage

Allows next:
- none

Automatic:
- no

Founder-only:
- founder approval must already exist

### `REJECTED`

Purpose:
- candidate was denied movement into canon

Entered by:
- human review or founder decision

Requires:
- review actor
- rejection note

Allows next:
- `ARCHIVED`

Automatic:
- no

Founder-only:
- no

### `ARCHIVED`

Purpose:
- candidate is retained historically but removed from active flow

Entered by:
- human review or founder decision

Requires:
- archive reason

Allows next:
- none

Automatic:
- no

Founder-only:
- no

---

## Hard Transition Rules

The following transition rules are mandatory:

1. `REVIEW_READY` is the highest automatic state.
2. `APPROVED_BY_FOUNDER -> PROMOTED` is forbidden.
3. `PROMOTED` requires prior `STAGED_FOR_PROMOTION`.
4. `REVIEW_READY -> PROMOTED` is forbidden.
5. `CLASSIFIED -> PROMOTED` is forbidden.
6. `APPROVED_BY_FOUNDER -> REVIEW_READY` is forbidden without an explicit reopen process defined in a future contract.
7. `STAGED_FOR_PROMOTION -> REVIEW_READY` is forbidden without an explicit stage-cancel process defined in a future contract.

---

## Staging Payload Rule

Staging freezes the promotion payload that will be used for canon execution.

The staging payload must be treated as the authoritative execution package for the future promotion executor.

Once staged, that payload must not drift silently.

If the intended promotion payload changes materially, the candidate must be re-reviewed and re-approved before restaging.

---

## Staging Payload Requirements

The frozen staging payload must contain, at minimum:

- candidate id
- approved proposed action type
- interpreter decision
- interpreter reason code
- referenced evidence ids
- claimed identity or target references if applicable
- founder approval metadata
- staged_at
- staged_by
- execution status placeholder

It may also include:

- resolved finish key
- promotion notes
- target canonical linkage placeholders
- attribution context required for post-promotion credit

---

## Promotion Executor Constraint

The future promotion executor is strictly constrained.

It may:

- consume only `STAGED_FOR_PROMOTION` records
- execute only against the frozen staging payload
- write promotion result linkage only after successful canon mutation

It must not:

- consume `REVIEW_READY`
- consume reviewer-approved but founder-unapproved records
- consume `APPROVED_BY_FOUNDER` records directly
- mutate the staged payload as part of execution

Failed promotion does not erase:

- founder approval history
- staging history
- attribution history
- audit history

Failure must remain auditable as a separate execution outcome.

---

## Hard Invariants

1. Nothing enters canon without explicit founder approval.
2. Reviewer approval is not equivalent to founder approval.
3. `REVIEW_READY` is the highest automatic state.
4. Staging is mandatory before canon mutation.
5. The promotion payload must be frozen at staging.
6. The promotion executor may consume only `STAGED_FOR_PROMOTION`.
7. The warehouse remains non-canonical until successful promotion completes.
8. Approval, staging, and promotion are separate auditable events.
9. No background job or heuristic may promote directly from review or approval state.
10. Failed promotion must not destroy approval or staging history.

---

## Relationship To Existing Contracts

This contract is subordinate to:

- `CANON_WAREHOUSE_CONTRACT_V1.md`

It amends and sharpens:

- `CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1.md`

It works alongside:

- `CANON_WAREHOUSE_INTAKE_CONTRACT_V1.md`
- `VERSION_VS_FINISH_CONTRACT_V1.md`
- `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`
- `PREMIUM_CHILD_AUTHORITY_CONTRACT_V1.md`

This contract does not redefine:

- canonical identity rules
- interpreter logic
- premium authority
- schema implementation details

---

## Result

This contract makes founder-gated approval and mandatory pre-promotion staging binding warehouse invariants.

It ensures that:

- fully processed candidates stop at `REVIEW_READY`
- founder approval is explicit and non-delegable
- staging is mandatory before execution
- promotion consumes only frozen staged payloads
- warehouse evidence never drifts into auto-promotion
