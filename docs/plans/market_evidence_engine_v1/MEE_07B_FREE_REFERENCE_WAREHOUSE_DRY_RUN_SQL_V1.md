# MEE_07B_FREE_REFERENCE_WAREHOUSE_DRY_RUN_SQL_V1

## Status

Dry-run SQL draft only.

No migration was created under `supabase/migrations`. No SQL was applied. No database writes, provider calls, scraper jobs, pricing rollups, or app-visible price rows were executed.

## Purpose

Translate `MEE_07A_FREE_REFERENCE_WAREHOUSE_CONTRACT_V1` into a guarded rollback-only SQL draft.

The SQL artifact is:

```text
docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql
```

## Scope

The dry-run SQL proposes only these new reference warehouse tables:

- `public.market_reference_acquisition_runs`
- `public.market_reference_raw_snapshots`
- `public.market_reference_candidates`
- `public.market_reference_normalized_evidence`
- `public.market_reference_coverage_reports`

It also proposes:

- indexes for replay and audit reads
- RLS enablement
- service-role-only policies
- a final audit `select`
- final `rollback`

## Explicit Non-Goals

The SQL does not:

- create a real migration file
- commit
- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public app-facing pricing views
- create reference rollups
- modify card identity tables
- modify vault tables
- modify image tables
- call providers
- backfill evidence

## Publication Boundary

All stored reference evidence remains non-public:

- `market_reference_candidates.can_publish_price_directly = false`
- `market_reference_candidates.needs_review = true`
- no app-facing read model exists
- no price summary table is updated

## Next Step

Review the dry-run SQL and produce a real migration candidate only after explicit approval.

A later approval should name the exact package and fingerprint before any migration is placed under `supabase/migrations`.
