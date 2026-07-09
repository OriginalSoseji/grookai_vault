# MEE Nightly Droplet Worker V1

## Purpose

Run the Market Evidence Engine overnight flow on a droplet instead of Vercel.

The worker is for internal evidence handling only. It may acquire market listing evidence, store internal warehouse rows, project lifecycle rows, apply internal quality-gate review actions, and write audit artifacts.

It must not publish prices.

TCGCSV is included as a nightly free-reference acquisition lane alongside eBay active listing ingestion. TCGCSV remains reference evidence only; it cannot directly create Grookai Value, app-visible pricing, public pricing views, `pricing_observations`, or market truth.

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
- `MEE_NIGHTLY_REFERENCE_LIMIT` to cap the nightly TCGCSV reference batch; default `5000`.

## Lifecycle

1. Acquire a Postgres advisory lock.
2. Run bounded fast MEE readback. This first readback is a warning-only preflight so stale review/reporting debt cannot block eBay acquisition; the final fast readback remains blocking.
3. Run bounded market listing ingestion, or skip provider acquisition when running normalization-only.
4. Build the TCGCSV reference query plan and acquisition batch.
5. Refresh TCGCSV reference evidence when provider calls are enabled.
6. Normalize the newest reference acquisition artifact.
7. Run the guarded reference warehouse delta writer for missing reference rows.
8. Optionally run the no-provider normalization/GVID reprocessing runner.
9. Drain eligible lifecycle projection.
10. Run quality scoring readback.
11. Build quality-gate internal action plan.
12. Preflight quality-gate action package.
13. Apply quality-gate actions.
14. Run quality-gate readback.
15. Run final fast readback.
16. Refresh foundation checkpoint.
17. Release the advisory lock.

## Allowed Writes

- Existing approved `market_listing_*` warehouse rows.
- Existing approved `market_evidence_observations`.
- Existing approved `market_evidence_lifecycle_events`.
- Existing approved `market_evidence_review_action_events`.
- Existing approved `market_evidence_review_dispositions`.
- Existing approved `market_reference_*` reference warehouse rows for review-gated free-reference evidence.
- Local audit artifacts.

## Not Allowed

- Public pricing views.
- `public_pricing` surfaces.
- App-visible pricing.
- `app_visible` pricing flags.
- Public price rollups.
- `pricing_observations` writes.
- `ebay_active_prices_latest` writes.
- TCGCSV direct price publication.
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
- Any failed blocking phase stops later phases. The bounded preflight readback is non-blocking and records an execution warning when it fails.
- Final readback must prove public pricing remains sealed.

## Current Boundary

This worker stops before public pricing. Pricing publication remains a separate future publish-gate project.
