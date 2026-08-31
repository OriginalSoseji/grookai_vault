# Founder Operations Command Center V1

## Status

`IMPLEMENTED AND LOCALLY VERIFIED / NOT PRODUCTION APPLIED`

- Branch: `feature/founder-operations-command-center-v1`
- Base SHA: `66afd877471518d34af8266762014ca54635d2fe`
- Primary implementation SHA: `212107ece442c8aca2d431063158ca19051b8d82`
- Date: `2026-08-30`

## Context

Grookai has many background discovery, ingestion, pricing, image, capacity, and
release workers. Their notifications were visible to the founder, but the app
did not provide a governed place to inspect a frozen proposal, record a
decision, pause an agent, or follow execution through readback.

## Problem

Treating a push notification as an operational decision would collapse several
different truths: notification delivery, incident status, founder intent,
command execution, and canonical reconciliation. Direct mobile database or
shell access would also create an unacceptable production authority boundary.

## Risk

The primary risks are stale approvals, mutable plans, duplicate taps, leaked
service credentials, unbounded retries, executor lease loss, notification
failure rolling back primary evidence, and an app client gaining direct write
access to canonical or operational tables.

## Decision

V1 uses separate private objects for agents, runs, incidents, evidence, work
items, decisions, commands, attempts, events, and control state. Founder clients
use bounded entitlement-checked RPCs. Domain commands are derived server-side
from an exact version and plan fingerprint, leased to service executors, capped
at a frozen retry count, and cannot succeed without a matching preflight
fingerprint and reconciled readback.

Agent pause and resume are immediate safety controls. They require an explicit
agent policy opt-in, a founder entitlement, an idempotency key, and an
append-only audit row. They do not terminate an already-running external
process.

## Implemented Surfaces

- Flutter Founder Operations queue: Needs action, Running, Failed, Completed,
  and Agent health.
- Work-item detail with frozen scope, exclusions, authority, evidence, timeline,
  plan fingerprint, expiry, and compatibility fallback.
- Bounded founder actions: acknowledge, add note, defer, reject, request repair,
  approve, retry, pause agent, and resume agent.
- Pulse, Account, Founder Notifications, canonical route, and push deep-link
  entry points.
- Read-only founder web fallback at `/founder/operations`.
- Operations incident publication/recovery and correlated stale-agent incidents.
- Service-only maintenance for plan expiry, command deadline expiry, executor
  lease failure, stale detection, and recovery.
- Universal Catalog Discovery adapter and per-set frozen review work items.
- Activation-gated scheduled catalog publication and maintenance workflows.

## Current Truths

1. The production migration has **not** been applied.
2. The modified Edge functions have **not** been deployed by this work.
3. No production operations rows, canonical rows, Storage objects, pricing rows,
   Vault rows, approvals, or writer commands were created.
4. `FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE` is not enabled by this work.
5. Scheduled catalog discovery remains artifact-only while that variable is not
   exactly `true`.
6. Scheduled maintenance is skipped while that variable is not exactly `true`.
7. The catalog set candidate action is review-only:
   `execution_enabled=false`, `database_writes=false`, and
   `writer_dispatches=false` in its frozen proposal.
8. No source-specific hidden-set writer is connected to V1 yet.
9. Universal Catalog Discovery is the only registered adapter implemented in
   this checkpoint. Other production agents remain future integrations.
10. The web surface is intentionally read-only. Governed decisions are mobile
    only in V1.

## Security Invariants

- `anon` and `authenticated` have no table privileges on control-plane tables.
- Founder reads and decisions require the founder entitlement through bounded
  `security definer` RPCs.
- Mobile clients cannot submit SQL, shell arguments, executor keys, environment
  values, or mutable command payloads.
- Frozen work-item and command fields are trigger-protected.
- Decision, evidence, incident-event, work-item-event, command-event, and agent
  control ledgers are append-only.
