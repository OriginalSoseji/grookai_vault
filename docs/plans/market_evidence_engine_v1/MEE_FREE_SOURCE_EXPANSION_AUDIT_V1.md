# MEE_FREE_SOURCE_EXPANSION_AUDIT_V1

## Status

Research and source-registry planning only.

No database writes, provider calls, source fetches, app-visible pricing, public price rollups, identity writes, vault writes, image writes, deletes, merges, migrations, or global apply were executed.

## Why This Exists

The current free-reference warehouse coverage is too small to be the long-term pricing foundation by itself:

- `market_reference_normalized_evidence`: 21,745 rows
- unique card prints covered: 993
- total card-print coverage: 3.64%
- current promoted reference sources: `tcgcsv_reference`, `pokemontcg_io_reference`

TCGdex raw imports already contain pricing payloads, but the MEE reference normalizer does not currently promote them into `market_reference_*`.

## Immediate Source Candidates

### 1. TCGdex Market Pricing

Priority: P0

Status in Grookai:

- Already integrated for catalog, images, external mappings, traits, and printings.
- Existing raw imports already contain `card.pricing`.
- Current sampled/probed DB state:
  - TCGdex card raw imports: 22,540
  - rows with pricing: 22,539
  - rows with `pricing.tcgplayer`: 14,419
  - rows with `pricing.cardmarket`: 18,618
  - TCGdex external mappings: 22,669

Evidence type:

- Structured reference market evidence.
- Not market truth.
- Must stay internal until Grookai gates it.

Required MEE adapter:

- `tcgdex_reference`
- `tcgdex_tcgplayer_reference`
- `tcgdex_cardmarket_reference`

Source URL:

- https://tcgdex.dev/markets-prices
- https://api.tcgdex.net/v2/en/cards/{tcgdex_card_id}

Recommended action:

Build a local dry-run normalizer from existing `raw_imports.source = 'tcgdex'` into `market_reference_candidates` and `market_reference_normalized_evidence`.

### 2. PokemonTCG.io / Scrydex Pricing

Priority: P0/P1

Status in Grookai:

- Already promoted as `pokemontcg_io_reference`.
- Current coverage is only 753 unique card prints, likely because prior run was scoped and/or mapping constrained.

Evidence type:

- Structured reference evidence.
- Contains TCGPlayer and Cardmarket price payloads when available.
- Not market truth.

Source URL:

- https://pokemontcg.io/
- https://docs.pokemontcg.io/
- https://api.pokemontcg.io/v2/cards/{pokemon_tcg_card_id}

Recommended action:

Run a full mapping audit against existing `external_mappings` and `card_prints.tcgplayer_id`, then backfill all eligible mapped PokemonTCG.io card IDs into the reference warehouse.

### 3. TCGCSV

Priority: P1

Status in Grookai:

- Already promoted as `tcgcsv_reference`.
- Current unique coverage is 993 card prints.

Evidence type:

- Structured reference evidence.
- Useful where TCGPlayer product IDs and CSV rows align.
- Not market truth.

Source URL:

- https://tcgcsv.com/

Recommended action:

Keep, but rerun after TCGdex/PokemonTCG.io expansion to compare product ID coverage and identify unmapped rows.

## Active Market Evidence Sources

### 4. eBay Browse API

Priority: P1

Status in Grookai:

- Already integrated as `ebay_active`.
- Nightly worker is installed on the droplet.
- Evidence is active asking price only.

Evidence type:

- Active listing ask evidence.
- Good for availability, seller behavior, slabs, rare/promotional cards, and special lanes.
- Not sold comps.
- Not market truth.

Source URL:

- https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search

Recommended action:

Keep as a broad liquidity/active-ask source, but do not use as the only valuation anchor.

### 5. eBay Sold / Marketplace Insights

Priority: P2, access-dependent

Status in Grookai:

- Not currently available through the normal Browse API lane.

Evidence type:

- Sold comp evidence if approved access exists.
- Stronger than active listing evidence.

Recommended action:

Treat as a future source requiring official API access review. Do not scrape sold pages as a foundation.

## Possible Future Sources Requiring Review

### 6. TCGPlayer Direct API

Priority: P1/P2

Evidence type:

- Structured North American market reference.

Concern:

- Requires direct API/developer access and terms review.

Source URL:

- https://docs.tcgplayer.com/docs/getting-started
- https://help.tcgplayer.com/hc/en-us/articles/201577976-How-can-I-get-access-to-your-card-pricing-data

Recommended action:

Apply for access or use only through approved derived sources such as TCGdex/PokemonTCG.io where permitted.

### 7. Cardmarket Direct API

Priority: P2/P3

Evidence type:

- European market reference.

Concern:

- Direct API access may not be generally available.
- Prefer TCGdex/PokemonTCG.io Cardmarket-derived fields until direct access is approved.

Source URL:

- https://help.cardmarket.com/en/cardmarket-api

Recommended action:

Do not build a direct adapter unless API access is approved. Use derived Cardmarket fields from approved sources as internal reference evidence.

### 8. PriceCharting

Priority: historical/internal only

Evidence type:

- Reference pricing if paid API remains available.

Concern:

- User goal is to avoid ongoing dependency.

Recommended action:

Keep historical data. Do not make it required for public pricing.

## Sources To Avoid As Foundation

These may be useful for manual research, but should not become automated MEE adapters without explicit legal/terms review:

- scraping TCGPlayer pages
- scraping Cardmarket pages
- scraping 130point/eBay sold-search aggregators
- scraping Collectr/PokeData/Card Ladder-style dashboards
- screenshots or browser-only price scraping
- user-upload-only pricing as primary valuation

Reason:

They are brittle, may violate terms, lack stable replay provenance, or create licensing risk.

## Proposed MEE Source Registry Expansion

Add source registry entries:

```text
tcgdex_reference
tcgdex_tcgplayer_reference
tcgdex_cardmarket_reference
pokemontcg_io_reference_full_refresh
tcgcsv_reference_refresh
ebay_active
ebay_sold_comp_future_access
tcgplayer_direct_future_access
cardmarket_direct_future_access
```

## Recommended Implementation Order

1. Create `MEE-TCGDEX-REFERENCE-PRICING-AUDIT-V1`.
2. Prove exact TCGdex raw payload to `card_print_id` coverage.
3. Build dry-run normalizer for TCGdex pricing.
4. Backfill TCGdex pricing into `market_reference_*` as internal/reference-only evidence.
5. Refresh reference signal rollups.
6. Rerun publication-gate candidate view.
7. Audit remaining gaps.
8. Only then decide whether additional external sources are needed.

## Non-Negotiable Boundaries

- No provider creates price truth.
- TCGdex does not publish prices directly.
- PokemonTCG.io does not publish prices directly.
- TCGCSV does not publish prices directly.
- eBay active listings do not publish prices directly.
- Every source creates evidence only.
- Grookai owns normalization, matching, quality scoring, confidence, rollups, publication gates, replay, and public display.

