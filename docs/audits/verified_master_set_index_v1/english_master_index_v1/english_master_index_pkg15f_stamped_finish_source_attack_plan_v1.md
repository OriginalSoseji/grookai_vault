# English Master Index PKG-15F Stamped Finish Source Attack Plan V1

Audit-only plan for reducing the remaining stamped finish blockers. This report does not write to the database and does not promote any printing.

## Safety

- audit_only: true
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Core Rule

Stamped evidence is parent identity evidence only. A row is not write-ready until an independent source proves the active child finish for the exact set, card number, card name, and stamp/variant.

## Summary

- input_candidate_rows: 304
- attack_plan_rows: 304
- write_ready_now: 0
- fingerprint_sha256: 82e8e00ae4cbd5862a2afa3d69d4040c44051597f7c9466af1760fdb05f44605

## Source Families

| priority | source family | rows | variant keys | sets |
| --- | --- | --- | --- | --- |
| 1 | staff prerelease/product checklist | 9 | staff_stamp | 5 |
| 2 | Battle Academy decklist finish text | 57 | battle_academy_deck_mark | 15 |
| 3 | prerelease promo finish checklist | 15 | prerelease_stamp | 7 |
| 4 | Play! Pokemon / league promo finish checklist | 8 | play_pokemon_stamp | 4 |
| 5 | specific stamped product evidence | 215 | alolan_raichu_half_deck_14_stamp, asia_championship_stamp, championship_staff_stamp, city_championships_stamp, destined_rivals_stamp, dragon_vault_stamp, eb_games_stamp, games_expo_stamped_2007, gym_challenge_stamped_2006_2007, indianapolis_gencon_stamped_2005, league_stamp, legendary_pok_mon_stamp, lost_origin_stamp, mcdonalds_stamp, national_championships_stamp, origins_game_fair_stamped_200, pikachu_jack_o_lantern_stamp, pikachu_pumpkin_stamp, pikachu_stamp, play_pok_mon_thank_you_stamp, pok_ball_stamped_player_rewards_promo_2009_2010, pokemon_10th_anniversary_stamped, pokemon_rocks_america_stamped_2005, prize_pack_stamp, professor_program_stamp, regional_championships_staff_stamp, regional_championships_stamp, san_diego_comic_con_international_stamped_2005, silver_tempest_stamp, stamped, team_up_stamp, thank_you_stamp, unbroken_bonds_stamp, vivid_voltage_stamp, world_championships_stamp | 59 |

## Variant Buckets

| variant key | rows |
| --- | --- |
| prize_pack_stamp | 84 |
| battle_academy_deck_mark | 57 |
| pikachu_jack_o_lantern_stamp | 29 |
| league_stamp | 27 |
| prerelease_stamp | 15 |
| professor_program_stamp | 13 |
| regional_championships_stamp | 11 |
| staff_stamp | 9 |
| play_pokemon_stamp | 8 |
| play_pok_mon_thank_you_stamp | 5 |
| dragon_vault_stamp | 4 |
| pikachu_stamp | 4 |
| city_championships_stamp | 3 |
| national_championships_stamp | 3 |
| asia_championship_stamp | 2 |
| championship_staff_stamp | 2 |
| destined_rivals_stamp | 2 |
| eb_games_stamp | 2 |
| regional_championships_staff_stamp | 2 |
| stamped | 2 |
| world_championships_stamp | 2 |
| alolan_raichu_half_deck_14_stamp | 1 |
| games_expo_stamped_2007 | 1 |
| gym_challenge_stamped_2006_2007 | 1 |
| indianapolis_gencon_stamped_2005 | 1 |
| legendary_pok_mon_stamp | 1 |
| lost_origin_stamp | 1 |
| mcdonalds_stamp | 1 |
| origins_game_fair_stamped_200 | 1 |
| pikachu_pumpkin_stamp | 1 |
| pok_ball_stamped_player_rewards_promo_2009_2010 | 1 |
| pokemon_10th_anniversary_stamped | 1 |
| pokemon_rocks_america_stamped_2005 | 1 |
| san_diego_comic_con_international_stamped_2005 | 1 |
| silver_tempest_stamp | 1 |
| team_up_stamp | 1 |
| thank_you_stamp | 1 |
| unbroken_bonds_stamp | 1 |
| vivid_voltage_stamp | 1 |

## Preserved Source Buckets

