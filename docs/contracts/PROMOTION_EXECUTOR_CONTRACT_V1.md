# PROMOTION_EXECUTOR_CONTRACT_V1

## Status

ACTIVE

## Type

Execution Contract

## Scope

This contract governs the promotion executor that mutates canon from founder-approved warehouse staging records.

It defines:

- lawful executor inputs
- execution status transitions
- preflight validation
- canon mutation boundaries
- result linkage
- failure handling
- retry semantics
- security and observability requirements

It does not define:

- warehouse interpretation
- normalization
- classification
- founder approval
- staging creation
- canon schema design outside executor-owned mutation

## Purpose

Define the ONLY lawful path from staged warehouse intent to canon mutation.

## Core Principle

The executor is deterministic and idempotent.

It does not interpret.
It does not decide.
It does not approve.

It executes only frozen intent that has already been authorized by the founder.

## System Position

The authoritative promotion path is:

`REVIEW_READY -> APPROVED_BY_FOUNDER -> STAGED_FOR_PROMOTION -> EXECUTOR -> PROMOTED`

Everything before `STAGED_FOR_PROMOTION` prepares intent.

The executor begins only after staging exists.

## Hard Boundary

The executor's only lawful source of execution intent is `public.canon_warehouse_promotion_staging`.

It must never:

- read raw evidence
- read normalization logic directly
- read classification logic directly
- infer intent from candidate state alone

Linked candidate or canon records may be consulted only for preflight validation, duplicate prevention, and result linkage.

They must never become alternate sources of intent.

## Allowed Inputs

The executor may act only when all of the following are true:

- `execution_status = 'PENDING'`
- the staging row is valid and present
- the linked candidate exists
- `candidate.state = 'STAGED_FOR_PROMOTION'`
- `candidate.current_staging_id = staging.id`
- a frozen payload exists
- founder approval is present
- `approved_action_type` is valid
- all required payload fields for the chosen action are present

If any required condition is missing or contradictory, execution is invalid.

## Allowed Action Types

The executor may execute only these action types:

- `CREATE_CARD_PRINT`
- `CREATE_CARD_PRINTING`
- `ENRICH_CANON_IMAGE`

No other action type is lawful in V1.

## Forbidden Behaviors

The executor must not:

- interpret evidence
- guess missing data
- call external APIs for truth
- modify the frozen staging payload
- bypass founder approval
- mutate canon outside staged intent
- derive new mutation targets from raw evidence
- repair ambiguous data heuristically during execution

## Frozen Payload Rule

The frozen payload is immutable execution truth.

It is the authoritative package for canon mutation.

If intent changes, the existing staging row is no longer valid for execution.

A new founder-approved staging record is required.

## Execution Model

Within a single execution attempt, only these status transitions are lawful:

- `PENDING -> RUNNING`
- `RUNNING -> SUCCEEDED`
- `RUNNING -> FAILED`
- `PENDING -> FAILED`

No other executor-owned transition is allowed in V1.

## Idempotency Rule

`staging.id` is the execution key.

Re-running the executor for the same staging record must converge on the same final result.

If a staging row has already succeeded, re-running must return the stored result and perform no new canon mutation.

If a failed staging row is retried with the same payload, the executor must preserve duplicate prevention and converge on the same lawful result.

This follows idempotent pipeline practice: repeated execution with identical inputs must preserve the same final state.[1]

## Canon Mutation Rule

The executor may mutate only what the staged `approved_action_type` allows.

`CREATE_CARD_PRINT` may create only the approved parent canon record defined by the frozen payload.

`CREATE_CARD_PRINTING` may create only the approved child or printing record under the validated parent defined by the frozen payload.

`ENRICH_CANON_IMAGE` may modify only the approved canon image target defined by the frozen payload.

No extra side effects are allowed.

## Preflight Requirements

Before any canon mutation, the executor must validate:

- candidate linkage
- action validity
- required fields
- duplicate prevention
- parent existence for child creation
- target existence for image enrichment
- result linkage absence or consistency

Preflight must fail closed.

If validation fails, execution must not mutate canon.

## Result Linkage Rule

On successful execution, the executor must write result linkage back into warehouse records.

At minimum it must write:

- promoted ids produced by execution
- `promotion_result_type`
- promotion timestamps
- `candidate.state = 'PROMOTED'`

Result linkage must reflect the actual canon mutation that occurred.

## Event Requirements

The executor must append warehouse events for:

- `PROMOTION_EXECUTION_STARTED`
- `PROMOTION_EXECUTION_SUCCEEDED`
- `PROMOTION_EXECUTION_FAILED`

Each event must identify the staging row, candidate, action type, actor type, timestamp, and structured execution metadata.

## Failure Model

Failure is durable and explicit.

No failure may disappear behind silent rollback behavior.

If execution fails, the system must preserve a durable failed outcome through staging status, timestamps, error detail, and failure event history.

The candidate must not be marked `PROMOTED` on failure.

## Retry Rule

Retry is allowed only on staging rows currently in `FAILED`.

The frozen payload must not change between attempts.

Retry must reuse the same staging id and remain idempotent.

V1 does not define automatic retry scheduling.

## Candidate State Rule

The executor may move a candidate only through this promotion transition:

`STAGED_FOR_PROMOTION -> PROMOTED`

The executor must not invent any alternate candidate state path.

Failed execution leaves the candidate staged, not promoted.

## Security Rule

The executor is service-only.

It must run under controlled service credentials.

It must not be callable by anonymous users, authenticated collectors, or founder UI clients directly.

## Observability Rule

Execution must be visible in the staging dashboard.

At minimum, the system must expose:

- staging id
- candidate id
- approved action type
- execution status
- execution attempts
- last error
- last attempted timestamp
- executed timestamp
- linked promotion result ids when present

Every execution attempt must be auditable by staging id.

## V1 Non-Goals

V1 explicitly excludes:

- bulk execution
- async orchestration
- rollback system
- fuzzy repair
- external validation
- auto-retry scheduling

## Success Criteria

The promotion executor is correct only if it is:

- deterministic
- idempotent
- fail-closed
- auditable
- non-interpretive
- unable to corrupt canon through unstaged or invented mutation

## Result

This contract defines the only lawful executor path from founder-approved staged intent to canon mutation.

It keeps execution deterministic, idempotent, fail-closed, and auditable.

It ensures that the executor does not invent truth, does not bypass approval, and does not mutate canon outside the frozen staging payload.

[1]: https://beefed.ai/en/idempotent-ml-pipelines-best-practices?utm_source=chatgpt.com
