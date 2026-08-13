# MTG Pricing V1 Production Readiness

- Audit: `MTG_PRICING_READINESS_AUDIT_V1`
- Recorded at: `2026-08-13T17:57:05.644Z`
- Commit: `a7910ba60f43929874c5d1da9a43e44a71876176`
- Branch: `agent/mtg-pricing-readiness-v1`
- Result: **BLOCKED**
- Database writes: `0`

## Production Truth

- TCGPlayer Magic category: `1` (Magic: The Gathering)
- Active source groups: `453`
- Active source products: `117267`
- Products with images: `117267`
- Raw-single candidates from source card fields: `103714`
- Latest observed market date: `2026-08-13`
- Latest source price rows: `160858`
- Positive TCGPlayer marketPrice rows: `158310`
- Canonical MTG games: `0`
- Canonical MTG sets: `0`
- Canonical MTG card prints: `0`
- Exact MTG printing mappings: `0`
- Published MTG snapshots: `0`

## Finish Lanes

- `foil`: 64281 rows, 63424 positive market prices
- `normal`: 96577 rows, 94886 positive market prices

The source currently exposes Normal and Foil market lanes. Grookai's canonical finish vocabulary has Pokémon finishes but no `foil` key, so MTG finish mapping cannot reuse the current publication policy unchanged.

## Readiness Gates

| Gate | Status | Blocker |
|---|---|---|
| `mtg_source_category_current` | pass | none |
| `mtg_source_groups_present` | pass | none |
| `mtg_source_products_present` | pass | none |
| `mtg_current_market_prices_present` | pass | none |
| `mtg_canonical_game_present` | blocked | Grookai has no single canonical MTG game identity. |
| `mtg_canonical_sets_present` | blocked | Grookai has no canonical MTG sets. |
| `mtg_canonical_card_prints_present` | blocked | Grookai has no canonical MTG card prints. |
| `mtg_finish_vocabulary_present` | blocked | The canonical finish vocabulary does not yet contain both normal and foil MTG lanes. |
| `mtg_exact_source_mappings_present` | blocked | No exact MTG source-product to canonical-printing mappings exist. |
| `mtg_publication_isolated` | pass | none |

## Decision

The MTG source catalog and current market prices are already warehoused and fresh. The canonical MTG product does not yet exist in Grookai: there is no MTG game, set, card-print, printing, or exact source mapping lane. Source rows are evidence, not canonical identity, and must not be published through name matching.

Exact next gate: **mtg_canonical_catalog_import_contract**.

That gate must define the MTG canonical source, immutable card identity, treatment-versus-finish model, language policy, image authority, and exact TCGPlayer product mapping before any write plan is produced.

## Boundaries

- The production snapshot ran inside a read-only transaction.
- No migration, canonical import, mapping, price publication, client change, or scheduler change occurred.
- Sealed products, slabs, non-English cards, treatments, and ambiguous products remain source evidence only.

