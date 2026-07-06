# MEE_04A_SOURCE_REGISTRY_AND_EVIDENCE_CONTRACT_V1

## Status

Implemented as code, documentation, and contract tests only.

No provider calls, scraper jobs, database writes, pricing rollups, or migrations are performed by this checkpoint.

## Purpose

Define the first multi-source Market Evidence Engine contract before acquisition begins.

The goal is to gather evidence from multiple pricing lanes without letting any one source become Grookai value by accident.

## Source Registry

The registry is implemented in:

```text
backend/pricing/market_evidence_source_registry_v1.mjs
```

Initial sources:

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

Each source declares:

- source type
- acquisition mode
- pricing lane
- truth role
- whether it can publish price directly
- whether review is required before truth

Every source has:

```text
can_publish_price_directly = false
```

PriceCharting is intentionally modeled as an optional licensed/export benchmark lane, not a required engine dependency. The default next acquisition queues should prefer non-API or user-owned evidence lanes unless a PriceCharting run is explicitly requested.

## Evidence Object Contract

Every candidate evidence object must normalize into:

```text
card_print_id
gv_id
source
source_type
source_url
raw_title
raw_price
currency
condition_hint
finish_hint
observed_at
match_confidence_hint
exclusion_flags
needs_review
raw_payload
contract_version
can_publish_price_directly
```

This object is not pricing truth. It is a candidate evidence envelope for later warehouse storage, normalization, classification, and review.

## Evidence Lanes

### Market Evidence

Examples:

- active listings
- sold comp candidates

Use:

- identify current market availability
- identify possible sold-price evidence
- feed later classifier/model layers only after mapping and confidence checks

### Reference Evidence

Examples:

- JustTCG reference lane
- PokemonTCG.io embedded TCGplayer/Cardmarket price buckets
- TCGCSV TCGplayer product and price snapshots
- PriceCharting reference candidate
- TCGplayer product reference candidate
- user/admin-provided TCGplayer export rows

Use:

- sanity checks
- coverage hints
- cross-source corroboration

Reference evidence must not enter `pricing_observations` as market truth.

### Manual Review

Examples:

- high-value ambiguous evidence
- source pages with weak identity match
- cards where print-run/finish/stamp identity is unclear
- user/admin-provided eBay export rows that need classification

Use:

- preserve promising evidence without publishing it

## Explicit Non-Goals

MEE-04A does not:

- fetch eBay
- fetch PriceCharting
- fetch TCGplayer
- scrape pages
- insert warehouse rows
- write `pricing_observations`
- write `ebay_active_prices_latest`
- compute Grookai value
- apply migrations

## Next Step

Proceed to `MEE-04B`: generate a local multi-source query plan from the existing 5,000-target worklist.

MEE-04B should still avoid provider calls and database writes.
