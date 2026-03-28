# CANON_WAREHOUSE_APPROVAL_PIPELINE_CONTRACT_V1

## Status
ACTIVE

## Purpose

This contract defines the approval-gated pipeline for the Canon Warehouse.

It governs how warehouse submissions are:

- ingested
- auto-processed
- staged for review
- manually approved or rejected
- promoted into canon only after explicit approval

This contract exists to ensure that Grookai can process warehouse evidence automatically without ever allowing automatic canon mutation.

---

## Core Principle

The Canon Warehouse may auto-process evidence.

It must NEVER auto-promote evidence into canon.

Promotion into canon requires explicit human approval.

---

## System Boundary

This contract governs the workflow between:

- warehouse evidence intake
- warehouse processing
- review-ready staging
- manual approval
- promotion execution

It does NOT define canonical identity itself.
It does NOT replace interpreter or promotion contracts.
It defines the review and approval boundary before promotion.

---

## Auto-Processing Rule

The system may automatically perform:

- upload intake
- storage
- normalization
- metadata extraction
- interpreter classification
- proposed action generation
- review queue placement
- notification creation

The system must stop at `REVIEW_READY`.

No automatic process may move a warehouse candidate into canon.

---

## Manual Promotion Rule

Canonical promotion must require explicit approval.

No warehouse item may create or modify canonical truth unless an authorized reviewer explicitly approves promotion.

For this phase, approval authority is founder-gated.

That means:

- only founder-approved actions may move a candidate past review
- no background job
- no worker
- no heuristic
- no confidence threshold

may promote a warehouse record automatically

---

## State Model

A warehouse candidate must move through the following states:

- `RAW`
- `NORMALIZED`
- `CLASSIFIED`
- `REVIEW_READY`
- `APPROVED_FOR_PROMOTION`
- `PROMOTED`
- `REJECTED`
- `ARCHIVED`

### State meanings

- `RAW`  
  Evidence captured, not yet processed

- `NORMALIZED`  
  Inputs cleaned and prepared for interpretation

- `CLASSIFIED`  
  Interpreter result exists

- `REVIEW_READY`  
  Candidate is ready for human review; this is the highest automatic state

- `APPROVED_FOR_PROMOTION`  
  Human has explicitly approved promotion

- `PROMOTED`  
  Promotion has executed successfully and canon was updated

- `REJECTED`  
  Candidate was reviewed and denied promotion

- `ARCHIVED`  
  Candidate is retained historically but removed from active review flow

---

## Automatic State Ceiling

`REVIEW_READY` is the highest state any automated process may assign.

No automated system may assign:

- `APPROVED_FOR_PROMOTION`
- `PROMOTED`

These states are strictly human-gated.

---

## Review Surface Rule

A review-ready candidate must present enough information for deterministic approval.

The review surface must show, at minimum:

- uploader identity
- uploaded evidence
- extracted metadata
- interpreter result
- proposed promotion target
- proposed action type
- confidence / explanation
- attribution impact

The reviewer must be able to decide:

- approve
- reject
- archive
- defer / hold for follow-up

---

## Notification Rule

The system may notify the reviewer when a candidate reaches `REVIEW_READY`.

Notifications may include:

- email
- in-app admin queue
- dashboard badge
- other review alerts

Notifications are advisory only.

Notifications must never be the approval boundary.

Approval must occur only inside an authenticated review surface or equivalent controlled admin action.

---

## Proposed Action Types

A review-ready candidate may propose one of the following actions:

- create new canonical `card_prints` row
- create new canonical `card_printings` row
- enrich an existing canonical image/evidence lane
- remain blocked / unpromotable

The proposed action is not canonical truth.
It is a recommendation generated from evidence + interpreter output.

---

## Interpreter Requirement

Every promotable warehouse candidate must have an interpreter result before review.

Interpreter outcomes may include:

- `ROW`
- `CHILD`
- `BLOCKED`

### Interpreter consequences

- `ROW` -> may be reviewed for canonical row creation
- `CHILD` -> may be reviewed for child printing creation
- `BLOCKED` -> must not be auto-promoted and must remain review-gated

A `BLOCKED` result may still be reviewed, but cannot be silently forced into canon.

---

## Promotion Boundary Rule

Approval and promotion are separate events.

Approval means:
- the reviewer has authorized the proposed promotion path

Promotion means:
- the system has executed the canonical mutation

This separation is required for auditability and operational safety.

---

## Attribution Rule

Every warehouse candidate must preserve contributor attribution.

At minimum, the system must retain:

- who uploaded the evidence
- who reviewed it
- who approved it
- what canonical object it affected
- what credit type applies

Possible credit types may include:

- discovery
- image contribution
- finish confirmation
- variant confirmation

Attribution must survive archive and promotion.

---

## Audit Logging Rule

Every state transition must be auditable.

At minimum, the system must preserve:

- candidate id
- previous state
- new state
- actor
- timestamp
- reason / note if supplied

This is required for:
- trust
- contributor credit
- rollback analysis
- future moderation

---

## Canon Safety Rule

The warehouse must remain non-canonical even when fully auto-processed.

Nothing in the warehouse becomes truth because it was:
- uploaded
- normalized
- classified
- given high confidence
- notified to reviewer

Truth is established only when:
- approval is given
- promotion executes
- provenance is recorded

---

## Rejection and Archive Rule

Rejected candidates and archived candidates remain historical evidence.

They must not be deleted merely because they were not promoted.

This preserves:
- contributor history
- future re-evaluation
- warehouse audit integrity

---

## Relationship To Existing Contracts

This contract is subordinate to:

- `CANON_WAREHOUSE_CONTRACT_V1.md`

And works alongside:

- `VERSION_VS_FINISH_CONTRACT_V1.md`
- `REFERENCE_BACKED_IDENTITY_CONTRACT_V1.md`
- `PREMIUM_CHILD_AUTHORITY_CONTRACT_V1.md`

This contract does not replace interpretation or promotion authority.
It governs the approval-gated workflow before canonical mutation occurs.

---

## Invariants

1. Warehouse evidence may be auto-processed.
2. Warehouse evidence may never be auto-promoted.
3. `REVIEW_READY` is the highest automatic state.
4. Promotion requires explicit human approval.
5. Notifications are advisory only, not approval.
6. Interpreter output is mandatory before promotion review.
7. Reviewer action and promotion execution must remain auditable.
8. Contributor attribution must persist across the full lifecycle.
9. Rejected or archived records remain evidence, not deleted truth.
10. Canon may only change after explicit approval and promotion.

---

## Result

This contract defines the approval-gated workflow that allows Grookai to scale warehouse intake safely while preserving founder control over canon.

It ensures that:
- processing can be automated
- review can be remote
- approval can be efficient
- canon remains human-gated and trustworthy
