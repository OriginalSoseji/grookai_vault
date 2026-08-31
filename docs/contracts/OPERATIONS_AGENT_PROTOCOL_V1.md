# Operations Agent Protocol V1

## Status

`FROZEN FOR IMPLEMENTATION`

## Purpose

This protocol gives GitHub Actions, systemd services, droplet workers, and
Supabase jobs one observable lifecycle without changing their domain-specific
business logic.

## Registered Agent

Every production agent has:

- a stable `agent_key`;
- display name, domain, owner, and description;
- execution platform and source workflow or unit;
- schedule or trigger type;
- heartbeat interval and stale threshold;
- allowed work-item and command types;
- current contract and executor versions;
- enabled and paused state;
- escalation policy.

Unregistered free-form agent identities cannot publish executable work items.

## Run Lifecycle

An agent adapter supports these operations:

- `register`
- `heartbeat`
- `start_run`
- `report_progress`
- `publish_event`
- `publish_incident`
- `publish_work_item`
- `complete_run`
- `fail_run`
- `report_recovery`
- `run_maintenance`

Each operation carries an idempotency key, agent key, run key, commit SHA,
schema version, and timestamp. GitHub adapters also carry repository, workflow,
run, attempt, and artifact identities. Host adapters carry sanitized host and
unit identities.

## Health

Health is derived from expected schedule, latest heartbeat, latest run, latest
success, active incidents, and paused state. Valid health states are:

- `healthy`
- `running`
- `degraded`
- `failed`
- `stale`
- `paused`
- `unknown`

A stale monitor creates one correlated incident per outage. New heartbeats or a
successful run report recovery and close that incident. It does not erase the
incident history.

The service-only maintenance pass also expires stale review plans, closes
queued commands whose execution deadlines elapsed, and fails expired executor
leases so that a founder must make an explicit retry decision.

## Evidence

Agents publish structured summaries and references, not unrestricted logs.
Evidence is sanitized before persistence and may contain:

- source URLs and response hashes;
- commit and workflow run URLs;
- frozen plans and payload fingerprints;
- test and reconciliation summaries;
- bounded journal excerpts;
- durable object hashes and URIs.

Secrets, authorization headers, environment dumps, and personal collector data
are prohibited.

## Work Item Publication

Only an agent registered for a work-item type may publish that type. The
publisher validates the plan schema, fingerprint, expiry, scope, exclusions,
and executor policy before creating or superseding a work item.

Publishing a work item does not dispatch a writer.

## Reliability

- Adapters are safe to retry.
- Delivery failures preserve a local or workflow artifact for later replay.
- The protocol uses deterministic idempotency keys.
- Notification delivery failure does not discard the underlying event or work
  item.
- A dead-man monitor verifies that agent heartbeat and notification delivery
  are functioning.

## Initial Integration Order

1. Universal catalog discovery and shadow reconciliation.
2. Pokemon language Master Index refresh.
3. MTG, One Piece, and Pokemon incremental promotion supervisors.
4. Pricing and market evidence workers.
5. Image and Storage workers.
6. Production capacity, security, release, and client probes.
7. Remaining collectible shadow adapters.
