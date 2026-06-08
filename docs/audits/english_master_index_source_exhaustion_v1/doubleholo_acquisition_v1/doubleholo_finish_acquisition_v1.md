# Double Holo Finish Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Generated: 2026-05-27T16:29:37.798Z

## Summary

| metric | value |
| --- | --- |
| sets_attempted | 113 |
| records_generated | 52 |
| finish_presence_records | 52 |
| manual_review_context_records | 0 |
| fixture_files_written | 19 |
| by_status | {"generated":19,"no_matching_variant_rows":77,"source_error":17} |

## Rule

Double Holo finish_presence evidence is emitted only for exact card-number/name matches with explicit bracketed finish labels. Unbracketed holo_rare rows are retained only as finish_context_holo_rare manual-review evidence.

## Sets

| set_key | set_name | status | target_facts | source_rows | records_generated | finish_presence | manual_review_context | source_url | error |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ex8 | Deoxys | generated | 98 | 111 | 14 | 14 | 0 | https://doubleholo.com/sets/pokemon-deoxys |  |
| pl3 | Supreme Victors | no_matching_variant_rows | 94 | 113 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-supreme-victors |  |
| ex6 | FireRed & LeafGreen | no_matching_variant_rows | 88 | 117 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-fire-red-and-leaf-green |  |
| ex9 | Emerald | no_matching_variant_rows | 83 | 102 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-emerald |  |
| ex5 | Hidden Legends | generated | 81 | 110 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-hidden-legends |  |
| ex7 | Team Rocket Returns | no_matching_variant_rows | 81 | 114 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-team-rocket-returns |  |
| sv05 | Temporal Forces | no_matching_variant_rows | 40 | 99 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-temporal-forces |  |
| swsh8 | Fusion Strike | generated | 40 | 98 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-fusion-strike |  |
| me01 | Mega Evolution | generated | 39 | 96 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-mega-evolution |  |
| swsh9 | Brilliant Stars | no_matching_variant_rows | 38 | 86 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-brilliant-stars |  |
| swsh7 | Evolving Skies | generated | 34 | 103 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-evolving-skies |  |
| sve | Scarlet & Violet Energies | source_error | 32 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-scarlet-violet-energies \| https://doubleholo.com/sets/pokemon-scarlet-and-violet-energies | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-scarlet-violet-energies \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-scarlet-and-violet-energies |
| swsh5 | Battle Styles | no_matching_variant_rows | 32 | 104 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-battle-styles |  |
| swsh6 | Chilling Reign | generated | 32 | 112 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-chilling-reign |  |
| sv02 | Paldea Evolved | generated | 31 | 98 | 4 | 4 | 0 | https://doubleholo.com/sets/pokemon-paldea-evolved |  |
| swsh1 | Sword & Shield | no_matching_variant_rows | 31 | 104 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-sword-and-shield |  |
| swsh10 | Astral Radiance | generated | 30 | 88 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-astral-radiance |  |
| swsh11 | Lost Origin | no_matching_variant_rows | 29 | 96 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-lost-origin |  |
| sv09 | Journey Together | no_matching_variant_rows | 26 | 95 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-journey-together |  |
| sv10 | Destined Rivals | no_matching_variant_rows | 23 | 98 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-destined-rivals |  |
| swsh12 | Silver Tempest | no_matching_variant_rows | 20 | 85 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-silver-tempest |  |
| svp | Scarlet & Violet Black Star Promos | source_error | 19 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-scarlet-violet-promos \| https://doubleholo.com/sets/pokemon-scarlet-and-violet-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-scarlet-violet-promos \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-scarlet-and-violet-black-star-promos |
| bw1 | Black & White | no_matching_variant_rows | 17 | 113 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-black-and-white |  |
| sv03.5 | 151 | source_error | 15 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-151 | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-151 |
| swsh2 | Rebel Clash | generated | 14 | 106 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-rebel-clash |  |
| swsh12.5 | Crown Zenith | no_matching_variant_rows | 13 | 66 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-crown-zenith |  |
| sm1 | Sun & Moon | no_matching_variant_rows | 12 | 110 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-sun-and-moon |  |
| sv06.5 | Shrouded Fable | no_matching_variant_rows | 12 | 57 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-shrouded-fable |  |
| smp | SM Black Star Promos | source_error | 11 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-sun-moon-promos \| https://doubleholo.com/sets/pokemon-sm-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-sun-moon-promos \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-sm-black-star-promos |
| sv07 | Stellar Crown | no_matching_variant_rows | 11 | 96 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-stellar-crown |  |
| hgss1 | HeartGold & SoulSilver | source_error | 10 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-heartgold-soulsilver \| https://doubleholo.com/sets/pokemon-heart-gold-and-soul-silver | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-heartgold-soulsilver \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-heart-gold-and-soul-silver |
| sm8 | Lost Thunder | no_matching_variant_rows | 10 | 108 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-lost-thunder |  |
| sv08.5 | Prismatic Evolutions | no_matching_variant_rows | 10 | 95 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-prismatic-evolutions |  |
| swsh4 | Vivid Voltage | no_matching_variant_rows | 10 | 110 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-vivid-voltage |  |
| 2022swsh | McDonald's Collection 2022 | source_error | 9 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-mcdonalds-collection-2022 \| https://doubleholo.com/sets/pokemon-mc-donald-s-collection-2022 | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-mcdonalds-collection-2022 \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-mc-donald-s-collection-2022 |
| dp5 | Majestic Dawn | generated | 9 | 119 | 7 | 7 | 0 | https://doubleholo.com/sets/pokemon-majestic-dawn |  |
| ex1 | Ruby & Sapphire | generated | 9 | 112 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-ruby-and-sapphire |  |
| pl2 | Rising Rivals | no_matching_variant_rows | 9 | 111 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-rising-rivals |  |
| sm115 | Hidden Fates | no_matching_variant_rows | 9 | 137 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-hidden-fates |  |
| bw5 | Dark Explorers | no_matching_variant_rows | 8 | 100 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-dark-explorers |  |
| col1 | Call of Legends | no_matching_variant_rows | 8 | 124 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-call-of-legends |  |
| dp1 | Diamond & Pearl | generated | 8 | 115 | 6 | 6 | 0 | https://doubleholo.com/sets/pokemon-diamond-and-pearl |  |
| dp6 | Legends Awakened | generated | 8 | 114 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-legends-awakened |  |
| hgss2 | HS—Unleashed | source_error | 8 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-hs-unleashed | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-hs-unleashed |
| sv03 | Obsidian Flames | no_matching_variant_rows | 8 | 105 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-obsidian-flames |  |
| swsh3 | Darkness Ablaze | no_matching_variant_rows | 8 | 106 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-darkness-ablaze |  |
| swshp | SWSH Black Star Promos | source_error | 8 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-sword-shield-promos \| https://doubleholo.com/sets/pokemon-swsh-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-sword-shield-promos \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-swsh-black-star-promos |
| xy1 | XY | no_matching_variant_rows | 8 | 109 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-xy |  |
| bwp | BW Black Star Promos | source_error | 7 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-black-white-promos \| https://doubleholo.com/sets/pokemon-bw-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-black-white-promos \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-bw-black-star-promos |
| ex3 | Dragon | no_matching_variant_rows | 7 | 100 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-dragon |  |
| sm3 | Burning Shadows | no_matching_variant_rows | 7 | 102 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-burning-shadows |  |
| sm5 | Ultra Prism | no_matching_variant_rows | 7 | 106 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-ultra-prism |  |
| dp4 | Great Encounters | generated | 6 | 112 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-great-encounters |  |
| sm11 | Unified Minds | no_matching_variant_rows | 6 | 108 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-unified-minds |  |
| sm6 | Forbidden Light | no_matching_variant_rows | 6 | 104 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-forbidden-light |  |
| swsh3.5 | Champion's Path | no_matching_variant_rows | 6 | 64 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-champions-path |  |
| xy8 | BREAKthrough | no_matching_variant_rows | 6 | 107 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-breakthrough |  |
| ex10 | Unseen Forces | generated | 5 | 120 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-unseen-forces |  |
| ex11 | Delta Species | no_matching_variant_rows | 5 | 115 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-delta-species |  |
| sm7 | Celestial Storm | no_matching_variant_rows | 5 | 108 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-celestial-storm |  |
| sv06 | Twilight Masquerade | no_matching_variant_rows | 5 | 100 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-twilight-masquerade |  |
| xy11 | Steam Siege | no_matching_variant_rows | 5 | 100 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-steam-siege |  |
| xy2 | Flashfire | no_matching_variant_rows | 5 | 100 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-flashfire |  |
| bw3 | Noble Victories | no_matching_variant_rows | 4 | 108 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-noble-victories |  |
| bw8 | Plasma Storm | no_matching_variant_rows | 4 | 106 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-plasma-storm |  |
| dp3 | Secret Wonders | no_matching_variant_rows | 4 | 121 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-secret-wonders |  |
| ex14 | Crystal Guardians | no_matching_variant_rows | 4 | 111 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-crystal-guardians |  |
| hgss4 | HS—Triumphant | source_error | 4 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-hs-triumphant | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-hs-triumphant |
| pl1 | Platinum | no_matching_variant_rows | 4 | 116 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-platinum |  |
| sm10 | Unbroken Bonds | generated | 4 | 109 | 2 | 2 | 0 | https://doubleholo.com/sets/pokemon-unbroken-bonds |  |
| sm2 | Guardians Rising | no_matching_variant_rows | 4 | 105 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-guardians-rising |  |
| sv04 | Paradox Rift | no_matching_variant_rows | 4 | 114 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-paradox-rift |  |
| swsh4.5 | Shining Fates | no_matching_variant_rows | 4 | 133 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-shining-fates |  |
| xy9 | BREAKpoint | no_matching_variant_rows | 4 | 98 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-breakpoint |  |
| xyp | XY Black Star Promos | no_matching_variant_rows | 4 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-xy-promos |  |
| basep | Wizards Black Star Promos | source_error | 3 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-wizards-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-wizards-black-star-promos |
| bw2 | Emerging Powers | no_matching_variant_rows | 3 | 111 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-emerging-powers |  |
| bw6 | Dragons Exalted | no_matching_variant_rows | 3 | 111 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-dragons-exalted |  |
| dpp | DP Black Star Promos | source_error | 3 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-diamond-pearl-promos \| https://doubleholo.com/sets/pokemon-dp-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-diamond-pearl-promos \| Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-dp-black-star-promos |
| ex2 | Sandstorm | generated | 3 | 108 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-sandstorm |  |
| ex4 | Team Magma vs Team Aqua | source_error | 3 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-team-magma-vs-team-aqua | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-team-magma-vs-team-aqua |
| g1 | Generations | generated | 3 | 77 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-generations |  |
| hgss3 | HS—Undaunted | source_error | 3 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-hs-undaunted | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-hs-undaunted |
| sm12 | Cosmic Eclipse | no_matching_variant_rows | 3 | 103 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-cosmic-eclipse |  |
| sm4 | Crimson Invasion | no_matching_variant_rows | 3 | 104 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-crimson-invasion |  |
| xy12 | Evolutions | no_matching_variant_rows | 3 | 97 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-evolutions |  |
| xy3 | Furious Fists | no_matching_variant_rows | 3 | 105 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-furious-fists |  |
| bw11 | Legendary Treasures | no_matching_variant_rows | 2 | 110 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-legendary-treasures |  |
| bw7 | Boundaries Crossed | no_matching_variant_rows | 2 | 116 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-boundaries-crossed |  |
| bw9 | Plasma Freeze | no_matching_variant_rows | 2 | 109 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-plasma-freeze |  |
| ex12 | Legend Maker | no_matching_variant_rows | 2 | 97 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-legend-maker |  |
| pl4 | Arceus | no_matching_variant_rows | 2 | 116 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-arceus |  |
| sm7.5 | Dragon Majesty | no_matching_variant_rows | 2 | 68 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-dragon-majesty |  |
| sv04.5 | Paldean Fates | no_matching_variant_rows | 2 | 87 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-paldean-fates |  |
| sv10.5b | Black Bolt | no_matching_variant_rows | 2 | 106 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-black-bolt |  |
| swsh10.5 | Pokémon GO | source_error | 2 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-pok-mon-go | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-pok-mon-go |
| xy10 | Fates Collide | no_matching_variant_rows | 2 | 94 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-fates-collide |  |
| xy4 | Phantom Forces | no_matching_variant_rows | 2 | 110 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-phantom-forces |  |
| cel25 | Celebrations | no_matching_variant_rows | 1 | 17 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-celebrations |  |
| dp2 | Mysterious Treasures | no_matching_variant_rows | 1 | 117 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-mysterious-treasures |  |
| dp7 | Stormfront | no_matching_variant_rows | 1 | 112 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-stormfront |  |
| ecard2 | Aquapolis | no_matching_variant_rows | 1 | 109 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-aquapolis |  |
| ex13 | Holon Phantoms | no_matching_variant_rows | 1 | 115 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-holon-phantoms |  |
| ex15 | Dragon Frontiers | no_matching_variant_rows | 1 | 107 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-dragon-frontiers |  |
| ex16 | Power Keepers | no_matching_variant_rows | 1 | 112 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-power-keepers |  |
| exu | Unseen Forces Unown Collection | source_error | 1 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-unseen-forces-unown-collection | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-unseen-forces-unown-collection |
| me02 | Phantasmal Flames | no_matching_variant_rows | 1 | 91 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-phantasmal-flames |  |
| me03 | Perfect Order | generated | 1 | 79 | 1 | 1 | 0 | https://doubleholo.com/sets/pokemon-perfect-order |  |
| mep | MEP Black Star Promos | source_error | 1 | 0 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-mep-black-star-promos | Double Holo set not found or unavailable: https://doubleholo.com/sets/pokemon-mep-black-star-promos |
| neo1 | Neo Genesis | no_matching_variant_rows | 1 | 19 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-neo-genesis |  |
| sm9 | Team Up | no_matching_variant_rows | 1 | 109 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-team-up |  |
| sv08 | Surging Sparks | no_matching_variant_rows | 1 | 93 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-surging-sparks |  |
| xy7 | Ancient Origins | no_matching_variant_rows | 1 | 86 | 0 | 0 | 0 | https://doubleholo.com/sets/pokemon-ancient-origins |  |
