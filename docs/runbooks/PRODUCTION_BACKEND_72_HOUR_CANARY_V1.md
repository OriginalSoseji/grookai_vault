# Production Backend 72-Hour Canary V1

## Start Authority

The canary may start only when the frozen final candidate manifest evaluates to
`ready_for_canary`. The start timestamp is written at execution time and is
never backdated.

## Observation Window

Observe at least 72 continuous hours. The source commit, migrations, web
deployment, mobile builds, worker definitions, schedules, pricing policy, RLS,
and grants remain frozen for the window. A source repair creates a new
candidate and resets the clock.

## Required Evidence

At every governed observation, record:

- deployed source and workload commit identity;
- core API availability and p95 latency;
- search p95 latency;
- user-visible error rate;
- self-hosted image failure rate;
- database CPU, memory, I/O, cache, locks, disk, and connections;
- Storage and cached/uncached egress utilization;
- control-plane freshness and alert delivery;
- unresolved incident counts; and
- Class C disabled/throttled state.

Across the window, require reconciled unattended cycles for:

- TCGPlayer source intake;
- MEE acquisition;
- exact pricing qualification/publication;
- new-set discovery; and
- control-plane monitoring and alerts.

Every cycle records run ID, source and worker commit, start/end, counts,
retries, terminal status, reconciliation, and next expected execution.

## Frozen Thresholds

- Core API availability at least 99.9 percent.
- Core API p95 below 400 ms.
- Search p95 below 800 ms.
- User-visible errors below 1 percent.
- Broken authoritative images below 0.1 percent.
- Database connections below 70 percent.
- Database and Storage planned utilization below 70 percent with 2x projected
  90-day growth headroom.
- Critical alerts delivered within five minutes and pipeline alerts within
  fifteen minutes.
- Zero unresolved SEV-1 or SEV-2 incidents.

## Failure Handling

Preserve the failure and stop the canary for a boundary breach, data mismatch,
commit drift, silent worker failure, or unresolved SEV-1/SEV-2. Do not patch in
place and continue the old clock. Apply the rollback runbook when its trigger
criteria are met.

For an isolated provider incident that does not breach data or authorization,
classify it, preserve provider evidence, and make an explicit restart decision.
The failed interval cannot be omitted from the final report.

## Completion

After 72 hours, reconcile candidate identity, observations, worker cycles,
tokens/costs where applicable, provider requests, database/Storage writes,
alerts, incidents, and all client journeys. The final report must contain zero
unexplained count, freshness, provenance, or deployment mismatch.

A passing canary permits a separate signed-in launch decision. Anonymous or
public rollout remains separately governed.
