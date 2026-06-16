# Image Truth Global Quality Upgrade Audit V1

Generated: 2026-06-16T20:26:41.552Z

Mode: audit only. No DB writes. No image uploads. No migrations.

## Summary

- child printing rows audited: 37651
- parent/base high-quality upgrade candidates: 17628
- deterministic no-probe candidates: 209
- candidates requiring HEAD probe: 17419
- visually distinct child rows still needing exact image review: 14311

## Parent Quality Buckets

| bucket | rows |
| --- | ---: |
| parent_tcgdex_high_to_pokemontcg_hires_candidate | 17102 |
| no_parent_quality_upgrade_candidate | 4080 |
| parent_missing_to_pokemontcg_hires_candidate | 317 |
| parent_tcgdex_non_high_to_tcgdex_high | 122 |
| parent_small_to_pokemontcg_hires | 87 |

## Child Exactness Buckets

| bucket | rows |
| --- | ---: |
| child_parent_display_ok_for_non_visual_finish | 22956 |
| child_exact_required_using_parent_or_missing | 14311 |
| child_has_image_no_quality_upgrade_candidate | 384 |

## Rules

- High-quality representative image upgrades do not prove exact finish or stamp imagery.
- Visually distinct child printings remain exact-child-image work even if parent image quality improves.
- No parent image overwrite is authorized by this audit.
- No DB writes, image uploads, migrations, deletes, merges, or cleanup were performed.

## Top Parent Upgrade Candidates

