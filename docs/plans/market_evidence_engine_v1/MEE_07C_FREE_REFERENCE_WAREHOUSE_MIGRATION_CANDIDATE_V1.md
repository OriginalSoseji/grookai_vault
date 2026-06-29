# MEE_07C_FREE_REFERENCE_WAREHOUSE_MIGRATION_CANDIDATE_V1

## Status

Migration candidate artifact only.

No migration was created under `supabase/migrations`. No SQL was applied. No database writes, provider calls, scraper jobs, pricing rollups, or app-visible price rows were executed.

## Purpose

Prepare the real migration candidate for `MARKET_REFERENCE_WAREHOUSE_V1` while keeping it outside the active Supabase migration directory.

The candidate artifact is:

```text
docs/sql/market_reference_warehouse_v1_migration_candidate.sql
```

## Relationship To Dry Run

The candidate keeps the same table, index, check, and RLS policy shape as:

```text
docs/sql/market_reference_warehouse_v1_guarded_dry_run.sql
```

The intentional differences are:

- package label changes from dry-run to migration candidate
- final transaction changes from `rollback` to `commit`
- header says review artifact, not applied migration

## Scope

The candidate proposes only:

- `public.market_reference_acquisition_runs`
- `public.market_reference_raw_snapshots`
- `public.market_reference_candidates`
- `public.market_reference_normalized_evidence`
- `public.market_reference_coverage_reports`
- supporting indexes
- RLS enablement
- service-role-only policies

## Blocked Writes

The candidate must not:

- write `pricing_observations`
- alter `pricing_observations`
- write `ebay_active_prices_latest`
- create public app-facing pricing views
- create reference price rollups
- modify identity tables
- modify vault tables
- modify image tables
- backfill evidence

## Approval Text Template

Use this shape only after reviewing the candidate:

```text
Approve real MARKET-REFERENCE-WAREHOUSE-V1 migration candidate apply only. Fingerprint: <package_fingerprint>. SQL hash: <sql_hash>. Scope: create 5 free-reference Market Evidence Engine warehouse tables, supporting indexes, RLS enablement, and service-role-only policies only. No evidence backfill. No provider calls. No pricing_observations writes. No ebay_active_prices_latest writes. No public pricing views. No identity-table writes. No vault writes. No image writes. No deletes. No merges. No global apply.
```

## Next Step

Generate the exact hash report for this candidate.

Only after explicit approval should this candidate be copied into `supabase/migrations` with a timestamped filename.
