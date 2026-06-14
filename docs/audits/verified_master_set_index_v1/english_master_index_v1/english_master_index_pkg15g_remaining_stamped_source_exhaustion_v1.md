# English Master Index PKG-15G Remaining Stamped Source Exhaustion V1

Audit-only report for the remaining PKG-11B stamped rows after Poke Card Values and CardTrader exact-finish lanes.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- remaining_rows: 339
- exact_routable_rows: 0
- fingerprint_sha256: `98d84d8d945edf1e873ee3892c903273ec628973b9de0d1844ca7f7592266cea`

## Attempted Source Lanes

| source_key | target_rows | records_generated | status |
| --- | --- | --- | --- |
| pokecardvalues_stamped_finish | 302 | 0 | exhausted_no_single_exact_active_finish_match |
| cardtrader_stamped_finish | 302 | 0 | exhausted_no_exact_active_finish_matches |
| bulbapedia_battle_academy_exact_finish | 58 | 0 | exhausted_explicit_non_holo_facts_not_in_remaining_queue |
| tcgcsv_stamped_subtype | 302 | 0 | exhausted_no_exact_active_finish_matches |
| pricecharting_product_stamp | 0 | 0 | exhausted_no_remaining_stamped_finish_targets |
| pricecharting_stamped_active_finish | 302 | 0 | exhausted_no_exact_active_finish_matches |
| tcgcollector_card_variants | 23 | 0 | blocked_cloudflare_challenge_for_automated_exact_finish_extraction |
| pokecardvalues_same_finish_ambiguous_adjudication | 21 | 21 | blocked_identity_granularity_required_before_write |

| source_family | rows |
| --- | --- |
| other_specific_stamp_finish | 245 |
| battle_academy_decklist_finish | 58 |
| staff_prerelease_product_finish | 19 |
| elitefourum_event_stamp_finish | 13 |
| league_play_pokemon_finish | 4 |

## Variants

| variant | rows |
| --- | --- |
| league_stamp | 87 |
| prize_pack_stamp | 63 |
| battle_academy_deck_mark | 57 |
| pikachu_jack_o_lantern_stamp | 27 |
| prerelease_stamp | 12 |
| professor_program_stamp | 12 |
| regional_championships_stamp | 10 |
| league_cup_staff_stamp | 8 |
| staff_stamp | 7 |
| play_pok_mon_thank_you_stamp | 5 |
| dragon_vault_stamp | 4 |
| player_rewards_crosshatch_stamp | 4 |
| city_championships_stamp | 3 |
| finalist_stamp | 3 |
| national_championships_stamp | 3 |
| play_pokemon_stamp | 3 |
| quarter_finalist_stamp | 3 |
| championship_staff_stamp | 2 |
| destined_rivals_stamp | 2 |
| eb_games_stamp | 2 |
| regional_championships_staff_stamp | 2 |
| alolan_raichu_half_deck_14_stamp | 1 |
| asia_championship_stamp | 1 |
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
| world_championships_stamp | 1 |

## Source Combos

| source_combo | rows |
| --- | --- |
| pricecharting_csv_product + thepricedex_price_list | 134 |
| bulbapedia_battle_academy_product + thepricedex_price_list | 57 |
| tcgcsv_prize_pack_catalog + thepricedex_price_list | 31 |
| bulbapedia_card_page_release_info + bulbapedia_set_list + thepricedex_price_list | 29 |
| binderbuilder_set_variant + thepricedex_price_list | 22 |
| tcgcollector_card_variants + thepricedex_price_list | 22 |
| elitefourum_alternate_checklist + thepricedex_price_list | 11 |
| bulbapedia_build_battle_product + bulbapedia_set_list + thepricedex_price_list | 8 |
| elitefourum_alternate_checklist + pricecharting_csv_product + thepricedex_price_list | 7 |
| pricecharting_csv_product_stamp + thepricedex_price_list | 5 |
| magicmadhouse_bw1_league_promos + thepricedex_price_list | 3 |
| cardtrader_blueprint_index + thepricedex_price_list | 2 |
| pokescope_pl2_variant + thepricedex_price_list | 2 |
| bulbapedia_sv05_additional_cards + thepricedex_price_list | 1 |
| magicmadhouse_swsh9_stamps + thepricedex_price_list | 1 |
| pokumon_special_print + thepricedex_price_list | 1 |
| pricecharting_csv_product + tcgcollector_card_variants + thepricedex_price_list | 1 |
| pricecharting_csv_promo_exact + thepricedex_price_list | 1 |
| sports_card_investor_variant_exact + thepricedex_price_list | 1 |

## Sample Rows

