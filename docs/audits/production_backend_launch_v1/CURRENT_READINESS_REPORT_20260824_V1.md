# Production Backend Launch V1 Current Readiness

**Observed:** `2026-08-24T17:49:06.879Z`

**Branch:** `release/production-backend-launch-v1`

**Deployed control-plane SHA:** `e56f33fc462190e39bfe4f4717d6c1ce9a6c15a0`

**Deployed pricing/MEE SHA:** `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f`

**Deployed web SHA:** `e136393c47a9941a5e2b4a846566f697f9a0f9d9`

**Read-load candidate SHA:** `646f8dac17e4c8dcc340045a1d7dda536b598556`

**Launch verdict:** **NOT READY**

## Completed In This Gate

- The live control plane is deployed from immutable release `e56f33fc46` and runs every 15 minutes.
- Current topology status is 14 healthy, zero failed, zero degraded, zero stale, and four unmeasured Class C lanes.
- The unattended `2026-08-24T15:15:14.456Z` timer run reported the exact deployed SHA and the same healthy status.
- Launch-critical control-plane findings produce governed operations notifications with stable transition-based deduplication and a six-hour cooldown.
- Scanner V3 and V5 are active and pass direct HTTP health checks.
- New-set discovery is active, fresh, and contains seven review-required candidates without promoting them.
- The production pricing recovery run is terminal and reconciled. Its daily timer is active for `08:15 UTC`.
- The completed pricing cycle selected `206,227` rows, published `164,133` exact current snapshots, and reconciled `164,133 / 164,133 / 164,133` eligible, snapshot, and traced rows with zero broken traces.
- A fresh MEE cycle completed under systemd supervision with no retry or provider refetch after its initial acquisition.
- The fresh read-only Supabase audit found no critical or high security or database-health finding.
- The managed-control audit confirms a fresh seven-point physical backup chain and WAL-G support.
- Supabase managed disk capacity is now measured and fails the launch target. No data was deleted and no paid capacity change was made.
- The internal-only MEE acquisition lane was reversibly throttled from `4,000` to `1` provider call per nightly cycle. Its provider-free, write-free dry run completed with zero findings.
- The production web image route now accepts valid underscore-bearing canonical GV-IDs. Deployment `dpl_6xj6Wi6iAzuJHEj1AFSRc5r1ifsH` is Ready, with rollback target `dpl_9exhfBoYgtUk8VWkmLbRqAB2G85z` preserved.
- The launch-wide image audit passed `3,000 / 3,000` direct object reads, `100 / 100` full-body image-signature checks, and `100 / 100` anonymous-public production proxy checks.
- Production identity search now uses bounded candidate-first reads. Exact ordered output remained unchanged across common-name, identity, filter, finish, cameo, object-type, and pagination comparisons.
- The five-minute `33 RPS` launch gate passed `9,900 / 9,900` read requests at `2.056x` measured peak with zero failures, retries, rate limits, waiting locks, or reconciliation mismatches.

## Fresh MEE Proof

Run identity:

- Worker run: `MEE-DROPLET-2026-08-24`
- Acquisition run: `MEE-11L-DAILY-BATCH-b22ca6fb8efe`
- Acquisition ID: `0e3b4427-c164-f14a-da69-a31254e71d92`
- Started: `2026-08-24T05:52:24Z`
- Finished: `2026-08-24T07:46:55Z`
- Outcome: `completed`
- Systemd result: `success`, exit code `0`
- Next timer: `2026-08-25T03:27:38Z`

Reconciled counts:

| Measure | Count |
| --- | ---: |
| Provider calls | 4,000 |
| Provider errors | 0 |
| Observed listings | 263,762 |
| Warehouse observations | 222,947 |
| Price events | 222,947 |
| Raw-single events | 184,885 |
| Slab events | 25,110 |
| Excluded or ambiguous events | 12,952 |
| Candidate rows | 181,745 |
| Strict filtered rollups | 5,892 |
| Review ready | 4,492 |
| Needs more evidence | 1,400 |

The run-scoped readback has zero findings. All candidate and strict rollup rows remain internal review evidence: `publishable=false`, `app_visible=false`, and `market_truth=false`. The run wrote no canonical identity, Vault, image, public pricing, or app-facing pricing data.

## Supabase Proof

SQL audit observed at `2026-08-24T07:50:45.257Z`:

| Measure | Current value |
| --- | ---: |
| Database size | 228,119,088,275 bytes |
| Storage size | 31,838,610,700 bytes |
| Storage objects | 167,734 |
| Connections | 21 / 90 (23.33%) |
| Cumulative cache hit | 92.4253% |
| Waiting locks | 0 |
| Queries over five minutes | 0 |
| Invalid indexes | 0 |
| Exposed tables without RLS | 0 |
| Unsafe definer functions | 0 |
| Deadlocks | 0 |

