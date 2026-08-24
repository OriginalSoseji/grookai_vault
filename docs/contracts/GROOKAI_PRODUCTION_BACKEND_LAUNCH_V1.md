# Grookai Production Backend Launch V1

**Status: FROZEN**

**Effective date: 2026-08-23**

## 1. Objective

Grookai is production-ready when its collector-critical backend operates
continuously, preserves canonical and user truth, reports failures promptly,
recovers predictably, and sustains expected launch traffic with measured
capacity headroom.

Production readiness is an operational state. Working code, one successful
run, or one healthy endpoint is not sufficient evidence.

## 2. Scope

The launch-critical scope is:

1. authentication, authorization, grants, and RLS;
2. canonical game, set, card, printing, and external-mapping identity;
3. exact-copy Vault ownership and mutations;
4. source warehousing and new-product discovery;
5. MEE mapping, qualification, pricing publication, and read models;
6. signed-in search across supported games;
7. self-hosted authoritative and representative image delivery;
8. shared web, Android, and iOS backend contracts;
9. scheduled workers, supervision, alerting, and reconciliation;
10. Supabase performance, capacity, security, backup, and recovery; and
11. deployment provenance, rollback, and incident response.

Catalog expansion is a parallel background scope. Japanese completion,
additional TCGs, Funko, sealed products, slabs, historical backfill, and image
completion may continue during launch only through resource-isolated workers.

## 3. Immutable Invariants

- Supabase canonical rows remain authoritative for collector-facing identity.
- Raw source evidence is preserved before normalization or reconciliation.
- Source identity never silently becomes canonical identity.
- Ambiguous mappings remain excluded or quarantined with a durable reason.
- Prices are published only through the governing pricing contract and shared
  read interface.
- Every displayed price is traceable to source evidence, mapping,
  qualification, publication generation, API response, and client surface.
- Workers are idempotent, resumable, bounded, and reconcilable.
- A retry cannot create duplicate canonical, publication, or user-owned rows.
- User ownership data is never deleted or rewritten by ingestion repair.
- Candidate, staging, quarantine, and review-only evidence cannot leak into
  collector-facing reads.
- Background expansion yields to collector-critical and launch-data work.
- Authoritative images are self-hosted and carry explicit exact,
  representative, or missing-image truth.
- A displayed card exposes enough printing identity to avoid variant
  confusion.
- Public access, grants, and RLS authority never widen implicitly.
- Production mutations are attributable to a run, version, deployment, and
  auditable result.
- A dated audit artifact cannot be presented as live health without a current
  freshness check.

## 4. Workload Classes

### Class A: Collector Critical

Authentication, Vault, search, pricing reads, images, sharing, and public-safe
profile or memory reads. Class A always has resource priority.

### Class B: Launch Data

Current source ingestion, MEE publication, new-product discovery, canonical
reconciliation, and authoritative image repair. Class B may be throttled but
must satisfy its freshness objective.

### Class C: Catalog Expansion

Japanese completion, MTG and One Piece expansion, additional games, Funko,
sealed, slabs, historical repair, and bulk image acquisition. Class C must
pause or reduce concurrency when Class A or B thresholds are threatened.

## 5. Worker Contract

Every scheduled or long-running production worker must declare and report:

- stable worker name and contract version;
- workload class and owner;
- schedule or queue trigger;
- durable cursor, lease, or checkpoint;
- run ID, idempotency key, and deployed commit SHA;
- start, heartbeat, completion, and next-expected timestamps;
- concurrency, source rate limit, retry limit, and cost limit where applicable;
- input, accepted, quarantined, skipped, failed, and written counts;
- terminal status and durable error code/detail;
- reconciliation result;
- bounded replay instructions; and
- pause, resume, and kill behavior.

A worker that exits without a durable success or failure result is a production
defect. Whole-batch retry is prohibited when bounded item replay is possible.

## 6. Service Objectives

The initial production targets are:

| Measure | Target |
| --- | --- |
| Core API availability | at least 99.9 percent |
| Core API p95 latency | below 400 ms |
| Search p95 latency | below 800 ms |
| User-visible error rate | below 1 percent |
| Critical alert delivery | within 5 minutes |
| Pipeline alert delivery | within 15 minutes |
| New-set discovery | within 24 hours of supported-source evidence |
| Broken authoritative image rate | below 0.1 percent |
| DB connection utilization at expected peak | below 70 percent |
| Database and Storage planned utilization | below 70 percent |
| Capacity headroom | at least 2x projected 90-day growth |
| Launch load proof | stable at 2x expected launch peak |

Pricing freshness remains governed by the frozen MEE Production V1 contract.
The baseline audit may refine measurement methods, but it may not weaken a
target without a versioned contract amendment.

