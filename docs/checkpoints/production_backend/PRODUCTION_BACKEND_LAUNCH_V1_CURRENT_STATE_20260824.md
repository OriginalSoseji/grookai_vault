# Production Backend Launch V1 Current State

**Checkpoint date:** `2026-08-24`

**Branch:** `release/production-backend-launch-v1`

**Candidate SHA:** `648ba5da0fe5cc70992dc1bf3a583fff9938d0c4`

## Context

The launch lane began with fragmented historical evidence, stale dashboard inputs, and no single live view of worker freshness. The release contract required current operational proof rather than another feature milestone.

## Problem

MEE and pricing had substantial data and prior recovery work, but scheduled state, alert delivery, current Supabase posture, scanner health, and cross-domain reconciliation were not visible through one governed control plane. That made a launch claim impossible to defend.

## Decision

Keep `GROOKAI_PRODUCTION_BACKEND_LAUNCH_V1` frozen. Operate one live control plane, preserve source and review boundaries, repair workers without destructive cleanup, and fail closed on capacity, recovery, client, load, and canary evidence that has not been measured.

## Current Truths

- The control plane runs every 15 minutes from `648ba5da0`.
- Fourteen components are healthy; no component is failed, degraded, or stale.
- Four Class C lanes are explicitly unmeasured and remain disabled/nonlaunch-critical.
- Alert severity, delivery, readback, transition deduplication, and cooldown are proven.
- Pricing recovery V5 is terminal and reconciled; the daily pricing timer is active.
- New-set discovery and both scanner services are healthy.
- Fresh MEE run `MEE-DROPLET-2026-08-24` completed with zero findings and exact readback.
- Fresh Supabase SQL evidence has zero critical/high findings.
- Managed backups are fresh, but PITR is disabled and restore proof is absent.
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

## Supabase Current Proof

- Database: `228,119,088,275` bytes.
- Storage: `31,838,610,700` bytes across `167,734` objects.
- Connections: `21 / 90`.
- Waiting locks, long queries, invalid indexes, RLS exposure, unsafe definer functions, and deadlocks: `0`.
- Cumulative cache hit: `0.924253`; interval/load behavior is not yet proven.
- Physical backups: `7`; latest age `19.25h`; maximum gap `25.66h`.
- WAL-G: enabled. PITR: disabled. Nonproduction restore: unmeasured.

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

- Full contract suite in this lane: `2,359 / 2,359` passed.
- Current targeted suite: `43 / 43` passed.
- Syntax and diff checks: passed.
- Current-SHA Runtime Protection workflow: passed.
- Failed production systemd units: zero.

## Remaining Work

1. Observe and reconcile the scheduled `08:15 UTC` pricing cycle.
2. Measure plan capacities and 30/90-day growth.
3. Complete a nonproduction restore exercise.
4. Establish expected launch peak and pass 2x load/failure tests.
5. Complete current image-delivery sampling.
6. Supply governed temporary signed-in journey accounts and run web, Android, and iOS on one candidate.
7. Freeze, merge, and deploy one candidate with rollback evidence.
8. Complete the 72-hour canary and unattended cycle requirements.
9. Produce a zero-mismatch final launch report.

## Explicit Next Gate

Reconcile the `2026-08-24 08:15 UTC` pricing schedule, then close the measurable capacity, restore, image, signed-in client, and load prerequisites before starting the full frozen-candidate 72-hour canary. Public rollout remains prohibited.
