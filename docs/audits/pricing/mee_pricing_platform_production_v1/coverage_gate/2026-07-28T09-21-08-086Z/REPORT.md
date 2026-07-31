# TCGPlayer Market Production V1 Coverage

- Audit version: `TCGPLAYER_MARKET_COVERAGE_AUDIT_V1`
- Policy version: `TCGPLAYER_MARKET_COVERAGE_POLICY_V1`
- Source run: `TCGPLAYER-MARKET-SHADOW-FINAL-SHA-CYCLE3-20260728T0720Z-publication`
- Source commit: `958b14eaff091919d344d39517890f7a1fcb57e4`
- Status: `failed`
- Coverage: `90.712%`
- Required: `95%`
- Denominator: `34356`
- Numerator: `31165`
- Remaining gap rows: `3191`
- Exact rows needed to reach threshold: `1474`

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
| missing_active_source_mapping | 3019 |
| variant_assignment_not_exact_child_finish | 157 |
| missing_mapping_method | 15 |

## Weakest In-Scope Sets

| Source group | Coverage | Numerator | Denominator |
| --- | ---: | ---: | ---: |
| ME05: Pitch Black | 0% | 0 | 206 |
| SV: Shrouded Fable | 0% | 0 | 170 |
| McDonald's 25th Anniversary Promos | 0% | 0 | 50 |
| Professor Program Promos | 0% | 0 | 39 |
| Generations: Radiant Collection | 0% | 0 | 32 |
| Legendary Treasures: Radiant Collection | 0% | 0 | 25 |
| Burger King Promos | 0% | 0 | 24 |
| Countdown Calendar Promos | 0% | 0 | 19 |
| ME: 30th Celebration | 0% | 0 | 17 |
| MEE: Mega Evolution Energies | 0% | 0 | 16 |
| Pikachu World Collection Promos | 0% | 0 | 14 |
| First Partner Collection 2026 | 0% | 0 | 6 |
| SV: Black Bolt | 21.394% | 89 | 416 |
| SVE: Scarlet & Violet Energies | 26.316% | 15 | 57 |
| Nintendo Promos | 27.692% | 18 | 65 |
| ME: Mega Evolution Promo | 28.302% | 30 | 106 |
| Best of Promos | 33.333% | 5 | 15 |
| SV: Scarlet & Violet Promo Cards | 48.921% | 136 | 278 |
| ME: Ascended Heroes | 52.441% | 333 | 635 |
| SV: Prismatic Evolutions | 59.448% | 280 | 471 |
| SV: White Flare | 61.893% | 255 | 412 |
| Celebrations | 62.5% | 25 | 40 |
| SM Promos | 64.706% | 198 | 306 |
| Black and White Promos | 65% | 78 | 120 |
| HGSS Promos | 70.968% | 22 | 31 |
| Detective Pikachu | 75% | 18 | 24 |
| WoTC Promo | 75.758% | 50 | 66 |
| POP Series 4 | 78.261% | 18 | 23 |
| XY Promos | 81.277% | 191 | 235 |
| SWSH: Sword & Shield Promo Cards | 81.711% | 277 | 339 |

## Largest In-Scope Set Gaps

| Source group | Gap rows | Coverage | Numerator | Denominator |
| --- | ---: | ---: | ---: | ---: |
| SV: Black Bolt | 327 | 21.394% | 89 | 416 |
| ME: Ascended Heroes | 302 | 52.441% | 333 | 635 |
| ME05: Pitch Black | 206 | 0% | 0 | 206 |
| SV: Prismatic Evolutions | 191 | 59.448% | 280 | 471 |
| SV: Shrouded Fable | 170 | 0% | 0 | 170 |
| SV: White Flare | 157 | 61.893% | 255 | 412 |
| SV: Scarlet & Violet Promo Cards | 142 | 48.921% | 136 | 278 |
| SM Promos | 108 | 64.706% | 198 | 306 |
| ME: Mega Evolution Promo | 76 | 28.302% | 30 | 106 |
| SWSH: Sword & Shield Promo Cards | 62 | 81.711% | 277 | 339 |
| McDonald's 25th Anniversary Promos | 50 | 0% | 0 | 50 |
| SV02: Paldea Evolved | 48 | 89.744% | 420 | 468 |
| Nintendo Promos | 47 | 27.692% | 18 | 65 |
| XY Promos | 44 | 81.277% | 191 | 235 |
| Black and White Promos | 42 | 65% | 78 | 120 |
| SVE: Scarlet & Violet Energies | 42 | 26.316% | 15 | 57 |
| Professor Program Promos | 39 | 0% | 0 | 39 |
| SWSH01: Sword & Shield Base Set | 38 | 90.663% | 369 | 407 |
| Generations: Radiant Collection | 32 | 0% | 0 | 32 |
| SWSH09: Brilliant Stars | 31 | 90.909% | 310 | 341 |
| EX Unseen Forces | 28 | 88.525% | 216 | 244 |
| SM - Team Up | 28 | 92.201% | 331 | 359 |
| Legendary Treasures: Radiant Collection | 25 | 0% | 0 | 25 |
| SM Base Set | 25 | 92.038% | 289 | 314 |
| Burger King Promos | 24 | 0% | 0 | 24 |
| EX FireRed & LeafGreen | 23 | 90.336% | 215 | 238 |
| SWSH11: Lost Origin | 21 | 94.574% | 366 | 387 |
| Countdown Calendar Promos | 19 | 0% | 0 | 19 |
| SWSH: Crown Zenith | 19 | 93.471% | 272 | 291 |
| SM - Lost Thunder | 18 | 95.62% | 393 | 411 |

## Findings

- `coverage_below_required_threshold`