## 7. Monitoring And Alerting

One production control plane must expose:

- current deployment SHA and rollback target;
- API latency, failures, and synthetic collector journeys;
- Supabase CPU, memory, I/O, cache, connections, database size, Storage,
  egress, Edge Function health, and growth forecasts;
- every worker's last success, last failure, heartbeat, next expected run,
  queue depth, retries, dead letters, and reconciliation status;
- source, pricing, publication, search, and image freshness;
- GitHub Actions and external-provider quota health; and
- unresolved incidents and acknowledged maintenance windows.

Alert severity is:

- `SEV-1`: outage, authentication failure, security boundary failure, or data
  corruption risk;
- `SEV-2`: pricing, search, publication, Vault, or image service degradation;
- `SEV-3`: contained background-worker delay or quarantined batch failure; and
- `INFO`: successful completion, coverage movement, or forecast notification.

Alerts must identify the failing stage, affected scope, first observed time,
last successful state, run ID, and the applicable runbook.

## 8. Supabase Launch Gate

The Supabase gate requires current evidence for:

- security advisors, RLS, grants, function security, service-role boundaries,
  and anonymous access;
- database and Storage size plus 30-day and 90-day growth projections;
- CPU, memory, I/O, cache hit rate, connection and pool saturation;
- slow RPCs and queries, missing or redundant indexes, lock contention, and
  table/index bloat;
- Edge Function latency, invocation failures, and resource limits;
- backup retention, point-in-time recovery posture, and a restore exercise;
- capacity thresholds at 70, 80, and 90 percent; and
- stable read behavior at twice expected launch traffic.

Capacity findings must be measured before any paid infrastructure change is
recommended.

## 9. Release Gates

1. **Topology:** one authoritative inventory of services, workers, schedules,
   read models, deployments, dependencies, and owners.
2. **Observability:** live control-plane status, freshness enforcement,
   synthetic journeys, and actionable alert delivery.
3. **Data reliability:** unattended source intake, new-product discovery, MEE,
   publication reconciliation, and self-hosted image truth.
4. **Supabase:** security, performance, capacity, backup, restore, and
   headroom evidence.
5. **Client contracts:** web, Android, and iOS use governed shared read/write
   boundaries and pass collector journey tests.
6. **Failure and load:** stable 2x load plus provider, rate-limit, worker-crash,
   stale-schedule, and rollback exercises.
7. **Canary:** at least 72 hours of stable signed-in operation, including all
   pricing-cycle requirements from the frozen MEE contract.
8. **Launch:** frozen SHA/migration manifest, zero unresolved SEV-1 or SEV-2
   incidents, verified rollback, and reconciled final report.

No gate may pass solely from an old checkpoint. Its evidence must include an
explicit observation time and freshness result.

## 10. Background Expansion Gate

Catalog completion is not a launch prerequisite. Launch requires that the
common supervisor be proven and that each enabled Class C lane has:

- a separate cursor and queue;
- a resource and cost budget;
- staging-first writes;
- canonical promotion separation;
- quarantine and collision handling;
- resumable execution;
- coverage reporting; and
- automatic throttling when Class A or B health degrades.

The initial lanes are Japanese master index, MTG, One Piece, additional TCG
foundations, Funko, sealed products, slabs, and self-hosted image completion.

## 11. Execution Authority

Within this contract, work may proceed without micro-approval for audits,
tests, bug fixes, CI repairs, backward-compatible code changes, additive
migrations, monitoring, worker hardening, staging/warehouse ingestion,
non-destructive performance work, controlled deployment, rollback, and
checkpoint documentation.

The following remain hard stops:

- delete, truncate, or bulk mutation of production user data;
- RLS weakening or new public/private-data exposure;
- irreversible identity rewrite or unsupported canonical promotion;
- pricing-authority or publication-policy change;
- new paid infrastructure or plan upgrade;
- third-party licensing or source-use decision; and
- public rollout before all launch gates pass.

## 12. Definition Of Complete

Production Backend Launch V1 is complete only when:

- every launch-critical service and worker has a live owner and health signal;
- no scheduled job can fail silently;
- MEE and new-set discovery operate and reconcile unattended;
- Supabase security, capacity, performance, backup, and restore are proven;
- Class C workers cannot degrade collector traffic;
- web, Android, and iOS pass shared contract and collector-journey tests;
- the production canary meets its duration and cycle requirements;
- rollback is available and exercised; and
- the final report contains zero unexplained count, freshness, provenance, or
  deployment mismatches.

Any product-scope change creates V1.1 or later. V1 may receive only release
defects, reliability work, security correction, deployment work, and evidence
required to make this contract provably true.
