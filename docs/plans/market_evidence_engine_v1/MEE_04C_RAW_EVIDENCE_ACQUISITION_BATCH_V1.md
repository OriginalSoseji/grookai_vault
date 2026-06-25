# MEE_04C_RAW_EVIDENCE_ACQUISITION_BATCH_V1

## Status

Implemented as a dry-run acquisition batch generator.

No provider calls, source fetches, database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Turn the MEE-04B multi-source query plan into a small, resumable queue of raw-evidence acquisition tasks.

This is still not pricing. It is an execution-control layer that says which source/card tasks would be attempted first once a source lane and access method are approved.

## Command

```powershell
node scripts/audits/market_evidence_engine_acquisition_batch_v1.mjs --limit=100
```

Equivalent npm script:

```powershell
npm run mee:acquisition-batch -- --limit=100
```

Optional source selection:

```powershell
npm run mee:acquisition-batch -- --limit=100 --sources=pricecharting_reference,tcgplayer_reference_candidate
```

## Default Sources

The default batch excludes eBay lanes until an approved access method is selected.

Default lanes:

- `pricecharting_reference`
- `tcgplayer_reference_candidate`
- `justtcg_reference`
- `manual_review_candidate`

## Boundary

The batch may include:

- source name
- acquisition mode
- query text
- source URL template
- inclusion hints
- exclusion hints
- target card identity
- queued-not-fetched status

The batch must not:

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
- publish a price

## Next Step

Proceed to a tiny approved fetch implementation only after selecting one source lane and confirming the allowed access method.

The first fetch implementation should write raw evidence candidates only and should keep every candidate behind review, with `can_publish_price_directly = false`.
