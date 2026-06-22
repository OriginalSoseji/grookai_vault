# Event/Staff Exact Source Evidence V1

Audit-only pass for stamped/special queue rows in `event_staff_exact_source`.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, identity inserts, or cleanup were performed.

## Summary

| metric | value |
| --- | --- |
| target_queue_rows | 19 |
| source_ready_candidates | 10 |
| identity_supported_finish_unproven | 7 |
| review_only_rows | 0 |
| source_exhausted_rows | 2 |
| fixture_records_written | 11 |
| write_ready_created | 0 |
| fingerprint_sha256 | `c0ef790ca638e9623fc46c7efc3174e33cf54451e118cf4e60437c3a3bc7d1e7` |


## Results

| set | number | card | stamp | recommended finish | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| bwp | BW50 | Tropical Beach | Finalist Stamp | holo | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| bwp | BW95 | Champions Festival | Quarter Finalist Stamp | holo | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| dp6 | 130 | Buck's Training | Staff Stamp | normal | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| dp6 | 2 | Dragonite | Staff Stamp | normal | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| dpp | DP25 | Tropical Wind | Finalist Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sm3 | 115 | Guzma | World Championships Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sm8 | 188 | Professor Elm's Lecture | Regional Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| smp | SM231 | Champions Festival | Quarter Finalist Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sv10 | 34 | Ethan's Typhlosion | Staff Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sv10 | 49 | Misty's Gyarados | Staff Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sv10 | 87 | Team Rocket's Mimikyu | Staff Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| sv10 | 96 | Team Rocket's Tyranitar | Staff Stamp |  | source_exhausted_no_exact_source_no_write | No checked source met the exact required source terms. |
| svp | 101 | Pikachu | Asia Championship Stamp | holo | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| svp | 225 | Pikachu | World Championships Stamp |  | identity_supported_finish_unproven_no_write | Source evidence supports the event/stamp identity, but active finish is not independently proven. |
| swsh2 | 154 | Boss's Orders | Regional Championships Stamp | reverse | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| swshp | SWSH296 | Champions Festival | Quarter Finalist Stamp |  | source_exhausted_no_exact_source_no_write | No checked source met the exact required source terms. |
| xy8 | 138 | Giovanni's Scheme | Regional Championships Stamp | reverse | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| xy9 | 104 | Misty's Determination | Regional Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |
| xyp | XY27 | Champions Festival | Finalist Stamp | holo | source_ready_candidate_no_db_write | At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created. |


## Source Checks

