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
- `pricecharting_reference`
- `tcgplayer_reference_candidate`
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
- PriceCharting reference candidate
- TCGplayer product reference candidate

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
