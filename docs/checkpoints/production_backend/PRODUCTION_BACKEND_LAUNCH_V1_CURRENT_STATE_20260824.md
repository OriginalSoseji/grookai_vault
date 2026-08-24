# Production Backend Launch V1 Current State

**Checkpoint date:** `2026-08-24`

**Branch:** `release/production-backend-launch-v1`

**Deployed control-plane SHA:** `e56f33fc462190e39bfe4f4717d6c1ce9a6c15a0`

**Deployed pricing/MEE SHA:** `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f`

**Deployed web SHA:** `e136393c47a9941a5e2b4a846566f697f9a0f9d9`

**Read-load candidate SHA:** `646f8dac17e4c8dcc340045a1d7dda536b598556`

## Context

The launch lane began with fragmented historical evidence, stale dashboard inputs, and no single live view of worker freshness. The release contract required current operational proof rather than another feature milestone.

## Problem

MEE and pricing had substantial data and prior recovery work, but scheduled state, alert delivery, current Supabase posture, scanner health, and cross-domain reconciliation were not visible through one governed control plane. That made a launch claim impossible to defend.

## Decision

Keep `GROOKAI_PRODUCTION_BACKEND_LAUNCH_V1` frozen. Operate one live control plane, preserve source and review boundaries, repair workers without destructive cleanup, and fail closed on capacity, recovery, client, load, and canary evidence that has not been measured.

## Current Truths

- The control plane runs every 15 minutes from `e56f33fc46`.
- Fourteen components are healthy; no component is failed, degraded, or stale.
- The automatic `15:15 UTC` run proved exact runtime-SHA attribution with no manual trigger.
- Four Class C lanes are explicitly unmeasured and remain disabled/nonlaunch-critical.
- Alert severity, delivery, readback, transition deduplication, and cooldown are proven.
- Pricing recovery V5 is terminal and reconciled; the daily pricing timer is active.
- New-set discovery and both scanner services are healthy.
- Fresh MEE run `MEE-DROPLET-2026-08-24` completed with zero findings and exact readback.
- Fresh Supabase SQL evidence has zero critical/high findings.
- Managed backups are fresh, but PITR is disabled and restore proof is absent.
- Supabase managed disk is `72.33%` utilized, above the frozen launch target; conservative measured writes project 80% in `7.70` days and full disk in `27.78` days.
- MEE acquisition is temporarily throttled to one call nightly. The timer remains active and a zero-provider-call, zero-write dry run passed.
- Production image delivery passes the launch availability gate: `3,000 / 3,000` object reads, `100 / 100` body checks, and `100 / 100` anonymous-public proxy reads.
- The measured 95% upper broken-object bound is `0.0998%`.
- Candidate-first, bounded identity search is applied in production with exact ordered-output equivalence and unchanged release visibility.
- The read-load gate is closed: `9,900 / 9,900` successful production reads at `33 RPS` for five minutes (`2.056x` measured peak), with zero retries, 429s, waiting locks, or reconciliation mismatches.
- Search p95 is `225.245 ms`; pricing detail/grid p95 is `178.888 / 143.057 ms`; image p95 is `248.269 ms`; maximum DB connection use is `33.33%`.
- The release branch remains ahead of `origin/main`; it has not been declared or deployed as the final all-client production candidate.

## MEE Current-Cycle Proof

- Calls: `4,000`
- Provider errors: `0`
- Listings observed: `263,762`
- Warehouse observations/events: `222,947`
- Candidates: `181,745`
- Strict rollups: `5,892`
- Public/app-visible MEE rows: `0`
- Worker result: `completed`, systemd exit `0`
- Next run: `2026-08-25T03:27:38Z`

Permanent evidence is preserved outside the repository at:

