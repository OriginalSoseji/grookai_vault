# MEE_05B_RAW_EVIDENCE_GAP_ANALYSIS_V1

## Status

Implemented as a local gap-analysis artifact generator.

No provider calls, source page fetches, database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Diagnose the remaining raw evidence gaps after `MEE-05A`.

This checkpoint separates no-match targets into actionable buckets:

- no matching card name in the local PriceCharting CSV
- card name exists, but printed number does not match
- card name and number exist, but set alias or variant matching blocked the match
- card name exists with a prefixed source number, such as promo-style `BW01` vs Grookai `01`

It also summarizes ambiguous and wrong-print-run candidates so variant-labeled rows stay review-gated.

## Command

```powershell
npm run mee:gap-analysis -- --acquisition=docs/audits/market_evidence_engine_v1/<mee_04d>.json
```

If `--acquisition` is omitted, the latest local `MEE-04D` acquisition JSON is used.

## Boundary

The lane may:

- read local raw evidence JSON emitted by `MEE-04D`
- read the locally staged PriceCharting CSV
- compute no-match and ambiguity buckets
- emit local JSON and Markdown proof artifacts

The lane must not:

- fetch provider pages
- call eBay
- call PriceCharting
- call TCGplayer
- call JustTCG
- insert rows
- update rows
- apply migrations
- compute Grookai value
- publish a price

## Next Step

Use this artifact to choose between:

1. a targeted alias/matching improvement pass, or
2. a schema-only warehouse draft for already review-gated reference evidence.
