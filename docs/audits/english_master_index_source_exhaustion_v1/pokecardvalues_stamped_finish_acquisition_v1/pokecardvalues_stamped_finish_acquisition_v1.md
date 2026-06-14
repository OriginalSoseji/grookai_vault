# Poke Card Values Stamped Finish Acquisition V1

Audit-only source acquisition lane for stamped active finishes. This does not write to the database.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- dry_run: false

## Rule

Accepted rows require one exact Poke Card Values structured card title matching set, card number, card name, stamp family, and active finish. If more than one stamped variant or finish matches the same target, the row is blocked.

## Summary

- target_rows: 339
- records_generated: 31
- fixture_files_written: 20
- fingerprint_sha256: 1b4af47e7b6d6cf540eaa1928e1fee1da25671c7bff876d78f21ce95fd6b185e

| status | count |
| --- | --- |
| no_exact_pokecardvalues_match | 286 |
| accepted_exact_finish_match | 31 |
| blocked_multiple_matching_stamp_variants | 22 |

## Accepted

| set | number | card | variant | finish | source title |
| --- | --- | --- | --- | --- | --- |
| bw1 | 53 | Whirlipede | league_stamp | reverse | Whirlipede - 53/114 - Reverse Holo - League Promo - Promo |
| bw1 | 79 | Watchog | league_stamp | reverse | Watchog - 79/114 - Reverse Holo - League Promo - Promo |
| bw1 | 81 | Lillipup | league_stamp | reverse | Lillipup - 81/114 - Reverse Holo - League Promo - Promo |
| bw1 | 107 | Water Energy | league_stamp | reverse | Water Energy - 107/114 - Reverse Holo - League Promo - Promo |
| bw11 | 109 | Bianca | league_stamp | reverse | Bianca - 109/113 - Reverse Holo - League Promo - Promo |
| bw2 | 82 | Unfezant | league_stamp | reverse | Unfezant - 82/98 - Reverse Holo - League Promo - Promo |
| bw3 | 32 | Cryogonal | league_stamp | reverse | Cryogonal - 32/101 - Reverse Holo - League Promo - Promo |
| bw8 | 120 | Escape Rope | league_stamp | reverse | Escape Rope - 120/135 - Reverse Holo - League Promo - Promo |
| bwp | BW95 | Champions Festival | quarter_finalist_stamp | normal | Champions Festival - BW95 - Non-Holo - Quarter-Finalist Worlds Promo - Promo |
| hgss1 | 39 | Delibird | league_stamp | reverse | Delibird - 39/123 - Reverse Holo - League Promo - Promo |
| hgss1 | 97 | Pokémon Collector | league_stamp | reverse | Pokemon Collector - 97/123 - Reverse Holo - League Promo - Promo |
| hgss1 | 103 | Double Colorless Energy | league_stamp | reverse | Double Colorless Energy - 103/123 - Reverse Holo - League Promo - Promo |
| hgss2 | 82 | Rare Candy | league_stamp | reverse | Rare Candy - 82/95 - Reverse Holo - League Promo - Promo |
| pl1 | 104 | Broken Time-Space | league_stamp | reverse | Broken Time-Space - 104/127 - Reverse Holo - League Promo - Promo |
| pl3 | 26 | Dusknoir FB | league_stamp | reverse | Dusknoir FB - 26/147 - Reverse Holo - League Promo - Promo |
| pl3 | 83 | Skarmory FB | league_stamp | reverse | Skarmory FB - 83/147 - Reverse Holo - League Promo - Promo |
| pl4 | 32 | Spiritomb | league_stamp | reverse | Spiritomb - 32/99 - Reverse Holo - League Promo - Promo |
| pl4 | 87 | Expert Belt | league_stamp | reverse | Expert Belt - 87/99 - Reverse Holo - League Promo - Promo |
| sm1 | 41 | Primarina | league_stamp | reverse | Primarina - 41/149 - Reverse Holo - League Promo - Promo |
| sm3 | 94 | Diancie | league_stamp | reverse | Diancie - 94/147 - Reverse Holo - League Promo - Promo |
| sm6 | 77 | Buzzwole | league_stamp | reverse | Buzzwole - 77/131 - Reverse Holo - League Promo - Promo |
| sm7 | 95 | Metagross | league_stamp | reverse | Metagross - 95/168 - Reverse Holo - League Promo - Promo |
| sm8 | 108 | Naganadel | league_stamp | reverse | Naganadel - 108/214 - Reverse Holo - League Promo - Promo |
| sm8 | 181 | Lost Blender | league_stamp | reverse | Lost Blender - 181/214 - Reverse Holo - League Promo - Promo |
| xy1 | 121 | Muscle Band | league_stamp | reverse | Muscle Band - 121/146 - Reverse Holo - League Promo - Promo |
| xy2 | 89 | Fiery Torch | league_stamp | reverse | Fiery Torch - 89/106 - Reverse Holo - League Promo - Promo |
| xy2 | 91 | Magnetic Storm | league_stamp | reverse | Magnetic Storm - 91/106 - Reverse Holo - League Promo - Promo |
| xy2 | 94 | Pokémon Fan Club | league_stamp | reverse | Pokemon Fan Club - 94/106 - Reverse Holo - League Promo - Promo |
| xy3 | 88 | Battle Reporter | league_stamp | reverse | Battle Reporter - 88/111 - Reverse Holo - League Promo - Promo |
| xy8 | 101 | Flabébé | league_stamp | reverse | Flabebe - 101/162 - Reverse Holo - League Promo - Promo |
| xy8 | 102 | Floette | league_stamp | reverse | Floette - 102/162 - Reverse Holo - League Promo - Promo |

