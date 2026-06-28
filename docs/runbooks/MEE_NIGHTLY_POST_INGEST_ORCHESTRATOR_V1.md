# MEE Nightly Post-Ingest Orchestrator V1 Runbook

## Operator Goal

Run the internal Market Evidence Engine cleanup and readiness pass after the nightly acquisition worker has finished.

This is the normal follow-up to the eBay acquisition worker. It does not call eBay and does not fetch sources.

## Runtime Shape

- Host: droplet
- Repo path: `/opt/grookai_vault_mee_nightly` preferred, `/opt/grookai_vault` acceptable if that is the live checkout
- Env file: `/etc/grookai/mee-nightly.env`
- Time window: 3:35 to 4:30am server-local time
- Locking: Postgres advisory lock plus local `flock`
- Output: local audit artifacts under `docs/audits/market_evidence_engine_v1`

## Required Environment

- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `MEE_NIGHTLY_ALLOW_RUN=1`
- `MEE_POST_INGEST_ALLOW_RUN=1`
- `MEE_POST_INGEST_ALLOW_DERIVED_REFRESH=1`
- `MEE_POST_INGEST_MODE=plan_then_apply_internal`
- `MEE_POST_INGEST_MAX_LIFECYCLE_OBSERVATIONS=10000`
- `MEE_POST_INGEST_MAX_CLEANUP_EVENTS=60000`

No eBay token is required for this post-ingest layer.

## Phase Plan

1. Verify the previous acquisition job finished and has a single current run key.
2. Run lifecycle projection planning for new eligible source rows.
3. Stop if projection has duplicate-risk, stage-order, or public-boundary failures.
4. Apply lifecycle projection only when the package is internally approved by the orchestrator contract.
5. Run candidate cleanup classification for held publication-gate rows.
6. Seed cleanup events only when the package proves no existing target cleanup events.
7. Run internal readbacks for lifecycle, cleanup current state, cleanup card summary, review dashboard, quality scores, and publication gate.
8. Run blocker-policy closeout as a readback contract.
9. Refresh the derived lifecycle rollup summary materialized view.
10. Run final non-public publication-gate recheck and write a report.

## Failure Handling

The job stops on first failed phase. It does not retry mutation phases automatically. A retry must use the same run key and must prove whether previous rows were written.

## Expected Final Report

The final report must include:

- acquisition run key
- lifecycle rows planned and applied
- cleanup events planned and applied
- blocker-policy totals
- publication-gate candidate counts
- public-boundary proof
- per-phase artifact paths
- package fingerprint

## Manual Recovery

If the systemd timer fails, run the read-only preflight first:

```bash
node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --dry-run
```

Only run the live post-ingest workflow after the dry-run report has no blockers:

```bash
node scripts/workers/mee_nightly_post_ingest_orchestrator_v1.mjs --run
```
