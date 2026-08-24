# Production Backend Launch V1 Current Readiness

**Observed:** `2026-08-24T07:52:19.237Z`

**Branch:** `release/production-backend-launch-v1`

**Candidate SHA:** `648ba5da0fe5cc70992dc1bf3a583fff9938d0c4`

**Launch verdict:** **NOT READY**

## Completed In This Gate

- The live control plane is deployed from the candidate SHA and runs every 15 minutes.
- Current topology status is 14 healthy, zero failed, zero degraded, zero stale, and four unmeasured Class C lanes.
- Launch-critical control-plane findings produce governed operations notifications with stable transition-based deduplication and a six-hour cooldown.
- Scanner V3 and V5 are active and pass direct HTTP health checks.
- New-set discovery is active, fresh, and contains seven review-required candidates without promoting them.
- The production pricing recovery run is terminal and reconciled. Its daily timer is active for `08:15 UTC`.
- A fresh MEE cycle completed under systemd supervision with no retry or provider refetch after its initial acquisition.
- The fresh read-only Supabase audit found no critical or high security or database-health finding.
- The managed-control audit confirms a fresh seven-point physical backup chain and WAL-G support.
- The MEE retention planner made no deletion because available disk already exceeds its configured free-space floor.

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

## Verification

- Repository full contract suite earlier in this lane: `2,359 passed`, `0 failed`.
- Current candidate targeted suite: `43 passed`, `0 failed`.
- Current candidate syntax checks: passed.
- `git diff --check`: passed.
- GitHub Contracts Runtime Protection at `648ba5da0`: passed.
- GitHub MTG Catalog Supervisor latest run: passed at `2026-08-24T07:23:30Z`.

## Remaining Hard Gates

1. Measure Supabase plan limits and produce 30-day and 90-day database, Storage, egress, and connection forecasts. No paid plan change is authorized by this gate.
2. Run a reconciled restore into a nonproduction Supabase project. PITR remains a separate plan decision.
3. Define expected launch peak and pass stable 2x read-path load plus dependency-failure exercises.
4. Run same-candidate signed-in web, Android, and iOS journeys for authentication, search, pricing, Vault, images, sharing, and memory links.
5. Complete a current launch-wide self-hosted image delivery and fallback sample.
6. Merge and deploy one frozen production candidate with a migration manifest and tested rollback target.
7. Observe at least 72 hours and all required unattended pricing cycles with zero unresolved SEV-1 or SEV-2 incidents.
8. Reconcile the final report and only then make a separate public-rollout decision.

## Background Lanes

MTG supervision is healthy. Japanese, One Piece, cross-TCG sealed, and Funko remain explicitly unmeasured in the shared control plane. They are not launch blockers while disabled, but they must not be enabled until each has a live adapter, durable cursor, budget, reconciliation, alert route, and Class A/B yield behavior.

## Boundary

This gate did not delete user data, mutate Vault ownership, change canonical identity, widen RLS, publish MEE-derived prices, create public access, enable a Class C worker, buy infrastructure, or authorize public rollout.
