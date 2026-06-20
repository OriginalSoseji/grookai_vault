# TCGMAP-02 Pricing Readiness V1

Audit-only pricing readiness after TCGMAP-01A. No DB writes, no migrations, no cleanup, no pricing writes.

## Summary

- fingerprint: `fd1764b115a85ab46019b0b2ca6070f97c70623efec0d0eb2e17495b13974f1d`
- generated_at: `2026-06-19T14:43:26.510Z`
- english_physical_parent_rows: 22884
- parents_with_tcgplayer: 20056
- parents_with_justtcg: 19753
- parents_with_neither_tcgplayer_nor_justtcg: 1534
- child_printings_total: 37646
- child_printings_under_tcgplayer_parent: 34908

## Readiness Buckets

| status | parents | children | sets |
| --- | --- | --- | --- |
| tcgplayer_parent_reference_variant_split_required | 13804 | 28706 | 138 |
| tcgplayer_parent_price_direct_single_child | 6252 | 6202 | 170 |
| justtcg_only | 1294 | 1339 | 60 |
| no_pricing_mapping | 774 | 307 | 116 |
| tcgdex_only_no_tcgplayer_product | 760 | 1092 | 89 |

## Pricing Interpretation

- `tcgplayer_parent_price_direct_single_child`: safest parent-level rows for immediate market reference display.
- `tcgplayer_parent_reference_variant_split_required`: usable as parent/reference pricing, but not exact child variant pricing until finish/product separation is proven.
- `justtcg_only`, `pricecharting_only`, and `tcgdex_only_no_tcgplayer_product`: future mapping/acquisition lanes.
- `no_pricing_mapping`: no current pricing source mapping on the parent row.

## Highest Variant-Split Risk Sets

| set | name | parents | children | finishes |
| --- | --- | --- | --- | --- |
| sm12 | Cosmic Eclipse | 545 | 1105 | cracked_ice, holo, normal, reverse |
| sm11 | Unified Minds | 525 | 1089 | cosmos, cracked_ice, holo, normal, reverse |
| me02.5 | Ascended Heroes | 503 | 1461 | cosmos, holo, normal, pokeball, reverse, rocket_reverse |
| sm10 | Unbroken Bonds | 475 | 985 | cosmos, cracked_ice, holo, normal, reverse |
| swsh8 | Fusion Strike | 468 | 962 | cosmos, holo, normal, reverse |
| sm8 | Lost Thunder | 459 | 959 | cosmos, cracked_ice, holo, normal, reverse |
| sv08.5 | Prismatic Evolutions | 440 | 1120 | holo, normal, reverse |
| sm9 | Team Up | 387 | 797 | cosmos, cracked_ice, holo, normal, reverse |
| sv03 | Obsidian Flames | 372 | 808 | cosmos, holo, normal, reverse |
| sv01 | Scarlet & Violet | 371 | 745 | holo, normal, reverse |
| sm7 | Celestial Storm | 367 | 755 | cosmos, cracked_ice, holo, normal, reverse |
| sm3 | Burning Shadows | 349 | 731 | cosmos, cracked_ice, holo, normal, reverse |
| sm1 | Sun & Moon | 347 | 759 | cosmos, cracked_ice, holo, normal, reverse |
| sv02 | Paldea Evolved | 347 | 751 | cosmos, holo, normal, reverse |
| sv10 | Destined Rivals | 346 | 744 | cosmos, holo, normal, reverse |
| swsh1 | Sword & Shield | 345 | 775 | cosmos, cracked_ice, holo, normal, reverse |
| sm2 | Guardians Rising | 345 | 711 | cosmos, cracked_ice, holo, normal, reverse |
| sv08 | Surging Sparks | 333 | 675 | holo, normal, reverse |
| sm5 | Ultra Prism | 331 | 677 | cracked_ice, holo, normal, reverse |
| ecard1 | Expedition Base Set | 326 | 652 | holo, normal, reverse |
| sv04 | Paradox Rift | 324 | 648 | holo, normal, reverse |
| sv03.5 | 151 | 319 | 677 | cosmos, holo, normal, reverse |
| swsh2 | Rebel Clash | 314 | 672 | cosmos, cracked_ice, holo, normal, reverse |
| swsh3 | Darkness Ablaze | 313 | 655 | cosmos, cracked_ice, holo, normal, reverse |
| xy8 | BREAKthrough | 312 | 678 | cosmos, cracked_ice, holo, normal, reverse |

## TCGMAP-01A Impact

- inserted_mappings: 3066
- active_tcgplayer_before_tcgmap01a: 14118
- active_tcgplayer_after_tcgmap01a: 17184

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- pricing_writes_performed: false
- image_writes_performed: false

## Recommended Next Step

Build `TCGMAP-03` as a read-only source acquisition plan for the remaining no-TCGplayer rows, prioritizing `justtcg_only` and `tcgdex_only_no_tcgplayer_product` before touching harder no-mapping rows.

