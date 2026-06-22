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

- target_rows: 167
- records_generated: 2
- fixture_files_written: 2
- fingerprint_sha256: 11ceda7d1d2c0b5870fbc852b704e55f532d29168fe3b51fb5c583eeac551b6d

| status | count |
| --- | --- |
| no_exact_pokecardvalues_match | 161 |
| blocked_multiple_matching_stamp_variants | 4 |
| accepted_exact_finish_match | 2 |

## Accepted

| set | number | card | variant | finish | source title |
| --- | --- | --- | --- | --- | --- |
| bwp | BW95 | Champions Festival | quarter_finalist_stamp | normal | Champions Festival - BW95 - Non-Holo - Quarter-Finalist Worlds Promo - Promo |
| dp6 | 2 | Dragonite | staff_stamp | normal | Dragonite - 2/146 - Non-Holo - Staff National Championships - Promo |

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
| no_exact_pokecardvalues_match | bw5 | 4 | Scyther | league_stamp | 0 |
| no_exact_pokecardvalues_match | bw5 | 12 | Flareon | league_stamp | 0 |
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
| no_exact_pokecardvalues_match | dp3 | 122 | Professor Oak's Visit | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | dp6 | 130 | Buck's Training | staff_stamp | 0 |
| no_exact_pokecardvalues_match | dpp | DP25 | Tropical Wind | finalist_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 6 | Bagon | league_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 7 | Shelgon | league_stamp | 0 |
| no_exact_pokecardvalues_match | dv1 | 8 | Salamence | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex11 | 61 | Ditto | origins_game_fair_stamped_200 | 0 |
| no_exact_pokecardvalues_match | ex11 | 64 | Ditto | games_expo_stamped_2007 | 0 |
| no_exact_pokecardvalues_match | ex12 | 5 | Gengar | gym_challenge_stamped_2006_2007 | 0 |
| no_exact_pokecardvalues_match | ex12 | 6 | Golem | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex14 | 14 | Blastoise | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex15 | 79 | Professor Elm's Training Method | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | ex4 | 24 | Team Aqua's Cacnea | prerelease_stamp | 0 |
| no_exact_pokecardvalues_match | ex5 | 9 | Machamp | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex6 | 98 | Prof. Oak's Research | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | ex8 | 16 | Deoxys | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex8 | 22 | Rayquaza | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex9 | 3 | Exploud | league_stamp | 0 |
| no_exact_pokecardvalues_match | ex9 | 60 | Pikachu | san_diego_comic_con_international_stamped_2005 | 0 |
| no_exact_pokecardvalues_match | ex9 | 70 | Treecko | indianapolis_gencon_stamped_2005 | 0 |
| no_exact_pokecardvalues_match | hgss1 | 40 | Donphan | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | hgss1 | 100 | Professor Elm's Training Method | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 7 | Politoed | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss2 | 24 | Steelix | player_rewards_crosshatch_stamp | 0 |
| no_exact_pokecardvalues_match | hgss3 | 79 | Darkness Energy | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss3 | 80 | Metal Energy | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss4 | 85 | Black Belt | league_stamp | 0 |
| no_exact_pokecardvalues_match | hgss4 | 88 | Seeker | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | me02 | 26 | Suicune | eb_games_stamp | 2 |
| no_exact_pokecardvalues_match | pl2 | 96 | Team Galactic's Invention G-109 SP Radar | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl3 | 5 | Garchomp | league_stamp | 0 |
| no_exact_pokecardvalues_match | pl3 | 136 | Cynthia's Guidance | pok_ball_stamped_player_rewards_promo_2009_2010 | 0 |
| no_exact_pokecardvalues_match | sm1 | 20 | Tsareena | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm1 | 123 | Nest Ball | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm10 | 129 | Melmetal | unbroken_bonds_stamp | 0 |
| no_exact_pokecardvalues_match | sm2 | 55 | Oricorio | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm2 | 119 | Aqua Patch | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm3 | 41 | Raichu | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm3 | 113 | Bodybuilding Dumbbells | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm3 | 115 | Guzma | world_championships_stamp | 0 |
| no_exact_pokecardvalues_match | sm4 | 91 | Counter Catcher | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm5 | 83 | Magnezone | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm5 | 122 | Escape Board | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm7 | 24 | Magcargo | league_stamp | 0 |
| blocked_multiple_matching_stamp_variants | sm7 | 142 | Rare Candy | league_stamp | 2 |
| no_exact_pokecardvalues_match | sm7 | 145 | Steven's Resolve | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm8 | 59 | Suicune | legendary_pok_mon_stamp | 0 |
| no_exact_pokecardvalues_match | sm8 | 82 | Zebstrika | league_stamp | 0 |
| no_exact_pokecardvalues_match | sm8 | 172 | Electropower | league_cup_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm8 | 188 | Professor Elm's Lecture | regional_championships_staff_stamp | 0 |
| no_exact_pokecardvalues_match | sm9 | 19 | Moltres | team_up_stamp | 0 |
| no_exact_pokecardvalues_match | smp | SM86 | Pikachu | alolan_raichu_half_deck_14_stamp | 0 |
| no_exact_pokecardvalues_match | smp | SM231 | Champions Festival | quarter_finalist_stamp | 0 |
| no_exact_pokecardvalues_match | sv02 | 66 | Voltorb | professor_program_stamp | 0 |
| no_exact_pokecardvalues_match | sv05 | 77 | Scream Tail | pikachu_jack_o_lantern_stamp | 0 |
| no_exact_pokecardvalues_match | sv10 | 34 | Ethan's Typhlosion | staff_stamp | 0 |
| no_exact_pokecardvalues_match | sv10 | 51 | Team Rocket's Articuno | destined_rivals_stamp | 0 |
| no_exact_pokecardvalues_match | sv10 | 70 | Team Rocket's Zapdos | destined_rivals_stamp | 0 |
