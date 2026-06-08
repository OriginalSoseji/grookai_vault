# PriceCharting CSV Acquisition V1

Audit only. No DB writes, migrations, cleanup, quarantine, or public hiding were performed.

Generated: 2026-06-08T12:48:13.476Z

## Summary

CSV rows read: 87674
Pokemon card rows parsed: 73149
Attempted facts: 53
Raw CSV cached path: tmp/pricecharting/pokemon_cards_pricecharting.csv
Raw CSV tracked in git: false

| status | count |
| --- | --- |
| near_match_context | 48 |
| no_exact_match | 5 |

## Validated By Set

| set_key | set_name | validated finish facts |
| --- | --- | --- |

## Near Match Context By Set

These rows matched card identity but did not exactly prove the requested finish. They do not promote finish truth.

| set_key | set_name | context facts |
| --- | --- | --- |
| bw2 | Emerging Powers | 1 |
| bw3 | Noble Victories | 1 |
| bw5 | Dark Explorers | 1 |
| bw6 | Dragons Exalted | 1 |
| bw8 | Plasma Storm | 1 |
| bw9 | Plasma Freeze | 1 |
| col1 | Call of Legends | 1 |
| dp1 | Diamond & Pearl | 1 |
| dp3 | Secret Wonders | 1 |
| dp5 | Majestic Dawn | 1 |
| ecard2 | Aquapolis | 1 |
| ex1 | Ruby & Sapphire | 1 |
| ex14 | Crystal Guardians | 1 |
| ex6 | FireRed & LeafGreen | 1 |
| hgss1 | HeartGold & SoulSilver | 2 |
| hgss2 | HS—Unleashed | 1 |
| hgss4 | HS—Triumphant | 1 |
| neo1 | Neo Genesis | 1 |
| pl1 | Platinum | 1 |
| pl2 | Rising Rivals | 2 |
| sm1 | Sun & Moon | 1 |
| sm10 | Unbroken Bonds | 1 |
| sm2 | Guardians Rising | 1 |
| sm3 | Burning Shadows | 1 |
| sm4 | Crimson Invasion | 1 |
| sm7 | Celestial Storm | 1 |
| sm8 | Lost Thunder | 2 |
| smp | SM Black Star Promos | 3 |
| sv03.5 | 151 | 1 |
| swsh1 | Sword & Shield | 1 |
| swsh10 | Astral Radiance | 1 |
| swsh11 | Lost Origin | 1 |
| swsh2 | Rebel Clash | 1 |
| swsh4 | Vivid Voltage | 1 |
| swsh7 | Evolving Skies | 1 |
| xy2 | Flashfire | 1 |
| xy3 | Furious Fists | 1 |
| xy4 | Phantom Forces | 1 |
| xy8 | BREAKthrough | 1 |
| xy9 | BREAKpoint | 3 |
| xyp | XY Black Star Promos | 1 |

## Sample Results

