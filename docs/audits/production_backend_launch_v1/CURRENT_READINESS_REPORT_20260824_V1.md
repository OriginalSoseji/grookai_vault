# Production Backend Launch V1 Current Readiness

**Observed:** `2026-08-24T15:18:38.086Z`

**Branch:** `release/production-backend-launch-v1`

**Deployed control-plane SHA:** `e56f33fc462190e39bfe4f4717d6c1ce9a6c15a0`

**Deployed pricing/MEE SHA:** `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f`

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

The database-growth estimate uses current relation bytes per live row multiplied by rows written in the reconciled TCGPlayer, MEE, and publication cycles. It is a lower bound because it excludes WAL, system overhead, bloat changes, and unlisted relations. Storage added `19,310,094,155` bytes in the last 30 days, but that period includes a one-time bulk image event; Storage plan capacity and provider egress remain unmeasured.

This gate is **BLOCKED**. Current utilization already exceeds the frozen `<70%` target and cannot provide the required 2x projected 90-day headroom. Resolving it requires a separately governed capacity and/or hash-verified archival-retention decision.

Temporary risk containment:

- MEE nightly acquisition ceiling: `1` call.
- MEE timer: still active; next scheduled cycle remains supervised.
- TCGPlayer source and exact pricing publication: unchanged.
- Provider calls during throttle verification: `0`.
- Database, Storage, canonical, pricing, and Vault writes during throttle verification: `0`.

## Verification

- Repository full contract suite earlier in this lane: `2,359 passed`, `0 failed`.
- Capacity forecast contract tests: `4 passed`, `0 failed`.
- Current candidate targeted suite before this audit: `43 passed`, `0 failed`.
- Current candidate syntax checks: passed.
- `git diff --check`: passed.
- GitHub Contracts Runtime Protection at `648ba5da0`: passed.
- GitHub MTG Catalog Supervisor latest run: passed at `2026-08-24T07:23:30Z`.

## Remaining Hard Gates

1. Resolve the managed-disk capacity blocker through a separately authorized capacity and/or hash-verified archival-retention plan. No paid plan change or destructive retention action is authorized by this checkpoint.
2. Measure the remaining Storage plan limit and provider egress forecast.
3. Run a reconciled restore into a nonproduction Supabase project. PITR remains a separate plan decision.
4. Define expected launch peak and pass stable 2x read-path load plus dependency-failure exercises.
5. Run same-candidate signed-in web, Android, and iOS journeys for authentication, search, pricing, Vault, images, sharing, and memory links.
6. Complete a current launch-wide self-hosted image delivery and fallback sample.
7. Merge and deploy one frozen production candidate with a migration manifest and tested rollback target.
8. Observe at least 72 hours and all required unattended pricing cycles with zero unresolved SEV-1 or SEV-2 incidents.
9. Reconcile the final report and only then make a separate public-rollout decision.

## Background Lanes

MTG supervision is healthy. Japanese, One Piece, cross-TCG sealed, and Funko remain explicitly unmeasured in the shared control plane. They are not launch blockers while disabled, but they must not be enabled until each has a live adapter, durable cursor, budget, reconciliation, alert route, and Class A/B yield behavior.

## Boundary

This gate did not delete user or warehouse data, mutate Vault ownership, change canonical identity, widen RLS, publish MEE-derived prices, create public access, enable a Class C worker, buy infrastructure, or authorize public rollout.