| set | number | card | bucket | current | candidate |
| --- | --- | --- | --- | --- | --- |
| base1 | 1 | Alakazam | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/1/high.webp | https://images.pokemontcg.io/base1/1_hires.png |
| base1 | 10 | Mewtwo | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/10/high.webp | https://images.pokemontcg.io/base1/10_hires.png |
| base1 | 100 | Lightning Energy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/100/high.webp | https://images.pokemontcg.io/base1/100_hires.png |
| base1 | 101 | Psychic Energy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/101/high.webp | https://images.pokemontcg.io/base1/101_hires.png |
| base1 | 102 | Water Energy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/102/high.webp | https://images.pokemontcg.io/base1/102_hires.png |
| base1 | 11 | Nidoking | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/11/high.webp | https://images.pokemontcg.io/base1/11_hires.png |
| base1 | 12 | Ninetales | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/12/high.webp | https://images.pokemontcg.io/base1/12_hires.png |
| base1 | 13 | Poliwrath | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/13/high.webp | https://images.pokemontcg.io/base1/13_hires.png |
| base1 | 14 | Raichu | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/14/high.webp | https://images.pokemontcg.io/base1/14_hires.png |
| base1 | 15 | Venusaur | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/15/high.webp | https://images.pokemontcg.io/base1/15_hires.png |
| base1 | 16 | Zapdos | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/16/high.webp | https://images.pokemontcg.io/base1/16_hires.png |
| base1 | 17 | Beedrill | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/17/high.webp | https://images.pokemontcg.io/base1/17_hires.png |
| base1 | 18 | Dragonair | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/18/high.webp | https://images.pokemontcg.io/base1/18_hires.png |
| base1 | 19 | Dugtrio | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/19/high.webp | https://images.pokemontcg.io/base1/19_hires.png |
| base1 | 2 | Blastoise | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/2/high.webp | https://images.pokemontcg.io/base1/2_hires.png |
| base1 | 20 | Electabuzz | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/20/high.webp | https://images.pokemontcg.io/base1/20_hires.png |
| base1 | 21 | Electrode | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/21/high.webp | https://images.pokemontcg.io/base1/21_hires.png |
| base1 | 22 | Pidgeotto | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/22/high.webp | https://images.pokemontcg.io/base1/22_hires.png |
| base1 | 23 | Arcanine | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/23/high.webp | https://images.pokemontcg.io/base1/23_hires.png |
| base1 | 24 | Charmeleon | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/24/high.webp | https://images.pokemontcg.io/base1/24_hires.png |
| base1 | 25 | Dewgong | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/25/high.webp | https://images.pokemontcg.io/base1/25_hires.png |
| base1 | 26 | Dratini | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/26/high.webp | https://images.pokemontcg.io/base1/26_hires.png |
| base1 | 27 | Farfetch'd | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/27/high.webp | https://images.pokemontcg.io/base1/27_hires.png |
| base1 | 28 | Growlithe | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/28/high.webp | https://images.pokemontcg.io/base1/28_hires.png |
| base1 | 29 | Haunter | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/29/high.webp | https://images.pokemontcg.io/base1/29_hires.png |
| base1 | 3 | Chansey | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/3/high.webp | https://images.pokemontcg.io/base1/3_hires.png |
| base1 | 30 | Ivysaur | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/30/high.webp | https://images.pokemontcg.io/base1/30_hires.png |
| base1 | 31 | Jynx | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/31/high.webp | https://images.pokemontcg.io/base1/31_hires.png |
| base1 | 32 | Kadabra | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/32/high.webp | https://images.pokemontcg.io/base1/32_hires.png |
| base1 | 33 | Kakuna | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/33/high.webp | https://images.pokemontcg.io/base1/33_hires.png |
| base1 | 34 | Machoke | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/34/high.webp | https://images.pokemontcg.io/base1/34_hires.png |
| base1 | 35 | Magikarp | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/35/high.webp | https://images.pokemontcg.io/base1/35_hires.png |
| base1 | 36 | Magmar | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/36/high.webp | https://images.pokemontcg.io/base1/36_hires.png |
| base1 | 37 | Nidorino | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/37/high.webp | https://images.pokemontcg.io/base1/37_hires.png |
| base1 | 38 | Poliwhirl | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/38/high.webp | https://images.pokemontcg.io/base1/38_hires.png |
| base1 | 39 | Porygon | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/39/high.webp | https://images.pokemontcg.io/base1/39_hires.png |
| base1 | 4 | Charizard | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/4/high.webp | https://images.pokemontcg.io/base1/4_hires.png |
| base1 | 40 | Raticate | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/40/high.webp | https://images.pokemontcg.io/base1/40_hires.png |
| base1 | 41 | Seel | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/41/high.webp | https://images.pokemontcg.io/base1/41_hires.png |
| base1 | 42 | Wartortle | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/42/high.webp | https://images.pokemontcg.io/base1/42_hires.png |
| base1 | 43 | Abra | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/43/high.webp | https://images.pokemontcg.io/base1/43_hires.png |
| base1 | 44 | Bulbasaur | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/44/high.webp | https://images.pokemontcg.io/base1/44_hires.png |
| base1 | 45 | Caterpie | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/45/high.webp | https://images.pokemontcg.io/base1/45_hires.png |
| base1 | 46 | Charmander | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/46/high.webp | https://images.pokemontcg.io/base1/46_hires.png |
| base1 | 47 | Diglett | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/47/high.webp | https://images.pokemontcg.io/base1/47_hires.png |
| base1 | 48 | Doduo | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/48/high.webp | https://images.pokemontcg.io/base1/48_hires.png |
| base1 | 49 | Drowzee | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/49/high.webp | https://images.pokemontcg.io/base1/49_hires.png |
| base1 | 5 | Clefairy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/5/high.webp | https://images.pokemontcg.io/base1/5_hires.png |
| base1 | 50 | Gastly | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/50/high.webp | https://images.pokemontcg.io/base1/50_hires.png |
| base1 | 51 | Koffing | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/51/high.webp | https://images.pokemontcg.io/base1/51_hires.png |
| base1 | 52 | Machop | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/52/high.webp | https://images.pokemontcg.io/base1/52_hires.png |
| base1 | 53 | Magnemite | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/53/high.webp | https://images.pokemontcg.io/base1/53_hires.png |
| base1 | 54 | Metapod | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/54/high.webp | https://images.pokemontcg.io/base1/54_hires.png |
| base1 | 55 | Nidoran ♂ | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/55/high.webp | https://images.pokemontcg.io/base1/55_hires.png |
| base1 | 56 | Onix | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/56/high.webp | https://images.pokemontcg.io/base1/56_hires.png |
| base1 | 57 | Pidgey | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/57/high.webp | https://images.pokemontcg.io/base1/57_hires.png |
| base1 | 58 | Pikachu | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/58/high.webp | https://images.pokemontcg.io/base1/58_hires.png |
| base1 | 59 | Poliwag | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/59/high.webp | https://images.pokemontcg.io/base1/59_hires.png |
| base1 | 6 | Gyarados | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/6/high.webp | https://images.pokemontcg.io/base1/6_hires.png |
| base1 | 60 | Ponyta | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/60/high.webp | https://images.pokemontcg.io/base1/60_hires.png |
| base1 | 61 | Rattata | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/61/high.webp | https://images.pokemontcg.io/base1/61_hires.png |
| base1 | 62 | Sandshrew | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/62/high.webp | https://images.pokemontcg.io/base1/62_hires.png |
| base1 | 63 | Squirtle | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/63/high.webp | https://images.pokemontcg.io/base1/63_hires.png |
| base1 | 64 | Starmie | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/64/high.webp | https://images.pokemontcg.io/base1/64_hires.png |
| base1 | 65 | Staryu | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/65/high.webp | https://images.pokemontcg.io/base1/65_hires.png |
| base1 | 66 | Tangela | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/66/high.webp | https://images.pokemontcg.io/base1/66_hires.png |
| base1 | 67 | Voltorb | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/67/high.webp | https://images.pokemontcg.io/base1/67_hires.png |
| base1 | 68 | Vulpix | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/68/high.webp | https://images.pokemontcg.io/base1/68_hires.png |
| base1 | 69 | Weedle | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/69/high.webp | https://images.pokemontcg.io/base1/69_hires.png |
| base1 | 7 | Hitmonchan | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/7/high.webp | https://images.pokemontcg.io/base1/7_hires.png |
| base1 | 70 | Clefairy Doll | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/70/high.webp | https://images.pokemontcg.io/base1/70_hires.png |
| base1 | 71 | Computer Search | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/71/high.webp | https://images.pokemontcg.io/base1/71_hires.png |
| base1 | 72 | Devolution Spray | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/72/high.webp | https://images.pokemontcg.io/base1/72_hires.png |
| base1 | 73 | Impostor Professor Oak | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/73/high.webp | https://images.pokemontcg.io/base1/73_hires.png |
| base1 | 74 | Item Finder | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/74/high.webp | https://images.pokemontcg.io/base1/74_hires.png |
| base1 | 75 | Lass | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/75/high.webp | https://images.pokemontcg.io/base1/75_hires.png |
| base1 | 76 | Pokémon Breeder | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/76/high.webp | https://images.pokemontcg.io/base1/76_hires.png |
| base1 | 77 | Pokémon Trader | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/77/high.webp | https://images.pokemontcg.io/base1/77_hires.png |
| base1 | 78 | Scoop Up | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/78/high.webp | https://images.pokemontcg.io/base1/78_hires.png |
| base1 | 79 | Super Energy Removal | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/79/high.webp | https://images.pokemontcg.io/base1/79_hires.png |
| base1 | 8 | Machamp | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/8/high.webp | https://images.pokemontcg.io/base1/8_hires.png |
| base1 | 80 | Defender | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/80/high.webp | https://images.pokemontcg.io/base1/80_hires.png |
| base1 | 81 | Energy Retrieval | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/81/high.webp | https://images.pokemontcg.io/base1/81_hires.png |
| base1 | 82 | Full Heal | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/82/high.webp | https://images.pokemontcg.io/base1/82_hires.png |
| base1 | 83 | Maintenance | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/83/high.webp | https://images.pokemontcg.io/base1/83_hires.png |
| base1 | 84 | PlusPower | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/84/high.webp | https://images.pokemontcg.io/base1/84_hires.png |
| base1 | 85 | Pokémon Center | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/85/high.webp | https://images.pokemontcg.io/base1/85_hires.png |
| base1 | 86 | Pokémon Flute | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/86/high.webp | https://images.pokemontcg.io/base1/86_hires.png |
| base1 | 87 | Pokédex | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/87/high.webp | https://images.pokemontcg.io/base1/87_hires.png |
| base1 | 88 | Professor Oak | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/88/high.webp | https://images.pokemontcg.io/base1/88_hires.png |
| base1 | 89 | Revive | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/89/high.webp | https://images.pokemontcg.io/base1/89_hires.png |
| base1 | 9 | Magneton | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/9/high.webp | https://images.pokemontcg.io/base1/9_hires.png |
| base1 | 90 | Super Potion | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/90/high.webp | https://images.pokemontcg.io/base1/90_hires.png |
| base1 | 91 | Bill | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/91/high.webp | https://images.pokemontcg.io/base1/91_hires.png |
| base1 | 92 | Energy Removal | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/92/high.webp | https://images.pokemontcg.io/base1/92_hires.png |
| base1 | 93 | Gust of Wind | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/93/high.webp | https://images.pokemontcg.io/base1/93_hires.png |
| base1 | 94 | Potion | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/94/high.webp | https://images.pokemontcg.io/base1/94_hires.png |
| base1 | 95 | Switch | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/95/high.webp | https://images.pokemontcg.io/base1/95_hires.png |
| base1 | 96 | Double Colorless Energy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/96/high.webp | https://images.pokemontcg.io/base1/96_hires.png |
| base1 | 97 | Fighting Energy | parent_tcgdex_high_to_pokemontcg_hires_candidate | https://assets.tcgdex.net/en/base/base1/97/high.webp | https://images.pokemontcg.io/base1/97_hires.png |

## Important Distinction

This report improves image quality candidates. It does not mark visually distinct finishes, stamps, or parallels as exact. Those still require exact child-printing image proof.

