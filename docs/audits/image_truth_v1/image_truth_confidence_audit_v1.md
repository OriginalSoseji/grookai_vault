# Image Truth Confidence Audit V1

Generated: 2026-06-23T03:21:37.777Z

Status: audit only. No DB writes. No migrations. No image promotion.

Contract: IMAGE_CONFIDENCE_CONTRACT_V1

## Summary

- english physical child printings: 38101
- english physical exact-required rows: 14959
- english physical display-covered rows: 37977
- english physical missing-display rows: 119
- english physical missing-variant-visual rows: 14856
- db_writes_performed: false
- migrations_created: false

## English Physical Confidence Counts

| confidence | rows |
| --- | --- |
| exact | 22484 |
| missing_variant_visual | 14856 |
| representative | 637 |
| missing | 119 |
| blocked | 5 |

## English Physical Exact-Required Confidence Counts

| confidence | rows |
| --- | --- |
| missing_variant_visual | 14856 |
| exact | 55 |
| representative | 43 |
| missing | 5 |

## Interpretation

`missing_variant_visual` means Grookai can show a safe card image, but must label it honestly because the exact finish, stamp, or parallel visual is not proven.

This gives Grookai high display coverage without falsely claiming exact variant imagery.

## First Missing Display Rows

| set | number | card | finish | reason |
| --- | --- | --- | --- | --- |
| mep | 064 | Serperior | holo | no_safe_display_image_available |
| mep | 065 | Barbaracle | holo | no_safe_display_image_available |
| mep | 066 | Tyrantrum | holo | no_safe_display_image_available |
| mep | 067 | Doublade | holo | no_safe_display_image_available |
| misc | 1 | Ancient Mew | cosmos | no_safe_display_image_available |
| tk-bw-e | 1 | Lillipup | normal | no_safe_display_image_available |
| tk-bw-e | 10 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 11 | Timburr | normal | no_safe_display_image_available |
| tk-bw-e | 12 | Audino | normal | no_safe_display_image_available |
| tk-bw-e | 13 | Drilbur | normal | no_safe_display_image_available |
| tk-bw-e | 14 | Gurdurr | normal | no_safe_display_image_available |
| tk-bw-e | 15 | Potion | normal | no_safe_display_image_available |
| tk-bw-e | 16 | PlusPower | normal | no_safe_display_image_available |
| tk-bw-e | 17 | Excadrill | normal | no_safe_display_image_available |
| tk-bw-e | 18 | Audino | normal | no_safe_display_image_available |
| tk-bw-e | 19 | Herdier | normal | no_safe_display_image_available |
| tk-bw-e | 2 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 20 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 21 | Energy Search | normal | no_safe_display_image_available |
| tk-bw-e | 22 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 23 | Potion | normal | no_safe_display_image_available |
| tk-bw-e | 24 | Pokémon Communication | normal | no_safe_display_image_available |
| tk-bw-e | 25 | Drilbur | normal | no_safe_display_image_available |
| tk-bw-e | 26 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 27 | Lillipup | normal | no_safe_display_image_available |
| tk-bw-e | 28 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 29 | Timburr | normal | no_safe_display_image_available |
| tk-bw-e | 3 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 4 | Energy Switch | normal | no_safe_display_image_available |
| tk-bw-e | 5 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 6 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 7 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 8 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-e | 9 | Fighting Energy | normal | no_safe_display_image_available |
| tk-bw-z | 1 | Purrloin | normal | no_safe_display_image_available |
| tk-bw-z | 10 | Darkness Energy | normal | no_safe_display_image_available |
| tk-bw-z | 11 | PlusPower | normal | no_safe_display_image_available |
| tk-bw-z | 12 | Patrat | normal | no_safe_display_image_available |
| tk-bw-z | 13 | Zorua | normal | no_safe_display_image_available |
| tk-bw-z | 14 | Pidove | normal | no_safe_display_image_available |
| tk-bw-z | 15 | Tranquill | normal | no_safe_display_image_available |
| tk-bw-z | 16 | Energy Retrieval | normal | no_safe_display_image_available |
| tk-bw-z | 17 | Zoroark | normal | no_safe_display_image_available |
| tk-bw-z | 18 | Pokémon Communication | normal | no_safe_display_image_available |
| tk-bw-z | 19 | Minccino | normal | no_safe_display_image_available |
| tk-bw-z | 2 | Watchog | normal | no_safe_display_image_available |
| tk-bw-z | 20 | Darkness Energy | normal | no_safe_display_image_available |
| tk-bw-z | 21 | Pidove | normal | no_safe_display_image_available |
| tk-bw-z | 22 | Darkness Energy | normal | no_safe_display_image_available |
| tk-bw-z | 23 | Zorua | normal | no_safe_display_image_available |

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
