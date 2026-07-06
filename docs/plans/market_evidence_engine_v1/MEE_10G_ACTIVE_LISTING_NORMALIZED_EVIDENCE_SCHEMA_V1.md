# MEE_10G_ACTIVE_LISTING_NORMALIZED_EVIDENCE_SCHEMA_V1

## Status

Local migration candidate only.

No remote migration was applied. No evidence backfill, provider calls, source fetches, pricing rollups, public pricing views, or app-visible price rows were executed.

## Purpose

Extend the internal `market_reference_normalized_evidence` warehouse so reviewed active-listing normalized evidence can be stored honestly as `ebay_active` without turning it into model truth.

The candidate files are:

```text
docs/sql/market_reference_active_listing_normalized_evidence_schema_v1_migration_candidate.sql
supabase/migrations/20260625030000_market_reference_active_listing_normalized_evidence_schema_v1.sql
```

## Scope

The candidate proposes only constraint updates for:

- `public.market_reference_normalized_evidence`

It allows:

- `source = ebay_active`
- `model_disposition = review_required_active_listing`
- `model_disposition = quarantined_active_listing_context`
- `model_disposition = blocked_candidate`

It preserves:

- reference-source dispositions for TCGCSV and PokemonTCG.io rows
- existing RLS and service-role-only access
- no app-visible pricing
- no public price publication
- no market truth rollups

It adds:

- `market_reference_normalized_evidence_active_listing_review_only_check`

That check requires all `ebay_active` normalized evidence to keep:

```text
model_eligible = false
```

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
