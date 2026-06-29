# MEE_04B_MULTI_SOURCE_QUERY_PLAN_V1

## Status

Implemented as a local query-plan generator.

No provider calls, scraper jobs, database writes, pricing rollups, or migrations are performed by this checkpoint.

## Purpose

Turn the 5,000-card worklist from MEE-03 into source-specific acquisition plans.

This is still not evidence acquisition. It only produces deterministic source queries and search URL templates for later approval.

## Command

```powershell
node scripts/audits/market_evidence_engine_query_plan_v1.mjs --limit=5000
```

Outputs are written under:

```text
docs/audits/market_evidence_engine_v1/
```

Each run writes:

- `mee_04b_multi_source_query_plan_<timestamp>.json`
- `mee_04b_multi_source_query_plan_<timestamp>.md`

## Planned Sources

Each target receives planned query entries for:

- `ebay_active`
- `ebay_sold_candidate`
- `ebay_user_export`
- `pokemontcg_io_reference`
- `pricecharting_reference`
- `tcgcsv_reference`
- `tcgplayer_reference_candidate`
- `tcgplayer_user_export`
- `justtcg_reference`
- `manual_review_candidate`

## Boundary

The query plan may include:

- source name
- source type
- acquisition mode
- search terms
- search URL templates
- inclusion hints
- exclusion hints
- evidence goal

The query plan must not:

- fetch source URLs
- call eBay
- call PriceCharting
- call TCGplayer
- call JustTCG
- scrape pages
- insert rows
- update rows
- apply migrations
- compute Grookai value

## Next Step

Proceed to `MEE-04C` only after choosing which source lanes are approved for fetching.

The first fetch job should be tiny, resumable, and raw-evidence-only.
