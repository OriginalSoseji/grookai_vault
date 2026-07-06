# MEE_10A_ACTIVE_LISTING_WAREHOUSE_SCHEMA_V1

## Status

Local migration candidate only.

No remote migration was applied. No evidence backfill, provider calls, source fetches, pricing rollups, public pricing views, or app-visible price rows were executed.

## Purpose

Extend the internal `market_reference_*` warehouse so reviewed active-listing evidence can be stored honestly as `ebay_active` / `active_listing` instead of being mislabeled as reference evidence.

The candidate files are:

```text
docs/sql/market_reference_active_listing_warehouse_schema_v1_migration_candidate.sql
supabase/migrations/20260625020000_market_reference_active_listing_warehouse_schema_v1.sql
```

## Scope

The candidate proposes only constraint updates for:

- `public.market_reference_raw_snapshots`
- `public.market_reference_candidates`

It allows:

- `source = ebay_active`
- `source_type = active_listing` only when paired with `source = ebay_active`
- raw snapshot object types for eBay Browse active listing payloads

It preserves:

- `needs_review = true`
- `can_publish_price_directly = false`
- existing RLS and service-role-only access
- no app-visible pricing
- no market truth rollups

## Blocked Writes

The candidate must not:

- insert evidence rows
- write `pricing_observations`
- write `ebay_active_prices_latest`
- create public app-facing pricing views
- create price rollups
- modify identity tables
- modify vault tables
- modify image tables
- delete rows
- merge data

## Next Step

After reviewing the local candidate and hashes, the next approval should be a targeted remote schema apply for only this migration file.
