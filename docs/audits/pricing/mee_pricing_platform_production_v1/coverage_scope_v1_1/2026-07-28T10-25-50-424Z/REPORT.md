# TCGPlayer Market Production V1 Coverage

- Audit version: `TCGPLAYER_MARKET_COVERAGE_AUDIT_V1_1`
- Policy version: `TCGPLAYER_MARKET_COVERAGE_POLICY_V1_1`
- Source run: `TCGPLAYER-MARKET-SHADOW-FINAL-SHA-CYCLE3-20260728T0720Z-publication`
- Source commit: `958b14eaff091919d344d39517890f7a1fcb57e4`
- Status: `failed`
- Coverage threshold status: `passed`
- Coverage: `95.177%`
- Required: `95%`
- Denominator: `32700`
- Numerator: `31123`
- Remaining gap rows: `1577`
- Exact rows needed to reach threshold: `0`

## Current Publication Boundary

- Current exact publication rows: `100`
- Current rows outside V1.1 scope: `2`
- Current publication scope status: `failed`

## Denominator

The denominator unit is one current TCGCSV source product/subtype price row.
It includes positive USD ordinary English Pokemon single-card candidates
with a supported V1 finish. Missing mapping evidence does not remove a row
from the denominator. V1.1 special-print lanes, unsupported object formats,
unsupported subtypes, nonpositive prices, and unusable source rows are
excluded by a versioned deterministic reason.

## Gap Reasons

| Reason | Rows |
| --- | ---: |
| missing_active_source_mapping | 1416 |
| variant_assignment_not_exact_child_finish | 149 |
| missing_mapping_method | 9 |
| unsupported_product_kind | 3 |

## Weakest In-Scope Sets

| Source group | Coverage | Numerator | Denominator |
| --- | ---: | ---: | ---: |
| ME05: Pitch Black | 0% | 0 | 194 |
| SV: Shrouded Fable | 0% | 0 | 167 |
| McDonald's 25th Anniversary Promos | 0% | 0 | 50 |
| Professor Program Promos | 0% | 0 | 39 |
| Generations: Radiant Collection | 0% | 0 | 32 |
| Legendary Treasures: Radiant Collection | 0% | 0 | 25 |
| Burger King Promos | 0% | 0 | 24 |
| Countdown Calendar Promos | 0% | 0 | 19 |
| MEE: Mega Evolution Energies | 0% | 0 | 16 |
| Pikachu World Collection Promos | 0% | 0 | 14 |
| First Partner Collection 2026 | 0% | 0 | 6 |
| ME: 30th Celebration | 0% | 0 | 5 |
| SV: Black Bolt | 34.902% | 89 | 255 |
| ME: Mega Evolution Promo | 36.486% | 27 | 74 |
| SVE: Scarlet & Violet Energies | 36.585% | 15 | 41 |
| Nintendo Promos | 47.368% | 18 | 38 |
| SV: Scarlet & Violet Promo Cards | 62.963% | 119 | 189 |
| Best of Promos | 71.429% | 5 | 7 |
| Celebrations | 78.125% | 25 | 32 |
| POP Series 4 | 78.261% | 18 | 23 |
| WoTC Promo | 79.365% | 50 | 63 |
| Black and White Promos | 85.714% | 78 | 91 |
| Detective Pikachu | 85.714% | 18 | 21 |
| Celebrations: Classic Collection | 88% | 22 | 25 |
| POP Series 1 | 88% | 22 | 25 |
| EX Unseen Forces | 88.525% | 216 | 244 |
| EX FireRed & LeafGreen | 90.336% | 215 | 238 |
| Kalos Starter Set | 90.566% | 48 | 53 |
| POP Series 2 | 92% | 23 | 25 |
| POP Series 3 | 92% | 23 | 25 |

## Largest In-Scope Set Gaps

| Source group | Gap rows | Coverage | Numerator | Denominator |
| --- | ---: | ---: | ---: | ---: |
| ME05: Pitch Black | 194 | 0% | 0 | 194 |
| SV: Shrouded Fable | 167 | 0% | 0 | 167 |
| SV: Black Bolt | 166 | 34.902% | 89 | 255 |
| SV: Scarlet & Violet Promo Cards | 70 | 62.963% | 119 | 189 |
| McDonald's 25th Anniversary Promos | 50 | 0% | 0 | 50 |
| ME: Mega Evolution Promo | 47 | 36.486% | 27 | 74 |
| Professor Program Promos | 39 | 0% | 0 | 39 |
| SV02: Paldea Evolved | 36 | 92.105% | 420 | 456 |
| Generations: Radiant Collection | 32 | 0% | 0 | 32 |
| SWSH01: Sword & Shield Base Set | 31 | 92.25% | 369 | 400 |
| EX Unseen Forces | 28 | 88.525% | 216 | 244 |
| SM - Team Up | 26 | 92.717% | 331 | 357 |
| SVE: Scarlet & Violet Energies | 26 | 36.585% | 15 | 41 |
| Legendary Treasures: Radiant Collection | 25 | 0% | 0 | 25 |
| Burger King Promos | 24 | 0% | 0 | 24 |
| EX FireRed & LeafGreen | 23 | 90.336% | 215 | 238 |
| SM Base Set | 22 | 92.926% | 289 | 311 |
| Nintendo Promos | 20 | 47.368% | 18 | 38 |
| Countdown Calendar Promos | 19 | 0% | 0 | 19 |
| SWSH: Sword & Shield Promo Cards | 19 | 93.066% | 255 | 274 |
| SM - Lost Thunder | 17 | 95.854% | 393 | 410 |
| SWSH09: Brilliant Stars | 17 | 94.801% | 310 | 327 |
| MEE: Mega Evolution Energies | 16 | 0% | 0 | 16 |
| SM - Ultra Prism | 15 | 95.017% | 286 | 301 |
| Pikachu World Collection Promos | 14 | 0% | 0 | 14 |
| Black and White Promos | 13 | 85.714% | 78 | 91 |
| EX Deoxys | 13 | 93.953% | 202 | 215 |
| WoTC Promo | 13 | 79.365% | 50 | 63 |
| EX Emerald | 12 | 94.258% | 197 | 209 |
| EX Holon Phantoms | 12 | 94.203% | 195 | 207 |

## Findings

- `current_publication_contains_v1_1_scope_exclusion`