| status | set | number | name | finish | source_url | reason |
| --- | --- | --- | --- | --- | --- | --- |
| near_match_context | bw2 | 40 | Scolipede | holo | https://www.pricecharting.com/game/pokemon-emerging-powers/scolipede-40 | card_found_but_finish_not_exactly_validated |
| near_match_context | bw3 | 91 | Eviolite | stamped | https://www.pricecharting.com/game/pokemon-noble-victories/eviolite-91 | card_found_but_finish_not_exactly_validated |
| near_match_context | bw5 | 94 | Enhanced Hammer | stamped | https://www.pricecharting.com/game/pokemon-dark-explorers/enhanced-hammer-94 | card_found_but_finish_not_exactly_validated |
| near_match_context | bw6 | 98 | Hydreigon | holo | https://www.pricecharting.com/game/pokemon-dragons-exalted/hydreigon-98 | card_found_but_finish_not_exactly_validated |
| no_exact_match | bw6 | 117 | Blend Energy GrassFirePsychicDarkness | stamped |  | no_matching_set_card_name_number_row |
| no_exact_match | bw6 | 118 | Blend Energy WaterLightningFightingMetal | stamped |  | no_matching_set_card_name_number_row |
| near_match_context | bw8 | 94 | Druddigon | holo | https://www.pricecharting.com/game/pokemon-plasma-storm/druddigon-94 | card_found_but_finish_not_exactly_validated |
| near_match_context | bw9 | 106 | Plasma Energy | stamped | https://www.pricecharting.com/game/pokemon-plasma-freeze/plasma-energy-106 | card_found_but_finish_not_exactly_validated |
| no_exact_match | cel25 | 24 | _____'s Pikachu | holo |  | no_matching_set_card_name_number_row |
| near_match_context | col1 | 91 | Lightning Energy | stamped | https://www.pricecharting.com/game/pokemon-call-of-legends/lightning-energy-91 | card_found_but_finish_not_exactly_validated |
| near_match_context | dp1 | 112 | Professor Rowan | stamped | https://www.pricecharting.com/game/pokemon-diamond-and-pearl/professor-rowan-112 | card_found_but_finish_not_exactly_validated |
| near_match_context | dp3 | 106 | Shellos East Sea | stamped | https://www.pricecharting.com/game/pokemon-secret-wonders/shellos-east-sea-106 | card_found_but_finish_not_exactly_validated |
| near_match_context | dp5 | 92 | Call Energy | stamped | https://www.pricecharting.com/game/pokemon-majestic-dawn/call-energy-92 | card_found_but_finish_not_exactly_validated |
| near_match_context | ecard2 | 103 | Porygon | reverse | https://www.pricecharting.com/game/pokemon-burning-shadows/porygon-103 | card_found_but_finish_not_exactly_validated |
| near_match_context | ex1 | 93 | Darkness Energy | cosmos | https://www.pricecharting.com/game/pokemon-majestic-dawn/darkness-energy-93 | card_found_but_finish_not_exactly_validated |
| no_exact_match | ex4 | 24 | Team Aqua's Cacnea | stamped |  | no_matching_set_card_name_number_row |
| near_match_context | ex6 | 98 | Prof. Oak's Research | stamped | https://www.pricecharting.com/game/pokemon-fire-red-and-leaf-green/prof-oaks-research-98 | card_found_but_finish_not_exactly_validated |
| near_match_context | ex14 | 42 | Wartortle | stamped | https://www.pricecharting.com/game/pokemon-base-set/wartortle-42 | card_found_but_finish_not_exactly_validated |
| near_match_context | hgss1 | 98 | Pokémon Communication | stamped | https://www.pricecharting.com/game/pokemon-heartgold-and-soulsilver/pokemon-communication-98 | card_found_but_finish_not_exactly_validated |
| near_match_context | hgss1 | 104 | Rainbow Energy | stamped | https://www.pricecharting.com/game/pokemon-heartgold-and-soulsilver/rainbow-energy-104 | card_found_but_finish_not_exactly_validated |
| near_match_context | hgss2 | 83 | Super Scoop Up | stamped | https://www.pricecharting.com/game/pokemon-unleashed/super-scoop-up-83 | card_found_but_finish_not_exactly_validated |
| near_match_context | hgss4 | 87 | Junk Arm | stamped | https://www.pricecharting.com/game/pokemon-triumphant/junk-arm-87 | card_found_but_finish_not_exactly_validated |
| near_match_context | neo1 | 105 | Recycle Energy | holo | https://www.pricecharting.com/game/pokemon-neo-genesis/recycle-energy-105 | card_found_but_finish_not_exactly_validated |
| near_match_context | pl1 | 112 | PlusPower | stamped | https://www.pricecharting.com/game/pokemon-platinum/pluspower-112 | card_found_but_finish_not_exactly_validated |
| near_match_context | pl2 | 92 | Lucian's Assignment | stamped | https://www.pricecharting.com/game/pokemon-rising-rivals/lucians-assignment-92 | card_found_but_finish_not_exactly_validated |
| near_match_context | pl2 | 102 | Upper Energy | stamped | https://www.pricecharting.com/game/pokemon-rising-rivals/upper-energy-102 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm1 | 90 | Snubbull | stamped | https://www.pricecharting.com/game/pokemon-promo/snubbull-build-a-bear-90 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm2 | 126 | Hala | stamped | https://www.pricecharting.com/game/pokemon-guardians-rising/hala-126 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm3 | 28 | Alolan Ninetales | holo | https://www.pricecharting.com/game/pokemon-burning-shadows/alolan-ninetales-28 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm4 | 75 | Jangmo-o | cosmos | https://www.pricecharting.com/game/pokemon-crimson-invasion/jangmo-o-eb-games-75 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm7 | 127 | Copycat | stamped | https://www.pricecharting.com/game/pokemon-celestial-storm/copycat-127 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm8 | 187 | Net Ball | stamped | https://www.pricecharting.com/game/pokemon-lost-thunder/net-ball-187 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm8 | 188 | Professor Elm's Lecture | stamped | https://www.pricecharting.com/game/pokemon-lost-thunder/professor-elms-lecture-188 | card_found_but_finish_not_exactly_validated |
| near_match_context | sm10 | 60 | Zeraora | holo | https://www.pricecharting.com/game/pokemon-unbroken-bonds/zeraora-60 | card_found_but_finish_not_exactly_validated |
| near_match_context | smp | SM198 | Bulbasaur | cosmos | https://www.pricecharting.com/game/pokemon-promo/bulbasaur-sm198 | card_found_but_finish_not_exactly_validated |
| near_match_context | smp | SM199 | Psyduck | cosmos | https://www.pricecharting.com/game/pokemon-promo/psyduck-sm199 | card_found_but_finish_not_exactly_validated |
| near_match_context | smp | SM200 | Snubbull | cosmos | https://www.pricecharting.com/game/pokemon-promo/snubbull-sm200 | card_found_but_finish_not_exactly_validated |
| near_match_context | sv03.5 | 7 | Squirtle | stamped | https://www.pricecharting.com/game/pokemon-1999-topps-movie-die-cut/squirtle-7 | card_found_but_finish_not_exactly_validated |
| near_match_context | swsh1 | 31 | Scorbunny | holo | https://www.pricecharting.com/game/pokemon-sword-and-shield/scorbunny-31 | card_found_but_finish_not_exactly_validated |
| no_exact_match | swsh1 | 178 | Professor's Research (Professor Magnolia) | stamped |  | no_matching_set_card_name_number_row |
| near_match_context | swsh2 | 39 | Magikarp | cosmos | https://www.pricecharting.com/game/pokemon-danone-pokemon-stadium/magikarp-39 | card_found_but_finish_not_exactly_validated |
| near_match_context | swsh4 | 71 | Dusknoir | stamped | https://www.pricecharting.com/game/pokemon-trick-or-trade-2023/dusknoir-holo-71 | card_found_but_finish_not_exactly_validated |
| near_match_context | swsh7 | 80 | Marshadow | stamped | https://www.pricecharting.com/game/pokemon-evolving-skies/marshadow-cosmos-holo-80 | card_found_but_finish_not_exactly_validated |
| near_match_context | swsh10 | 156 | Trekking Shoes | stamped | https://www.pricecharting.com/game/pokemon-astral-radiance/trekking-shoes-156 | card_found_but_finish_not_exactly_validated |
| near_match_context | swsh11 | 162 | Lost Vacuum | stamped | https://www.pricecharting.com/game/pokemon-lost-origin/lost-vacuum-162 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy2 | 31 | Avalugg | stamped | https://www.pricecharting.com/game/pokemon-flashfire/avalugg-31 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy3 | 102 | Training Center | stamped | https://www.pricecharting.com/game/pokemon-furious-fists/training-center-102 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy4 | 93 | Dimension Valley | stamped | https://www.pricecharting.com/game/pokemon-phantom-forces/dimension-valley-93 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy8 | 103 | Florges | stamped | https://www.pricecharting.com/game/pokemon-breakthrough/florges-103 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy9 | 104 | Misty's Determination | stamped | https://www.pricecharting.com/game/pokemon-breakpoint/mistys-determination-104 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy9 | 110 | Reverse Valley | stamped | https://www.pricecharting.com/game/pokemon-breakpoint/reverse-valley-110 | card_found_but_finish_not_exactly_validated |
| near_match_context | xy9 | 113 | Splash Energy | stamped | https://www.pricecharting.com/game/pokemon-breakpoint/splash-energy-113 | card_found_but_finish_not_exactly_validated |
| near_match_context | xyp | XY202 | Pikachu | holo | https://www.pricecharting.com/game/pokemon-promo/pikachu-xy202 | card_found_but_finish_not_exactly_validated |
