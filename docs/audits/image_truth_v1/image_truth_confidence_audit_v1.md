# Image Truth Confidence Audit V1

Generated: 2026-06-23T04:25:31.358Z

Status: audit only. No DB writes. No migrations. No image promotion.

Contract: IMAGE_CONFIDENCE_CONTRACT_V1

## Summary

- english physical child printings: 38101
- english physical exact-required rows: 14959
- english physical display-covered rows: 38096
- english physical missing-display rows: 0
- english physical missing-variant-visual rows: 14856
- db_writes_performed: false
- migrations_created: false

## English Physical Confidence Counts

| confidence | rows |
| --- | --- |
| exact | 22486 |
| missing_variant_visual | 14856 |
| representative | 754 |
| blocked | 5 |

## English Physical Exact-Required Confidence Counts

| confidence | rows |
| --- | --- |
| missing_variant_visual | 14856 |
| exact | 57 |
| representative | 46 |

## Interpretation

`missing_variant_visual` means Grookai can show a safe card image, but must label it honestly because the exact finish, stamp, or parallel visual is not proven.

This gives Grookai high display coverage without falsely claiming exact variant imagery.

## First Missing Display Rows

_None._

## First Missing Variant Visual Rows

| set | number | card | finish | reason |
| --- | --- | --- | --- | --- |
| sv03.5 | 025 | Pikachu | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| sv8pt5 | 002 | Exeggutor | masterball | display_image_available_but_exact_finish_or_modifier_visual_missing |
| sv8pt5 | 002 | Exeggutor | pokeball | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 58 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 73 | Impostor Professor Oak | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base1 | 88 | Professor Oak | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base2 | 1 | Clefable | holo | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base2 | 60 | Pikachu | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base3 | 15 | Zapdos | cosmos | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base3 | 50 | Kabuto | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base4 | 102 | Imposter Professor Oak | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base4 | 116 | Professor Oak | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base5 | 19 | Dark Arbok | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base5 | 32 | Dark Charmeleon | normal | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base5 | 8 | Dark Gyarados | holo | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 1 | Alakazam | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 10 | Flareon | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 100 | Full Heal Energy | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 101 | Potion Energy | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 102 | Pokémon Breeder | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 103 | Pokémon Trader | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 104 | Scoop Up | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 105 | The Boss's Way | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 106 | Challenge! | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 107 | Energy Retrieval | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 108 | Bill | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 109 | Mysterious Fossil | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 11 | Gengar | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 110 | Potion | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 12 | Gyarados | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 13 | Hitmonlee | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 14 | Jolteon | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 15 | Machamp | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 16 | Muk | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 17 | Ninetales | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 18 | Venusaur | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 19 | Zapdos | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 2 | Articuno | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 20 | Beedrill | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 21 | Butterfree | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 22 | Electrode | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 23 | Exeggutor | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 24 | Golem | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 25 | Hypno | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
| base6 | 26 | Jynx | reverse | display_image_available_but_exact_finish_or_modifier_visual_missing |