| preserved source | rows |
| --- | --- |
| thepricedex_price_list | 304 |
| pricecharting_csv_product | 86 |
| bulbapedia_battle_academy_product | 57 |
| bulbapedia_set_list | 41 |
| tcgcsv_prize_pack_catalog | 38 |
| bulbapedia_card_page_release_info | 31 |
| tcgcollector_card_variants | 25 |
| binderbuilder_set_variant | 22 |
| elitefourum_alternate_checklist | 19 |
| bulbapedia_build_battle_product | 10 |
| pricecharting_csv_product_stamp | 5 |
| pokescope_svp_variant | 4 |
| magicmadhouse_bw1_league_promos | 3 |
| pricecharting_csv_promo_exact | 3 |
| cardtrader_blueprint_index | 2 |
| pokescope_pl2_variant | 2 |
| bulbapedia_sv05_additional_cards | 1 |
| magicmadhouse_swsh9_stamps | 1 |
| pokescope_me01_stamp | 1 |
| pokumon_special_print | 1 |
| pricecharting_svp_winner_variant | 1 |
| sports_card_investor_variant_exact | 1 |

## Acquisition Samples

| priority | set | number | card | variant | base finishes | status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | dp1 | 52 | Luxio | staff_stamp | normal, reverse | needs_exact_active_finish_source |
| 1 | dp6 | 2 | Dragonite | staff_stamp | holo, reverse | needs_exact_active_finish_source |
| 1 | dp6 | 130 | Buck's Training | staff_stamp | normal, reverse | needs_exact_active_finish_source |
| 1 | hgss1 | 28 | Pichu | staff_stamp | normal, reverse | needs_exact_active_finish_source |
| 1 | hgss2 | 37 | Poliwhirl | staff_stamp | normal, reverse | needs_exact_active_finish_source |
| 1 | sv10 | 34 | Ethan's Typhlosion | staff_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 1 | sv10 | 49 | Misty's Gyarados | staff_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 1 | sv10 | 87 | Team Rocket's Mimikyu | staff_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 1 | sv10 | 96 | Team Rocket's Tyranitar | staff_stamp | cosmos, holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm1 | 119 | Great Ball | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm1 | 120 | Hau | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm1 | 126 | Pokémon Catcher | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm1 | 127 | Potion | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm1 | 132 | Switch | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm10 | 189 | Welder | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 34 | Salazzle | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 84 | Mesprit | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 87 | Cresselia | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 97 | Toxapex | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 164 | Tauros | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm11 | 189 | Bug Catcher | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 8 | Charmeleon | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 9 | Charizard-GX | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 19 | Pikachu | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 20 | Raichu-GX | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 31 | Mewtwo-GX | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 32 | Mew | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 46 | Chansey | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 49 | Eevee | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm115 | 50 | Snorlax | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm3 | 43 | Electivire | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm5 | 25 | Salandit | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm5 | 43 | Electabuzz | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm5 | 133 | Pokémon Fan Club | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm8 | 38 | Moltres | battle_academy_deck_mark | cracked_ice, holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm8 | 81 | Blitzle | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm8 | 89 | Espeon | battle_academy_deck_mark | cosmos, holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm8 | 105 | Mareanie | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | sm9 | 45 | Zebstrika | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | smp | SM186 | Flareon | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 29 | Turtonator | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 74 | Yamper | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 76 | Boltund | battle_academy_deck_mark | cosmos, holo, normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 160 | Energy Retrieval | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 165 | Hop | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh1 | 183 | Switch | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh3 | 165 | Piers | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh4 | 53 | Blitzle | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh4 | 54 | Zebstrika | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh5 | 124 | Energy Recycler | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 30 | Ninetales | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 49 | Centiskorch | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 91 | Shinx | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 92 | Luxio | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 93 | Luxray | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 102 | Zeraora | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 109 | Morpeko | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 162 | Carvanha | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 163 | Sharpedo | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 167 | Darkrai | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 170 | Zorua | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 171 | Zoroark | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 226 | Bug Catcher | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 228 | Cook | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swsh8 | 240 | Shauna | battle_academy_deck_mark | normal, reverse | needs_exact_active_finish_source |
| 2 | swshp | SWSH193 | Galarian Obstagoon | battle_academy_deck_mark | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | bwp | BW75 | Metagross | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | ex4 | 24 | Team Aqua's Cacnea | prerelease_stamp | normal, reverse | needs_exact_active_finish_source |
| 3 | ex6 | 50 | Wartortle | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | hgss3 | 17 | Leafeon | prerelease_stamp | normal, reverse | needs_exact_active_finish_source |
| 3 | hgss4 | 20 | Electivire | prerelease_stamp | normal, reverse | needs_exact_active_finish_source |
| 3 | smp | SM158 | Charizard | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | smp | SM161 | Jirachi | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH185 | Moltres | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH186 | Lucario | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH187 | Liepard | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH188 | Bibarel | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH205 | Hisuian Basculegion | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH206 | Wyrdeer | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |
| 3 | swshp | SWSH207 | Hisuian Samurott | prerelease_stamp | holo, normal, reverse | needs_exact_active_finish_source |

## Acceptance

- Do not infer active finish from stamp family.
- Do not infer active finish from base parent availability.
- Do not treat marketplace title-only evidence as sufficient unless it contains exact set/card/number/stamp/finish.
- Rows with exact source text can move into a guarded parent identity insert package.
- Rows without exact source text remain blocked.