| set | number | source | status | all_terms | finish | review_only | url |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bwp | BW50 | theendgames_tropical_beach_finalist_bw50_holo | fetched | true | holo | no | https://theendgames.crystalcommerce.com/buylist/pokemon-pokemon_singles-pokemon_promos/tropical_beach_finalist__bw50__promotional/953353 |
| bwp | BW50 | pricecharting_tropical_beach_finalist_bw50 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-promo/tropical-beach-finalist-bw50 |
| bwp | BW95 | frontline_champions_festival_quarter_finalist_bw95_holo | fetched | true | holo | no | https://www.frontlinegames.net/buylist/pokemon_singles-pokemon_promos-bw_black_star_promos/champions_festival_quarter_finalist__bw95__promotional/420943 |
| bwp | BW95 | tcgplayer_champions_festival_bw95_quarter_finalist | fetched | false |  | no | https://www.tcgplayer.com/product/96569/pokemon-black-and-white-promos-champions-festival-bw95-worlds-13-quarter-finalist |
| dp6 | 130 | pokecardvalues_bucks_training_staff_prerelease_non_holo_130 | fetched | true | normal | no | https://pokecardvalues.co.uk/cards/bucks-training-130-146-non-holo-unlimited-legends-awakened/dp6-130-2-1/ |
| dp6 | 130 | nobleknight_bucks_training_staff_130 | fetched | true |  | no | https://www.nobleknight.com/P/2148464238/Bucks-Training---130-146-Prerelease-Staff-P-130 |
| dp6 | 2 | pokecardvalues_dragonite_staff_national_non_holo_2 | fetched | true | normal | no | https://pokecardvalues.co.uk/cards/dragonite-2-146-non-holo-staff-national-championships-legends-awakened/dp6-2-2-80/ |
| dp6 | 2 | pricecharting_dragonite_national_championships_staff_2 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-legends-awakened/dragonite-national-championships-staff-2 |
| dpp | DP25 | pricecharting_tropical_wind_finalist_dp25 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-promo/tropical-wind-finalist-dp25 |
| dpp | DP25 | pokumon_tropical_wind_cardname_dp25_non_holo | fetched | true | normal | yes | https://pokumon.com/cardname/tropical-wind/ |
| sm3 | 115 | elitefourum_guzma_regional_staff_reverse_115 | fetched | true | reverse | yes | https://www.elitefourum.com/t/prerelease-staff-card-rarity/25783 |
| sm3 | 115 | pricecharting_guzma_world_championships_2017_115 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-world-championships-2017/guzma-115 |
| sm8 | 188 | gamenerdz_professor_elms_lecture_regional_staff_reverse_188 | fetched | true | reverse | no | https://www.gamenerdz.com/professor-elms-lecture-188-214-regional-championships-staff-188-league-championship-cards-reverse-holofoil |
| sm8 | 188 | tcgplayer_professor_elms_lecture_regional_staff_188 | fetched | false |  | no | https://www.tcgplayer.com/product/181263/pokemon-league-and-championship-cards-professor-elms-lecture-188-214-regional-championships-staff |
| smp | SM231 | pricecharting_champions_festival_quarter_finalist_sm231 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-promo/champions-festival-quarter-finalist-sm231 |
| smp | SM231 | tcgplayer_champions_festival_sm231_quarter_finalist | fetched | false |  | no | https://www.tcgplayer.com/product/198364/pokemon-sm-promos-champions-festival-sm231-world-championships-2019-quarter-finalist |
| sv10 | 34 | pricecharting_ethans_typhlosion_staff_34 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-destined-rivals/ethan%27s-typhlosion-staff-34 |
| sv10 | 34 | ebay_ethans_typhlosion_staff_holo_34 | fetched | false | holo | yes | https://www.ebay.com/itm/116814846233 |
| sv10 | 49 | pricecharting_mistys_gyarados_stamped_49 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-destined-rivals/misty%27s-gyarados-stamped-49 |
| sv10 | 49 | fanatics_mistys_gyarados_staff_49 | fetched | true |  | no | https://www.fanaticscollect.com/buy-now/ca651523-b6dd-4fb3-ac0a-67dd36540d43/2025-pokemon-sv-destined-rivals-prerelease-staff-mistys-gyarados-49-cgc-10-gem |
| sv10 | 87 | pricecharting_team_rockets_mimikyu_prerelease_staff_87 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-mimikyu-prerelease-staff-87 |
| sv10 | 87 | dextcg_team_rockets_mimikyu_set_stamp_staff_87 | fetched | true |  | no | https://dextcg.com/cards/sv10-87 |
| sv10 | 96 | ebay_team_rockets_tyranitar_staff_96 | fetched | false |  | no | https://www.ebay.com/itm/306517381869 |
| sv10 | 96 | pricecharting_team_rockets_tyranitar_96 | fetched | false |  | no | https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-tyranitar-96 |
| svp | 101 | pokecardvalues_pikachu_svp101_asia_championship_holo | fetched | true | holo | no | https://pokecardvalues.co.uk/cards/Pikachu-SVP101-Holo-Black-Star-Scarlet-Violet-Black-Star-Promos/svp-101-1-17/ |
| svp | 101 | bulbapedia_pikachu_svp_promo_101 | fetched | true |  | no | https://bulbapedia.bulbagarden.net/wiki/Pikachu_(SVP_Promo_101) |
| svp | 225 | pricecharting_pikachu_world_championships_225 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-promo/pikachu-world-championships-225 |
| svp | 225 | mnk_pikachu_svp225_world_championships | fetched | true |  | no | https://www.mnkcardkingdom.com.au/products/pikachu-svp-225-promo-world-championships-2025 |
| swsh2 | 154 | pricecharting_bosss_orders_regional_championships_reverse_154 | fetched | true | reverse | no | https://www.pricecharting.com/game/pokemon-rebel-clash/boss%27s-orders-regional-championships-154 |
| swsh2 | 154 | ebay_bosss_orders_staff_regional_reverse_154 | fetched | false | reverse | no | https://www.ebay.com/itm/256758371933 |
| swshp | SWSH296 | tcgplayer_champions_festival_swsh296_quarter_finalist | fetched | false |  | no | https://www.tcgplayer.com/search/pokemon/product?q=Champions%20Festival%20SWSH296%20Quarter%20Finalist |
| xy8 | 138 | pokecardvalues_giovannis_scheme_regional_reverse_138 | fetched | true | reverse | no | https://pokecardvalues.co.uk/cards/giovannis-scheme-138-162-reverse-holo-regional-championships-breakthrough/xy8-138-3-60/ |
| xy8 | 138 | pricecharting_giovannis_scheme_staff_138 | fetched | true |  | yes | https://www.pricecharting.com/game/pokemon-promo/giovanni%27s-scheme-staff-138 |
| xy9 | 104 | gamenerdz_mistys_determination_regional_staff_reverse_104 | fetched | true | reverse | no | https://www.gamenerdz.com/mistys-determination-104-122-regional-championships-staff-104-league-championship-cards-reverse-holofoil |
| xy9 | 104 | pokecardvalues_mistys_determination_regional_staff_reverse_104 | fetched | true | reverse | no | https://pokecardvalues.co.uk/cards/mistys-determination-104-122-reverse-holo-unlimited-breakpoint/xy9-104-3-1/ |
| xyp | XY27 | ahiddenfortress_champions_festival_finalist_xy27_holo | fetched | true | holo | no | https://www.ahiddenfortress.com/catalog/xy__black_star_promos/5581?filter%5B1855%5D=Naoki+Saito |
| xyp | XY27 | pricecharting_champions_festival_finalist_xy27 | fetched | true |  | no | https://www.pricecharting.com/game/pokemon-promo/champions-festival-finalist-xy27 |


## Guardrails

- Event/staff identity-only sources are preserved but not promoted.
- Live marketplace listing evidence is review-only unless corroborated by a stable checklist-style source.
- Queue rows with no active finish proof remain blocked from write-readiness.
