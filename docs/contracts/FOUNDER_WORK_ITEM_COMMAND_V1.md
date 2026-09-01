# Founder Work Item And Command Contract V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Work Item Identity

A work item has a stable `work_item_key`, an integer `version`, and an immutable
`plan_fingerprint`. A newer proposal supersedes the prior version instead of
editing it in place.

The frozen proposal records:

- `work_item_type` and `action_type`;
- owning agent and source run;
- title, summary, risk level, and affected domain;
- normalized scope and explicit exclusions;
- plan fingerprint, source commit, contract version, and executor version;
- expiration time;
- durable evidence references;
- exact command policy and whether recent reauthentication is required.

## Work Item States

Allowed states are:

- `ready_for_review`
- `deferred`
- `approved`
- `rejected`
- `repair_requested`
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `superseded`
- `expired`

State transitions are deterministic and append an event. Terminal states are
immutable except that a failed item may produce a new work-item version.

## Decisions

Founder decisions are append-only. A decision contains the actor, work-item
version, expected fingerprint, action, optional note, client schema version,
idempotency key, and timestamp.

Supported decisions are:

- `acknowledge`
- `add_note`
- `defer`
- `approve`
- `reject`
- `request_repair`
- `retry`
- `pause_agent`
- `resume_agent`

Only `approve` and `retry` may create a domain command. The server derives the
command from the frozen policy; it never accepts a client-supplied command
body. Agent pause and resume are immediate control-plane safety operations,
recorded in a separate append-only founder control ledger, and are allowed only
when the registered agent policy explicitly opts in.

Multi-stage work follows `FOUNDER_OUTCOME_WORKFLOW_V1`: one approval freezes the
terminal outcome and every registered stage. Normal stage continuation never
requires another founder decision.

## Command Boundary

Commands contain an allowlisted `action_type`, frozen scope, executor version,
source work item, expected fingerprint, idempotency key, cost ceiling, and
execution deadline.

The command queue is writable only by service-role code and the founder decision
function that derives a command from a validated work item. No client role has
table access.

An executor must:

1. acquire an expiring lease atomically;
2. verify the global and agent kill switches;
3. reload the current work item and fingerprint;
4. re-run the source-specific preflight;
5. fail closed on drift or policy mismatch;
6. execute only the frozen scope;
7. perform readback reconciliation;
8. append attempt and result evidence;
9. release or terminally close the lease;
10. emit a result notification.

## Idempotency And Concurrency

- A founder idempotency key may record only one decision.
- A work-item version may have only one accepted terminal disposition.
- One work item may create at most one command for a given action and version.
- One command may have only one active lease.
- Repeated delivery, double taps, retries, and process restarts must not create
  duplicate canonical effects.

## Staleness

Approval is rejected when the work item is expired, superseded, not actionable,
has a different version, or has a different fingerprint. A changed source plan
must publish a new version and require a new decision.

## Evidence Retention

Evidence required to defend a production mutation must not depend only on an
expiring GitHub artifact. The durable record stores a content hash, media type,
byte size, retention class, source URI, and durable object URI when required.

## Reauthentication

High-risk command policies require a recent server-verifiable authentication
event. A local biometric prompt alone is not sufficient authority.

## Prohibited Behavior

- accepting arbitrary SQL, shell, URL, or environment data from a client;
- marking a command successful without readback;
- mutating frozen work-item scope;
- treating a notification cursor as an operational decision;
- retrying destructive or non-idempotent work without a dedicated policy;
- exposing service-role credentials or raw unredacted journals.