- Service-role RPCs require a service-role JWT claim.
- Notification enqueue failure is isolated and cannot roll back the underlying
  incident, work item, decision, or command result.
- Approval fails closed on expiry, supersession, version drift, or fingerprint
  drift.
- Successful execution requires matching plan-fingerprint preflight and exact
  reconciliation.

## Verification

- Focused Node contract suite: `52/52` passed.
- Activation-gate regression suite after workflow wiring: `39/39` passed.
- Full repository pre-commit shipcheck: passed.
  - secret packaging: passed;
  - production runtime preflight: `PASS_WITH_DEFERRED_DEBT`, zero critical
    failures;
  - web typecheck, lint, and strict build: passed;
  - Flutter analyze: passed;
  - Flutter tests: `645` passed.
- Focused Flutter analysis: no issues.
- Edge TypeScript `deno check`: passed for notification dispatcher and
  operations webhook.
- Web founder page ESLint and TypeScript checks: passed.
- Android debug APK build: passed.
- Disposable PostgreSQL 16 migration smoke: passed from an empty database with
  a minimal Supabase-compatible harness.
- Disposable runtime smoke proved agent registration, heartbeat, incident open
  and recovery, review-only approval, pause/resume audit, command lease,
  fingerprint-bound preflight, reconciled completion, private table grants, and
  maintenance.
- The first smoke found an ambiguous heartbeat upsert; the migration was
  repaired to use the named unique constraint and then passed from zero.

## Artifact Hashes

- Migration SHA-256:
  `02072d8460785539a6ceed76eef18e39f2fc4eaa99afb5e5064f4b2e24f90fdb`
- Founder Operations contract SHA-256:
  `bcbdbc5957a57ea7b4fbf2f24efda29ce3c3194048d1cc5cec958f66952f0d73`
- Operations control-plane module SHA-256:
  `00598469ae84cc2424652aad6dee539f1ed044c7ce2290072dad2d555118b535`
- Activation-gated catalog workflow SHA-256:
  `2552349f1c385b558dd337836c3e1866d8280c1189df5d6ac16af5d2b0d24a15`
- Activation-gated maintenance workflow SHA-256:
  `a37e21f93d9be9760b521bd97995ddd42068753ee0b9391cdb8b91a4a8baaf55`

## What Must Never Be Broken

- Notification receipt must never count as incident resolution or founder
  approval.
- Approval must never count as command success.
- A client must never gain direct control-plane or canonical table mutation
  authority.
- A changed plan must publish a new version and require a new decision.
- Candidate evidence must never become canonical truth merely because a founder
  reviewed it.
- A command must never succeed without readback reconciliation.
- Enabling the repository activation variable must never enable a catalog or
  canonical writer that is not explicitly frozen in the reviewed work item.

## Explicit Next Gate

1. Merge or deploy the verified feature SHA without enabling the activation
   variable.
2. Create a production migration apply plan locked to migration SHA-256
   `02072d8460785539a6ceed76eef18e39f2fc4eaa99afb5e5064f4b2e24f90fdb`.
3. Apply the migration and independently read back every table, trigger, RLS
   policy, grant, and RPC signature.
4. Deploy the notification dispatcher and operations webhook changes.
5. Deploy the web and mobile clients; verify founder-only access and fallback
   behavior with the queue still empty.
6. Run one manual Universal Catalog Discovery artifact build and publish exactly
   one review-only set candidate through the service RPC.
7. Open that item from the phone, verify evidence and fingerprint, and record a
   review-only approval. Confirm no command and no canonical writer were created.
8. Run maintenance once manually and verify its receipt plus agent health.
9. Only after those proofs, set `FOUNDER_OPERATIONS_CONTROL_PLANE_ACTIVE=true`
   to enable scheduled review-item publication and maintenance.
10. Build and separately approve a source-specific hidden-set executor package
    before attempting the Definition-of-Done hidden-set write/readback proof.