Managed-control audit:

- Project state: `ACTIVE_HEALTHY`
- Completed physical backup points: `7`
- Latest backup age: `19.25 hours`
- Maximum observed backup gap: `25.66 hours`
- WAL-G: enabled
- PITR: disabled
- Reconciled nonproduction restore exercise: not measured

Host evidence after MEE:

- Root filesystem: 116 GB total, 83 GB used, 33 GB available, 72% used.
- Retention planner free bytes: `35,060,678,656`.
- Retention free-space floor: `21,474,836,480`.
- Retention action: none; capacity already satisfied.
- Failed systemd units: zero.

## Capacity Forecast

Supabase Management API and read-only database statistics observed at `2026-08-24T15:05:33Z`:

| Measure | Current value |
| --- | ---: |
| Managed disk configured size | 303 GB |
| Managed filesystem size | 320,101,937,152 bytes |
| Managed filesystem used | 231,542,988,800 bytes |
| Managed filesystem available | 88,558,948,352 bytes |
| Managed disk utilization | 72.33% |
| Lower-bound measured database growth | 3,187,447,225 bytes/day |
| Days to 80% at measured rate | 7.70 |
| Days to 90% at measured rate | 17.74 |
| Days to full at measured rate | 27.78 |
| Lower-bound 30-day utilization | 102.21% |
| Required 2x 90-day headroom | 573,740,500,424 bytes |
| 2x 90-day headroom deficit | 485,181,552,072 bytes |

The database-growth estimate uses current relation bytes per live row multiplied by rows written in the reconciled TCGPlayer, MEE, and publication cycles. It is a lower bound because it excludes WAL, system overhead, bloat changes, and unlisted relations. Storage added `19,310,094,155` bytes in the last 30 days, but that period includes a one-time bulk image event.

This gate is **BLOCKED**. Current utilization already exceeds the frozen `<70%` target and cannot provide the required 2x projected 90-day headroom. Resolving it requires a separately governed capacity and/or hash-verified archival-retention decision.

Provider-plan evidence observed at `2026-08-24T17:56:21Z` establishes one
organization project and a Pro entitlement profile: seven-day backups, Small
compute, IPv4, restore-to-new-project access, and no Team project-scoped roles.
The 100 GB Pro Storage allowance is therefore reconciled against the only
project:

- current Storage: `31.84 GB` (`31.84%`), below the frozen threshold;
- recent-rate 30-day projection: `51.15 GB` (`51.15%`);
- burst-sensitive 90-day projection: `89.77 GB` (`89.77%`); and
- 2x projected 90-day growth headroom deficit: `47.70 GB`.

Current object Storage passes, but its conservative 90-day and 2x-headroom
tests do not. Actual billing-cycle cached and uncached egress remain unmeasured:
Supabase exposes those byte totals in the organization Usage page, not through
the public Management API. The plan quotas are `250 GB` uncached and `250 GB`
cached.

Backup retention is now provider-proven at seven days, and
restore-to-new-project is available. PITR remains disabled and no reconciled
restore has been executed. The prepared, non-executing recovery runbook is
`docs/runbooks/PRODUCTION_SUPABASE_NONPRODUCTION_RESTORE_EXERCISE_V1.md`.

Temporary risk containment:

- MEE nightly acquisition ceiling: `1` call.
- MEE timer: still active; next scheduled cycle remains supervised.
- TCGPlayer source and exact pricing publication: unchanged.
- Provider calls during throttle verification: `0`.
- Database, Storage, canonical, pricing, and Vault writes during throttle verification: `0`.

## Image Delivery Proof

The passing audit observed production at `2026-08-24T16:29:10.151Z` from
deployed web commit `e136393c47a9941a5e2b4a846566f697f9a0f9d9`.

| Measure | Result |
| --- | ---: |
| Eligible self-hosted rows | 164,227 |
| Direct Storage HEAD | 3,000 / 3,000 |
| Direct full-body image signature | 100 / 100 |
| Anonymous-public production proxy | 100 / 100 |
| Observed object failure rate | 0% |
| 95% upper broken-object bound | 0.0998% |
| Direct Storage HEAD p95 | 572.5 ms |
| Full-body p95 | 593.0 ms |
| Cold/no-cache production proxy p95 | 3,094.3 ms |

Report fingerprint:
`edbfe3fff6380e463655099b45fb850ce11068d77c713855c82a17a099d1bc15`.

