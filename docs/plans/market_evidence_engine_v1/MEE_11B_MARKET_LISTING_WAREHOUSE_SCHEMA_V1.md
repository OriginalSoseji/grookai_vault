# MEE_11B_MARKET_LISTING_WAREHOUSE_SCHEMA_V1

## Status

Local migration candidate only.

No remote migration was applied. No provider calls, source fetches, evidence backfill, listing acquisition, pricing observations, public pricing views, app-visible pricing, price rollups, identity writes, vault writes, or image writes were executed.

## Purpose

Create the schema candidate for the internal-only market listing warehouse defined by:

- `docs/plans/market_evidence_engine_v1/MEE_11A_MARKET_LISTING_WAREHOUSE_CONTRACT_V1.md`

The candidate files are:

```text
docs/sql/market_listing_warehouse_v1_migration_candidate.sql
supabase/migrations/20260625050000_market_listing_warehouse_v1.sql
```

## Scope

The candidate proposes eight internal warehouse tables:

- `market_listing_acquisition_runs`
- `market_listing_query_cache`
- `market_listing_raw_snapshots`
- `market_listing_observations`
- `market_listing_seller_snapshots`
- `market_listing_card_candidates`
- `market_listing_price_events`
- `market_listing_rollups`

It adds:

- source lane `ebay_active`
- provider route `ebay_browse_api`
- query cache support
- immutable raw listing payload storage
- observation-level active ask fields
- public seller metadata snapshots
- conservative card candidate matching envelopes
- append-only listing price event history
- internal-only rollup rows
- service-role-only RLS policies

## Preserved Boundaries

The candidate keeps:

- active listings as asking-price evidence only
- `market_truth = false` for rollups
- `app_visible = false` for rollups
- `publishable = false` for rollups
- `needs_review = true` for card candidates and rollups
- `can_publish_price_directly = false` for card candidates
- no anon policy
- no authenticated policy
- no public read policy

## Blocked Writes

The candidate must not:

- insert evidence rows
- execute provider calls
- fetch source data
- write pricing observations
- write latest eBay pricing aggregates
- create public pricing views
- create app-facing pricing rows
- create marketplace workflows
- modify identity tables
- modify vault tables
- modify image tables
- delete rows
- merge data

## Next Step

After reviewing the local candidate, hashes, and test output, the next approval should be a targeted remote schema apply for only:

```text
supabase/migrations/20260625050000_market_listing_warehouse_v1.sql
```

No acquisition job should run until after the schema exists remotely and a separate acquisition-only plan is prepared.
