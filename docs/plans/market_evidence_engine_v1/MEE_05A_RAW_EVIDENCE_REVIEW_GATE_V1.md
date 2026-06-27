# MEE_05A_RAW_EVIDENCE_REVIEW_GATE_V1

## Status

Implemented as a local review-gate artifact generator.

No provider calls, source page fetches, database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Summarize raw local market evidence candidates before any warehouse or pricing write exists.

This checkpoint answers:

- how many targets produced candidate reference evidence
- how many targets still have no local evidence
- how many candidates are high-confidence reference matches
- how many candidates are blocked or ambiguous
- whether any candidate can accidentally publish a price directly

## Command

```powershell
npm run mee:review-gate -- --acquisition=docs/audits/market_evidence_engine_v1/<mee_04d>.json
```

If `--acquisition` is omitted, the latest local `MEE-04D` acquisition JSON is used.

## Boundary

The lane may:

- read local raw evidence JSON emitted by `MEE-04D`
- compute review dispositions
- count confidence hints, condition hints, target statuses, and exclusion flags
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

## Review Rule

Every candidate remains review-gated with `can_publish_price_directly = false`.

The review artifact can justify a future warehouse migration or a matching-improvement pass, but it cannot itself promote prices.

## Next Step

After review:

1. If coverage is strong enough, draft a schema-only reference evidence warehouse migration.
2. If no-match or ambiguous buckets are too large, improve matching and rerun `MEE-04D` and `MEE-05A`.
