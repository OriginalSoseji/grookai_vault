# MEE_06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1

## Status

Implemented as a bounded free-API reference acquisition lane.

No database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Use PokemonTCG.io as the first broad free reference provider for the Market Evidence Engine.

This lane extracts embedded TCGplayer USD and Cardmarket EUR price buckets from PokemonTCG.io card payloads and stores them only as local review-gated evidence artifacts.

It does not claim Market Truth.

## Command

```powershell
npm run mee:pokemontcg-io -- --limit=100
```

If `--batch` is omitted, the latest local `MEE-04C` acquisition batch JSON is used.

Fixture mode for contract-safe local testing:

```powershell
npm run mee:pokemontcg-io -- --batch=docs/audits/market_evidence_engine_v1/<batch>.json --fixture-cards=path/to/cards.json
```

## Evidence Extracted

From `tcgplayer.prices`:

- `market`
- `low`
- `mid`
- `high`
- `directLow`

From `cardmarket.prices`:

- all numeric price buckets provided in the card payload

Each bucket remains a separate raw evidence candidate with:

- provider
- variant
- metric
- currency
- provider update date
- source URL
- Grookai target ID
- review-required state

## Boundary

The lane may:

- read an existing MEE-04C batch
- perform read-only mapping lookup from `card_prints.external_ids` and `external_mappings`
- call PokemonTCG.io for mapped card payloads
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

- mapping coverage
- candidate evidence count
- missing PokemonTCG ID count
- cards with no embedded reference prices
- variant buckets that are too broad for special collector lanes

After the review, add the next broad reference lane: `tcgcsv_reference`.
