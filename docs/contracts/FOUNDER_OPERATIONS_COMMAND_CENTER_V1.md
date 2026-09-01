# Founder Operations Command Center V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Purpose

Founder Operations Command Center V1 gives a founder a private mobile and web
surface for observing production agents, reviewing frozen work items, recording
decisions, and following bounded commands through reconciliation.

It is not a database administration surface. An authenticated application
client cannot write canonical data, construct arbitrary commands, change frozen
payloads, or invoke a production writer directly.

## Existing Foundations

V1 extends rather than replaces:

- the append-only `operations_notification_events` ledger;
- Founder Notifications in Pulse;
- production push notifications and deep links;
- source-specific catalog discovery and preflight workers;
- immutable promotion plans and payload fingerprints;
- service-only, idempotent canonical executors;
- the protected web Founder staging console.

## Operational Objects

The following concepts remain separate:

- **Notification**: delivery of an event to a founder. Reading it changes only a
  private viewer cursor.
- **Incident**: an operational problem with an open and recovered lifecycle.
- **Work item**: a frozen proposal that requires a founder disposition.
- **Decision**: an append-only founder action against one version of a work item,
  or an audited pause/resume action against an explicitly controllable agent.
- **Command**: an allowlisted asynchronous request created from an accepted
  decision.
- **Attempt**: one leased executor attempt for a command.
- **Result**: immutable execution and readback evidence.

Seeing or acknowledging a notification does not resolve an incident. Approving
a work item does not imply that its command succeeded. A command is complete
only after the executor reconciles its promised effects.

## Founder Experience

Pulse exposes a compact Founder Operations summary. The full private screen has
these queues:

- Needs action
- Running
- Failed
- Completed
- Agent health

Each actionable item presents:

- a concise problem or proposal summary;
- source authority and owning agent;
- exact proposed scope and explicit exclusions;
- affected game, set, rows, services, and publication boundaries;
- commit SHA, schema version, executor version, plan fingerprint, and expiry;
- preflight findings, evidence quality, and expected cost when relevant;
- durable evidence references and sanitized logs;
- current state and complete decision/execution history.

V1 actions are:

- acknowledge;
- add note;
- defer or snooze;
- reject;
- request repair;
- approve an exact frozen plan;
- retry an allowlisted bounded command;
- pause or resume a registered agent when its policy allows it.

Arbitrary SQL, shell commands, payload edits, bulk cleanup, secrets, and direct
canonical writes are prohibited.

## New Set Vertical Slice

The first production use case is a released set candidate:

1. Official-source discovery records the candidate.
2. The required game/language Master Index or canonical authority is reconciled.
3. The source-specific worker freezes evidence, payload, tests, exclusions,
   rollback information, and fingerprints.
4. A founder work item is published and a push notification deep-links to it.
5. The founder reviews and decides against the exact current version.
6. Approval creates one allowlisted asynchronous command.
7. The service executor re-runs preflight against current production state.
8. Any drift, collision, expired plan, or changed fingerprint fails closed.
9. A successful command applies only its frozen envelope and performs exact
   readback reconciliation.
10. The work item records the result and emits a completion notification.

No set becomes publicly visible unless publication is an independently
allowlisted and explicitly displayed part of the approved plan.

### Source-Specific Execution

An executor that can mutate canonical data must lease by both allowlisted
`action_type` and exact `executor_version`. It must not use the generic command
lease to claim whichever queued command happens to be oldest.

Before mutation, the executor must match the command fingerprint, execution
manifest hash, source commit, authority fingerprints, expected row identities,
counts, and exclusions. A partial or conflicting production state fails closed.
An empty exact scope may be applied once. An already-present exact scope is
treated as idempotent completion evidence, which allows safe reconciliation if
the database commit succeeded but the prior command-completion signal was lost.
The latter path never repeats the canonical writer.

## Security Invariants

1. All operations tables use RLS and are denied to `anon` and `authenticated`.
2. Founder clients use bounded `security definer` RPCs only.
3. Founder entitlement is checked by every read and decision RPC.
4. Application clients cannot insert into the command queue.
5. Decision RPCs accept no command payload and no executor arguments.
6. Approval requires the current work-item version and plan fingerprint.
7. Expired, superseded, terminal, or already-decided versions fail closed.
8. Decisions and execution events are append-only.
9. Commands are idempotent and leased for exactly one active attempt.
10. Canonical executors lease only their allowlisted action and exact executor version.
11. Executors revalidate scope and fingerprint before mutation.
12. Exact durable readback may reconcile a lost completion signal but may not repeat a writer.
13. Logs and evidence exposed to clients contain no credentials or private data.
14. A global kill switch and per-agent pause can prevent new execution.

## Notification Policy

- `critical`: immediate push and persistent action queue.
- `high`: immediate actionable notification.
- `warning`: inbox notification and digest unless escalation policy says otherwise.
- `info`: retained history; push is optional.

Repeated failures correlate to one incident. Recovery closes the operational
incident and emits a recovery event. Founder acknowledgment remains preserved.
Notification delivery is best-effort and independently auditable; enqueue
failure never rolls back the incident, work item, decision, or command result.

## Compatibility And Fallback

The existing notification read model remains available. Unsupported app clients
may read alerts but cannot submit V1 decisions. The protected web Founder
console remains the operational fallback when mobile or push delivery is
unavailable.

## Definition Of Done

V1 is complete when every in-scope production agent is registered and reports
health, every actionable write is represented by a frozen work item, all mobile
decisions preserve the service-only execution boundary, duplicate submissions
are idempotent, stale approvals fail closed, execution reconciles exactly, and
one real hidden set can be reviewed and safely approved from the phone.