## Blocked Samples

| status | set | number | card | variant | matches |
| --- | --- | --- | --- | --- | --- |
| no_exact_pokecardvalues_match | bw1 | 15 | Tepig | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | bw1 | 105 | Grass Energy | play_pokemon_stamp | 0 |
| no_exact_pokecardvalues_match | bw1 | 106 | Fire Energy | play_pokemon_stamp | 0 |
| no_exact_pokecardvalues_match | bw1 | 111 | Darkness Energy | play_pokemon_stamp | 0 |
| no_exact_pokecardvalues_match | bw10 | 5 | Tropius | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw11 | 97 | Deino | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw2 | 95 | Pokémon Catcher | prize_pack_stamp | 0 |
| no_exact_pokecardvalues_match | bw3 | 8 | Karrablast | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw3 | 11 | Shelmet | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | bw3 | 80 | Escavalier | national_championships_stamp | 2 |
| no_exact_pokecardvalues_match | bw5 | 4 | Scyther | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw5 | 12 | Flareon | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | bw5 | 25 | Vaporeon | championship_staff_stamp | 2 |
| blocked_multiple_matching_stamp_variants | bw5 | 37 | Jolteon | regional_championships_stamp | 2 |
| blocked_multiple_matching_stamp_variants | bw5 | 84 | Eevee | city_championships_stamp | 2 |
| no_exact_pokecardvalues_match | bw7 | 38 | Delibird | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw8 | 118 | Colress | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw8 | 123 | Hypnotoxic Laser | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw9 | 11 | Leafeon | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw9 | 23 | Glaceon | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw9 | 100 | Frozen City | prize_pack_stamp | 0 |
| blocked_multiple_matching_stamp_variants | bwp | BW50 | Tropical Beach | finalist_stamp | 3 |
| no_exact_pokecardvalues_match | bwp | BW75 | Metagross | prerelease_stamp | 0 |
| no_exact_pokecardvalues_match | col1 | 88 | Grass Energy | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | dp1 | 3 | Electivire | league_stamp | 0 |
| no_exact_pokecardvalues_match | dp1 | 7 | Luxray | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | dp1 | 98 | Shinx | city_championships_stamp | 2 |
| no_exact_pokecardvalues_match | dp3 | 122 | Professor Oak's Visit | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | dp6 | 2 | Dragonite | staff_stamp | 0 |
| no_exact_pokecardvalues_match | dp6 | 130 | Buck's Training | staff_stamp | 0 |
| no_exact_pokecardvalues_match | dpp | DP25 | Tropical Wind | finalist_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 6 | Bagon | league_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 7 | Shelgon | league_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 8 | Salamence | league_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 10 | Latios | dragon_vault_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 11 | Rayquaza | dragon_vault_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 16 | Haxorus | dragon_vault_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 17 | Druddigon | dragon_vault_stamp | 0 |
| no_exact_pokecardvalues_match | ex10 | 29 | Lugia | pokemon_rocks_america_stamped_2005 | 0 |
| no_exact_pokecardvalues_match | ex11 | 61 | Ditto | origins_game_fair_stamped_200 | 0 |
| no_exact_pokecardvalues_match | ex11 | 64 | Ditto | games_expo_stamped_2007 | 0 |
| no_exact_pokecardvalues_match | ex12 | 5 | Gengar | gym_challenge_stamped_2006_2007 | 0 |
| no_exact_pokecardvalues_match | ex12 | 6 | Golem | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex14 | 14 | Blastoise | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex15 | 79 | Professor Elm's Training Method | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | ex4 | 24 | Team Aqua's Cacnea | prerelease_stamp | 0 |
| no_exact_pokecardvalues_match | ex5 | 9 | Machamp | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex6 | 50 | Wartortle | prerelease_stamp | 0 |
| no_exact_pokecardvalues_match | ex6 | 98 | Prof. Oak's Research | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | ex8 | 16 | Deoxys | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex8 | 22 | Rayquaza | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | 0 |
| no_exact_pokecardvalues_match | ex9 | 3 | Exploud | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex9 | 60 | Pikachu | san_diego_comic_con_international_stamped_2005 | 0 |
| no_exact_pokecardvalues_match | ex9 | 70 | Treecko | indianapolis_gencon_stamped_2005 | 0 |
| no_exact_pokecardvalues_match | hgss1 | 40 | Donphan | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | hgss1 | 100 | Professor Elm's Training Method | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 7 | Politoed | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 21 | Poliwrath | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 24 | Steelix | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 37 | Poliwhirl | staff_stamp | 0 |
| no_exact_pokecardvalues_match | hgss3 | 79 | Darkness Energy | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss3 | 80 | Metal Energy | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss4 | 20 | Electivire | prerelease_stamp | 0 |
| no_exact_pokecardvalues_match | hgss4 | 85 | Black Belt | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss4 | 88 | Seeker | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | me02 | 26 | Suicune | eb_games_stamp | 2 |
| no_exact_pokecardvalues_match | pl2 | 89 | Bebe's Search | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl2 | 96 | Team Galactic's Invention G-109 SP Radar | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl2 | 98 | Volkner's Philosophy | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl3 | 5 | Garchomp | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl3 | 136 | Cynthia's Guidance | pok_ball_stamped_player_rewards_promo_2009_2010 | 0 |
| no_exact_pokecardvalues_match | sm1 | 20 | Tsareena | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm1 | 119 | Great Ball | battle_academy_deck_mark | 0 |
| no_exact_pokecardvalues_match | sm1 | 120 | Hau | battle_academy_deck_mark | 0 |
| no_exact_pokecardvalues_match | sm1 | 123 | Nest Ball | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm1 | 126 | Pokémon Catcher | battle_academy_deck_mark | 0 |
| no_exact_pokecardvalues_match | sm1 | 127 | Potion | battle_academy_deck_mark | 0 |
| blocked_multiple_matching_stamp_variants | sm1 | 128 | Professor Kukui | regional_championships_stamp | 2 |
| no_exact_pokecardvalues_match | sm1 | 132 | Switch | battle_academy_deck_mark | 0 |
