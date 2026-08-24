# Production Backend Launch V1 Current State

**Checkpoint date:** `2026-08-24`

**Branch:** `release/production-backend-launch-v1`

**Deployed control-plane SHA:** `e56f33fc462190e39bfe4f4717d6c1ce9a6c15a0`

**Deployed pricing/MEE SHA:** `4b6064a5fb7eeacb7887c240735fc6dd8ffec06f`

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

## Supabase Current Proof

- Database: `228,119,088,275` bytes.
- Storage: `31,838,610,700` bytes across `167,734` objects.
- Connections: `21 / 90`.
- Waiting locks, long queries, invalid indexes, RLS exposure, unsafe definer functions, and deadlocks: `0`.
- Cumulative cache hit: `0.924253`; interval/load behavior is not yet proven.
- Physical backups: `7`; latest age `19.25h`; maximum gap `25.66h`.
- WAL-G: enabled. PITR: disabled. Nonproduction restore: unmeasured.
- Managed disk: `231,542,988,800 / 320,101,937,152` bytes (`72.33%`).
- Lower-bound append growth: `3,187,447,225` bytes/day.
- Lower-bound 30-day disk utilization: `102.21%`.
- 2x 90-day headroom deficit: `485,181,552,072` bytes.
- Managed-disk autoscale: unconfigured.
- Storage plan limit and egress forecast: unmeasured.

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
- Runtime Protection workflow: passed.
- Capacity forecast tests: `4 / 4` passed.
- MEE one-call throttle dry run: completed with zero findings, provider calls, and writes.
- Failed production systemd units: zero.

## Remaining Work

1. Resolve the measured Supabase capacity blocker without deleting source or user truth.
2. Measure Storage plan capacity and provider egress.
3. Complete a nonproduction restore exercise.
4. Establish expected launch peak and pass 2x load/failure tests.
5. Complete current image-delivery sampling.
6. Run governed signed-in journeys on web, Android, and iOS from one candidate.
7. Freeze, merge, and deploy one candidate with rollback evidence.
8. Complete the 72-hour canary and unattended cycle requirements.
9. Produce a zero-mismatch final launch report.

## Explicit Next Gate

Complete image and 2x read-load evidence while the managed-disk decision remains blocked. A paid disk change, PITR change, nonproduction project creation, destructive retention action, final deployment, and public rollout remain separate gates.
