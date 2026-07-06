# MEE_06B_TCGCSV_REFERENCE_EVIDENCE_V1

## Status

Implemented as a bounded public snapshot reference acquisition lane.

No database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Use TCGCSV as the second broad free reference provider for the Market Evidence Engine.

This lane reads TCGCSV TCGplayer group, product, and price snapshots and extracts USD price buckets only when a target has a strict group, card-number, and product-name match.

It does not claim Market Truth.

## Command

```powershell
npm run mee:tcgcsv -- --limit=100
```

If `--batch` is omitted, the latest local `MEE-04C` acquisition batch JSON is used.

Use `--refresh-cache` to force fresh TCGCSV snapshot downloads:

```powershell
npm run mee:tcgcsv -- --limit=100 --refresh-cache
```

## Evidence Extracted

From TCGCSV price rows:

- `marketPrice`
- `lowPrice`
- `midPrice`
- `highPrice`
- `directLowPrice`

Each positive price bucket remains a separate raw evidence candidate with:

- TCGCSV group ID and group name
- TCGplayer product ID and product URL
- product card number
- product rarity
- price subtype
- metric name
- Grookai target ID
- review-required state

## Boundary

The lane may:

- read an existing MEE-04C batch
- perform read-only set catalog lookup
- fetch public TCGCSV group, product, and price snapshots
- cache TCGCSV JSON snapshots under the audit directory
- write local audit JSON and Markdown artifacts

The lane must not:

- insert database rows
- update database rows
- upsert mappings
- compute Grookai value
- publish a price
- blend reference prices into Market Truth
- alter card identity, variant identity, image truth, or vault state

## Next Step

Run a small live batch and review:

- set group coverage
- strict product-match rate
- subtype coverage
- price bucket quality
- special-lane overmatching risk

After review, compare PokemonTCG.io and TCGCSV overlap before proposing any warehouse schema writes.