- `C:\secure-ops\production-backend-launch\mee\20260824T055224Z_c434101ee\`
- `C:\secure-ops\production-backend-launch\control-plane\20260824T0750Z_648ba5da0\`
- `C:\secure-ops\production-backend-launch\supabase-sql\20260824T0750Z_648ba5da0\`
- `C:\secure-ops\production-backend-launch\supabase-managed\20260824T0750Z_648ba5da0\`
- `C:\secure-ops\production-backend-launch\control-plane\20260824T151514Z_e56f33fc46\`
- `C:\secure-ops\production-backend-launch\supabase-capacity\20260824T150533Z\`
- `C:\secure-ops\production-backend-launch\capacity\20260824T1517Z_mee_capacity_throttle\`
- `C:\secure-ops\production-backend-launch\image-delivery\20260824T161945Z_e136393c4_failed\`
- `C:\secure-ops\production-backend-launch\image-delivery\20260824T162909Z_e136393c4_audit_2dee90bc51\`
- `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-27-46-860Z_bounded_preflight\`
- `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-28-31-542Z_bounded_extended_equivalence\`
- `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-30-53-569Z_bounded_apply\`
- `C:\secure-ops\production-backend-launch\read-load\20260824T174405Z_final_launch_33rps_300s\`
- `C:\secure-ops\production-backend-launch\supabase-usage\20260824T175621Z\`
- `docs/runbooks/PRODUCTION_SUPABASE_NONPRODUCTION_RESTORE_EXERCISE_V1.md`
- `docs/runbooks/PRODUCTION_SAME_CANDIDATE_CLIENT_JOURNEYS_V1.md`
- `docs/runbooks/PRODUCTION_BACKEND_FINAL_CANDIDATE_DEPLOY_ROLLBACK_V1.md`
- `docs/runbooks/PRODUCTION_BACKEND_72_HOUR_CANARY_V1.md`

## Supabase Current Proof

- Database: `228,119,088,275` bytes.
- Storage: `31,838,610,700` bytes across `167,734` objects.
- Connections: `21 / 90`.
- Waiting locks, long queries, invalid indexes, RLS exposure, unsafe definer functions, and deadlocks: `0`.
- Cumulative cache hit: `0.924253`; the final read-load run had no waiting locks and peaked at `33.33%` connection utilization.
- Physical backups: `7`; latest age `19.25h`; maximum gap `25.66h`; provider entitlement retention: `7 days`.
- WAL-G: enabled. PITR: disabled. Restore-to-new-project and project cloning: available. Nonproduction restore: not executed.
- Managed disk: `231,542,988,800 / 320,101,937,152` bytes (`72.33%`).
- Lower-bound append growth: `3,187,447,225` bytes/day.
- Lower-bound 30-day disk utilization: `102.21%`.
- 2x 90-day headroom deficit: `485,181,552,072` bytes.
- Managed-disk autoscale: unconfigured.
- Provider entitlement profile: Pro, classified from seven-day backup retention and absence of Team project-scoped roles; the Management API does not return a direct plan-name field.
- Storage allowance: `100 GB`; current utilization `31.84%`; recent-rate 30-day projection `51.15%`; burst-sensitive 90-day projection `89.77%`; 2x 90-day growth headroom deficit `47.70 GB`.
- Egress allowance: `250 GB` uncached plus `250 GB` cached; current billing-cycle byte totals and forecast remain unmeasured.

## Invariants

- No user ownership or Vault row may be deleted or rewritten by release repair.
- MEE candidates and rollups remain internal review evidence and cannot become app-visible pricing.
- Ambiguous identity stays excluded or quarantined.
- No public, grant, or RLS boundary widens implicitly.
- A worker success claim requires terminal state plus durable reconciliation.
- Class C work yields to Class A/B and remains disabled when it lacks live supervision.
- A dated artifact cannot represent current health without a freshness check.

## What Must Never Be Broken

- Canonical identity authority.
- Exact-printing Vault ownership.
- Pricing publication policy and provenance.
- Self-hosted image authority labels.
- Service-only candidate and review tables.
- Alert delivery and no-silent-failure behavior.
- Idempotent resume without whole-batch provider refetch.

## Verification

- Full contract suite after the search repair: `2,397 / 2,397` passed.
- Current targeted suite: `43 / 43` passed.
- Syntax and diff checks: passed.
- Runtime Protection workflow: passed.
- Capacity forecast tests: `4 / 4` passed.
- MEE one-call throttle dry run: completed with zero findings, provider calls, and writes.
- Image delivery audit: passed with zero failures across all `3,200` governed probes.
- Image audit fingerprint: `edbfe3fff6380e463655099b45fb850ce11068d77c713855c82a17a099d1bc15`.
- Extended search output equivalence: `14 / 14` query shapes matched exact ordered live results.
- Final 2x read-load proof: `9,900 / 9,900` requests passed with zero findings.
- Same-candidate and final-candidate policy tests: `10 / 10` passed.
- Fresh repository contracts: `2,410 / 2,410`; fresh Flutter non-golden tests: `616 / 616`.
- Governed Android and iOS build paths embed immutable source-commit provenance.
- Failed production systemd units: zero.

## Remaining Work

1. Resolve the measured Supabase capacity blocker without deleting source or user truth.
2. Capture provider billing-cycle egress and complete its forecast. Storage plan capacity is measured.
3. Authorize an isolated destination and complete the prepared nonproduction restore exercise.
4. Cut one synchronized candidate and execute the prepared governed signed-in web, Android, and iOS journey gate.
5. Complete the prepared manifest, freeze, merge, and deploy one candidate with rollback evidence.
6. Complete the 72-hour canary and unattended cycle requirements.
7. Produce a zero-mismatch final launch report.

## Explicit Next Gate

Capture provider billing-cycle egress, then execute the prepared nonproduction restore exercise only after an isolated destination is authorized. Continue preparing the same-candidate client journey package while the managed-disk decision remains blocked. A paid disk change, PITR change, nonproduction project creation, destructive retention action, final candidate deployment, and public rollout remain separate gates.

## Automated Readiness Addendum

The launch readiness checks are now executable through one read-only command:

`npm run production:launch:automate`

The automation queries the Supabase Management and Metrics APIs, executes the
existing database audit in a read-only transaction, refreshes managed-backup
and control-plane evidence, and reconciles the preserved read-load result. It
writes a run plan before provider calls and hashes every output artifact.

The first complete live run is preserved at:

`C:\secure-ops\production-backend-launch\automated-readiness\2026-08-24T19-32-37-655Z_read_only`

Current provider truth from that run:

- Medium compute is active with 4 GB memory and 120 direct connections.
- Current CPU maximum was 10.47%; memory maximum was 37.36%.
- Disk remains 72.33% used and above the frozen launch target.
- The project is healthy and not read-only.
- Nine completed physical backups are visible; WAL-G is enabled.
- The organization quota warning and enabled Spend Cap remain launch blockers.
- Exact billing-cycle egress, nonproduction restore proof, and synchronized
  same-candidate client proof remain incomplete.

The scheduled GitHub readiness and founder-operations monitors now upload
artifacts without committing generated snapshots. They therefore do not create
monitor-only source commits or trigger Vercel deployments.

## Automated Prerequisite Addendum

Two additional fail-closed preparation commands now cover the work that can be
completed without financial or deployment mutations:

- `npm run production:supabase:restore-preflight`
- `npm run production:clients:prepare`

The live restore preflight inspected the management plane and production in a
read-only transaction. It captured schema and migration-ledger fingerprints,
confirmed the latest completed backup, calculated a `277 GB` minimum isolated
destination, and refused to proceed because the organization currently has
only the production project. No project was created and no restore started.

The client preparation package writes a hashed manifest template tied to the
current source SHA while deliberately leaving every deployment/build SHA and
journey result empty. It cannot pass until web, Android, and iOS are all built
and tested from the final frozen candidate.

Supabase Studio's exact organization billing usage is not exposed by the
documented PAT Management API. Exact cached/uncached egress remains an operator
capture; automation may not reuse signed-in browser credentials.