The earlier `69 / 100` proxy result was preserved as failed evidence and
classified as an invalid anonymous cohort: `65` hidden MTG rows and `4` hidden
One Piece rows were correctly denied by the release boundary. Their direct
objects were present. No RLS or catalog-release boundary was widened. The cold
proxy result was subsequently exercised under the passing launch-load gate.

## Read-Load Proof

The final read-only run observed production at `2026-08-24T17:49:06.879Z`
from frozen load commit `646f8dac17e4c8dcc340045a1d7dda536b598556`.

| Measure | Result |
| --- | ---: |
| Target | 33 RPS for 300 seconds |
| Measured launch-peak multiplier | 2.056x |
| Planned / completed / successful | 9,900 / 9,900 / 9,900 |
| HTTP failures / 429s / transport retries | 0 / 0 / 0 |
| Search p95 | 225.245 ms |
| Pricing detail p95 | 178.888 ms |
| Pricing grid p95 | 143.057 ms |
| Image p95 / maximum | 248.269 / 1,495.742 ms |
| Maximum DB connection utilization | 33.33% |
| Waiting locks | 0 |

The app's existing `120` requests-per-actor-per-minute API protection was
separately proven by the preserved single-actor run. The passing launch run
modeled ten independent collectors and did not alter production rate limits.

Permanent report:
`docs/audits/production_backend_launch_v1/READ_LOAD_GATE_20260824_V1.md`.

## Verification

- Repository full contract suite after the bounded search migration: `2,397 passed`, `0 failed`.
- Capacity forecast contract tests: `4 passed`, `0 failed`.
- Current candidate targeted suite before this audit: `43 passed`, `0 failed`.
- Production-backend contract suite after the image cohort repair: `38 passed`, `0 failed`.
- Full repository shipcheck after both image-route repairs: Flutter `635 / 635`; all prior web, contract, type, lint, and build phases passed.
- Bounded-search output equivalence: `14 / 14` query shapes preserved exact ordered results.
- Final launch read load: `9,900 / 9,900` passed with zero findings.
- Current candidate syntax checks: passed.
- `git diff --check`: passed.
- GitHub Contracts Runtime Protection at `648ba5da0`: passed.
- GitHub MTG Catalog Supervisor latest run: passed at `2026-08-24T07:23:30Z`.
- Same-candidate and final-candidate manifest policy tests: `10 / 10` passed.
- Mobile release builds now embed source commit and build-run provenance for Android GitHub Actions and iOS Xcode Cloud.
- Fresh full repository contract suite: `2,410 / 2,410` passed.
- Fresh full Flutter non-golden suite: `616 / 616` passed.

## Prepared Release Controls

The following fail-closed controls are implemented but not yet satisfied by a
new candidate:

- same-candidate web, Android, and iOS manifest evaluator;
- source-commit provenance in governed mobile builds;
- final-candidate prerequisite, migration, workload, and rollback evaluator;
- nonproduction restore runbook;
- ordered final-candidate deployment and rollback runbook; and
- 72-hour production-backend canary runbook.

The checked-in example manifests deliberately evaluate as blocked. Historical
functional evidence remains useful but cannot satisfy a new candidate's commit
or observation window.

## Remaining Hard Gates

1. Resolve the managed-disk capacity blocker through a separately authorized capacity and/or hash-verified archival-retention plan. No paid plan change or destructive retention action is authorized by this checkpoint.
2. Capture authoritative current-billing-cycle cached and uncached egress from the Supabase organization Usage page and produce the 30-day and 90-day forecast. The Storage plan limit is now measured.
3. Authorize an isolated destination, then run a reconciled restore into a nonproduction Supabase project. PITR remains a separate paid plan decision.
4. Produce one synchronized web, Android, and iOS candidate and run the prepared authentication, search, pricing, Vault, image, sharing, and Memory-link gate.
5. Complete the prepared final-candidate manifest, then deploy one same-source candidate across control plane, pricing/MEE, web, Android, and iOS with a frozen migration manifest and tested rollback target.
6. Observe at least 72 hours and all required unattended pricing cycles with zero unresolved SEV-1 or SEV-2 incidents.
7. Reconcile the final report and only then make a separate public-rollout decision.

## Background Lanes

MTG supervision is healthy. Japanese, One Piece, cross-TCG sealed, and Funko remain explicitly unmeasured in the shared control plane. They are not launch blockers while disabled, but they must not be enabled until each has a live adapter, durable cursor, budget, reconciliation, alert route, and Class A/B yield behavior.

## Boundary

This gate did not delete user or warehouse data, mutate Vault ownership, change canonical identity, widen RLS, publish MEE-derived prices, create public access, enable a Class C worker, buy infrastructure, or authorize public rollout.