| set | number | name | variant | source_family | blocked_reason |
| --- | --- | --- | --- | --- | --- |
| bw1 | 15 | Tepig | player_rewards_crosshatch_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw1 | 53 | Whirlipede | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw1 | 79 | Watchog | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw1 | 81 | Lillipup | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw1 | 105 | Grass Energy | play_pokemon_stamp | league_play_pokemon_finish | Prize Pack source-family rows are not safe substitutes for older Play! Pokemon stamped league promos |
| bw1 | 106 | Fire Energy | play_pokemon_stamp | league_play_pokemon_finish | Prize Pack source-family rows are not safe substitutes for older Play! Pokemon stamped league promos |
| bw1 | 107 | Water Energy | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw1 | 111 | Darkness Energy | play_pokemon_stamp | league_play_pokemon_finish | Prize Pack source-family rows are not safe substitutes for older Play! Pokemon stamped league promos |
| bw10 | 5 | Tropius | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw11 | 97 | Deino | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw11 | 109 | Bianca | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw2 | 82 | Unfezant | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw2 | 95 | Pokémon Catcher | prize_pack_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw3 | 8 | Karrablast | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw3 | 11 | Shelmet | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw3 | 32 | Cryogonal | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw3 | 80 | Escavalier | national_championships_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw5 | 4 | Scyther | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw5 | 12 | Flareon | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw5 | 25 | Vaporeon | championship_staff_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw5 | 37 | Jolteon | regional_championships_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw5 | 84 | Eevee | city_championships_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw7 | 38 | Delibird | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw8 | 118 | Colress | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw8 | 120 | Escape Rope | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw8 | 123 | Hypnotoxic Laser | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw9 | 11 | Leafeon | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw9 | 23 | Glaceon | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bw9 | 100 | Frozen City | prize_pack_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bwp | BW50 | Tropical Beach | finalist_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| bwp | BW75 | Metagross | prerelease_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| bwp | BW95 | Champions Festival | quarter_finalist_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| col1 | 88 | Grass Energy | player_rewards_crosshatch_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dp1 | 3 | Electivire | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dp1 | 7 | Luxray | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dp1 | 98 | Shinx | city_championships_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dp3 | 122 | Professor Oak's Visit | professor_program_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dp6 | 2 | Dragonite | staff_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| dp6 | 130 | Buck's Training | staff_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| dpp | DP25 | Tropical Wind | finalist_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 6 | Bagon | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 7 | Shelgon | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 8 | Salamence | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 10 | Latios | dragon_vault_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 11 | Rayquaza | dragon_vault_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 16 | Haxorus | dragon_vault_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| dv1 | 17 | Druddigon | dragon_vault_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex10 | 29 | Lugia | pokemon_rocks_america_stamped_2005 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex11 | 61 | Ditto | origins_game_fair_stamped_200 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex11 | 64 | Ditto | games_expo_stamped_2007 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex12 | 5 | Gengar | gym_challenge_stamped_2006_2007 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex12 | 6 | Golem | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex14 | 14 | Blastoise | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex15 | 79 | Professor Elm's Training Method | professor_program_stamp | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex4 | 24 | Team Aqua's Cacnea | prerelease_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| ex5 | 9 | Machamp | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex6 | 50 | Wartortle | prerelease_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| ex6 | 98 | Prof. Oak's Research | professor_program_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex8 | 16 | Deoxys | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex8 | 22 | Rayquaza | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex9 | 3 | Exploud | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| ex9 | 60 | Pikachu | san_diego_comic_con_international_stamped_2005 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| ex9 | 70 | Treecko | indianapolis_gencon_stamped_2005 | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| hgss1 | 39 | Delibird | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss1 | 40 | Donphan | player_rewards_crosshatch_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss1 | 97 | Pokémon Collector | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss1 | 100 | Professor Elm's Training Method | professor_program_stamp | elitefourum_event_stamp_finish | EliteFourum checklist is strong identity evidence but does not consistently encode active finish |
| hgss1 | 103 | Double Colorless Energy | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss2 | 7 | Politoed | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss2 | 21 | Poliwrath | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss2 | 24 | Steelix | player_rewards_crosshatch_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss2 | 37 | Poliwhirl | staff_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| hgss2 | 82 | Rare Candy | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss3 | 79 | Darkness Energy | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss3 | 80 | Metal Energy | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss4 | 20 | Electivire | prerelease_stamp | staff_prerelease_product_finish | existing Staff/Prerelease sources prove stamp identity, but rows with multiple base finishes still need exact active-finish phrase |
| hgss4 | 85 | Black Belt | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| hgss4 | 88 | Seeker | league_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |
| me02 | 26 | Suicune | eb_games_stamp | other_specific_stamp_finish | stamp identity exists but no exact active-finish source is attached to the same fact |

## Next Source Order

1. TCGplayer/TCGCSV product catalog rows with exact stamp identity and active finish.
2. Official or Bulbapedia product/checklist rows only where active finish is explicit.
3. Additional marketplace/checklist sources such as TCDB, Troll and Toad, or eBay Browse only as review evidence unless title proves exact set/card/number/stamp/finish.

No row in this report is write-ready.
