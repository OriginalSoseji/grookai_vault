# MEE_04D_PRICECHARTING_CSV_RAW_EVIDENCE_V1

## Status

Implemented as a local CSV raw-evidence acquisition lane.

No provider calls, source page fetches, database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Use the locally staged PriceCharting Pokemon CSV as the first overnight-capable acquisition lane.

This is raw reference evidence only. It does not create Grookai market value, does not update public pricing, and does not write database rows.

## Command

```powershell
npm run mee:pricecharting-csv -- --batch=docs/audits/market_evidence_engine_v1/<batch>.json
```

If `--batch` is omitted, the latest local `MEE-04C` batch JSON is used.

## Overnight Shape

```powershell
npm run mee:acquisition-batch -- --limit=5000 --sources=pricecharting_reference
npm run mee:pricecharting-csv
```

The output JSON is intentionally ignored by git. The Markdown proof is small enough to track.

## Boundary

The lane may:

- read a local PriceCharting CSV file
- read `sets` as a set-code to set-name catalog when available
- emit local `MARKET_EVIDENCE_OBJECT_CONTRACT_V1` candidates
- preserve raw source title, source URL, raw price, condition hint, match confidence, and review flags

The lane must not:

- fetch PriceCharting pages
- call eBay
- call TCGplayer
- call JustTCG
- insert rows
- update rows
- apply migrations
- compute Grookai value
- publish a price

## Review Rule

Every candidate remains review-gated with `can_publish_price_directly = false`.

PriceCharting reference prices can corroborate a future model, but they are not Grookai market truth by themselves.
