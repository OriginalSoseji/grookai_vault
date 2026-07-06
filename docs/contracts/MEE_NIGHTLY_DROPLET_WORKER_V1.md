# MEE Nightly Droplet Worker V1

## Purpose

Run the Market Evidence Engine overnight flow on a droplet instead of Vercel.

The worker is for internal evidence handling only. It may acquire market listing evidence, store internal warehouse rows, project lifecycle rows, apply internal quality-gate review actions, and write audit artifacts.

It must not publish prices.

## Runtime

- Host: Linux droplet
- Runtime: Node.js from the repo checkout
- Scheduler: `systemd timer` preferred, cron acceptable
- Time window: 3-4am server-local time
- Entrypoint: `node scripts/workers/mee_nightly_droplet_worker_v1.mjs --run`

## Required Environment

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_DB_URL`
- `EBAY_BROWSE_ACCESS_TOKEN`
- `MEE_NIGHTLY_ALLOW_RUN=1`
- `MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1` for acquisition runs.
- `MEE_NIGHTLY_NORMALIZATION_ONLY=1` for no-provider reprocessing runs.
- `MEE_NIGHTLY_MAX_CALL_CEILING` to cap acquisition calls.

## Lifecycle

1. Acquire a Postgres advisory lock.
2. Run fast MEE readback.
3. Run bounded market listing ingestion, or skip provider acquisition when running normalization-only.
4. Optionally run the no-provider normalization/GVID reprocessing runner.
5. Drain eligible lifecycle projection.
6. Run quality scoring readback.
7. Build quality-gate internal action plan.
8. Preflight quality-gate action package.
9. Apply quality-gate actions.
10. Run quality-gate readback.
11. Run final fast readback.
12. Refresh foundation checkpoint.
13. Release the advisory lock.

## Allowed Writes

- Existing approved `market_listing_*` warehouse rows.
- Existing approved `market_evidence_observations`.
- Existing approved `market_evidence_lifecycle_events`.
- Existing approved `market_evidence_review_action_events`.
- Existing approved `market_evidence_review_dispositions`.
- Local audit artifacts.

## Not Allowed

- Public pricing views.
- `public_pricing` surfaces.
- App-visible pricing.
- `app_visible` pricing flags.
- Public price rollups.
- `pricing_observations` writes.
- `ebay_active_prices_latest` writes.
- JustTCG public pricing.
- Identity-table writes.
- Vault writes.
- Image/storage writes.
- Migrations.
- Deletes, except a future explicitly contracted same-run repair cleanup.
- Global apply.

## Safety Gates

- `--dry-run` is the default.
- `--run` requires `MEE_NIGHTLY_ALLOW_RUN=1`.
- Provider acquisition requires `MEE_NIGHTLY_PROVIDER_CALLS_ENABLED=1`.
- `--normalization-only` or `MEE_NIGHTLY_NORMALIZATION_ONLY=1` runs only no-provider reprocessing phases.
- `--call-ceiling` must not exceed `MEE_NIGHTLY_MAX_CALL_CEILING`.
- The worker takes a DB advisory lock before running.
- Any failed phase stops later phases.
- Final readback must prove public pricing remains sealed.

## Current Boundary

This worker stops before public pricing. Pricing publication remains a separate future publish-gate project.
