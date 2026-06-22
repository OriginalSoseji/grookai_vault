# Professor Program Finish Evidence V1

Audit-only pass for the Professor Program stamped/special queue bucket.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, or identity inserts were performed.

## Summary

| metric | value |
| --- | --- |
| target_queue_rows | 10 |
| source_ready_candidates | 1 |
| identity_supported_finish_still_single_source | 4 |
| identity_supported_active_finish_unproven | 1 |
| queue_taxonomy_issues | 4 |
| fixture_records_written | 1 |
| write_ready_created | 0 |
| fingerprint_sha256 | `9db38594e98e1f634b4fe5ce01b2f41a1cf2ff34b5c296e436f6fa7ae45f0079` |


## Results

| set | number | card | status | finish | reason |
| --- | --- | --- | --- | --- | --- |
| dp3 | 122 | Professor Oak's Visit | identity_supported_finish_still_single_source_no_write | normal | Existing pkmn.gg fixture supports active finish, but fetched sources only corroborate identity or variant family. |
| ex15 | 79 | Professor Elm's Training Method | identity_supported_finish_still_single_source_no_write | normal | Existing pkmn.gg fixture supports active finish, but fetched sources only corroborate identity or variant family. |
| ex6 | 98 | Prof. Oak's Research | identity_supported_finish_still_single_source_no_write | normal | Existing pkmn.gg fixture supports active finish, but fetched sources only corroborate identity or variant family. |
| hgss1 | 100 | Professor Elm's Training Method | source_ready_candidate_no_db_write | reverse | Existing pkmn.gg exact finish fixture and one fetched second source agree on active finish. |
| sv02 | 66 | Voltorb | identity_supported_active_finish_unproven_no_write |  | Fetched sources corroborate identity/stamp family but not exact active finish. |
| swsh1 | 175 | Pokémon Catcher | queue_taxonomy_issue_no_write | stamped | Fetched source evidence supports a deck/product stamp, not Professor Program. Do not insert as Professor Program. |
| swsh1 | 177 | Potion | queue_taxonomy_issue_no_write | stamped | Fetched source evidence supports a deck/product stamp, not Professor Program. Do not insert as Professor Program. |
| swsh8 | 29 | Vulpix | queue_taxonomy_issue_no_write | stamped | Fetched source evidence supports a deck/product stamp, not Professor Program. Do not insert as Professor Program. |
| swsh8 | 46 | Sizzlipede | queue_taxonomy_issue_no_write | stamped | Fetched source evidence supports a deck/product stamp, not Professor Program. Do not insert as Professor Program. |
| swsh9 | 147 | Professor's Research | identity_supported_finish_still_single_source_no_write | reverse | Existing pkmn.gg fixture supports active finish, but fetched sources only corroborate identity or variant family. |


## Source Checks

| set | number | source | status | all_terms | claimed_finish | url |
| --- | --- | --- | --- | --- | --- | --- |
| dp3 | 122 | pricecharting_professor_oaks_visit_professor_program_122 | fetched | true |  | https://www.pricecharting.com/game/pokemon-secret-wonders/professor-oak%27s-visit-professor-program-122 |
| dp3 | 122 | collectorsedition101_professor_oaks_visit_professor_program | fetched | true |  | https://collectorsedition101.com/products/51347384 |
| ex15 | 79 | gemtracker_professor_elms_training_method_professor_program_79 | fetched | true |  | https://gemtracker.co/en/pokemon/en/ex/ex-miscellaneous-promos/item/card/79-professor-elms-training-method/2004301/universal-population-report?version=31971 |
| ex15 | 79 | pricecharting_professor_elms_training_method_79 | fetched | false |  | https://www.pricecharting.com/pt/game/pokemon-dragon-frontiers/professor-elm%27s-training-method-79 |
| ex6 | 98 | sportscardinvestor_prof_oaks_research_professor_program_98 | fetched | true |  | https://www.sportscardinvestor.com/cards/prof.-oak-s-research-pokemon/2004-ex-firered-leafgreen-promo-professor-program-098-112 |
| ex6 | 98 | dextcg_prof_oaks_research_professor_program_98 | fetched | true |  | https://dextcg.com/cards/ex6-98?countryCode=US |
| hgss1 | 100 | pokecardvalues_professor_elms_training_method_professor_program_reverse_100 | fetched | true | reverse | https://pokecardvalues.co.uk/cards/professor-elms-training-method-100-123-non-holo-unlimited-heartgold-soulsilver/hgss1-100-2-1/ |
| hgss1 | 100 | alt_professor_elms_training_method_crosshatch_professor_program_100 | fetched | false | reverse | https://alt.xyz/itm/216cea7b-387f-438f-9f5c-ef97a8531771/external |
| sv02 | 66 | pricecharting_voltorb_professor_program_66 | fetched | true |  | https://www.pricecharting.com/game/pokemon-paldea-evolved/voltorb-professor-program-66 |
| sv02 | 66 | pokebeach_voltorb_professor_program_66 | fetched | false |  | https://www.pokebeach.com/2024/06/special-151-voltorb-promos-awarded-to-tournament-staff-among-the-rarest-english-cards-ever-printed |
| swsh1 | 175 | pricecharting_pokemon_catcher_cinderace_stamp_175 | fetched | true | stamped | https://www.pricecharting.com/game/pokemon-2022-battle-academy/pokemon-catcher-cinderace-stamp-175 |
| swsh1 | 177 | pricecharting_potion_cinderace_stamp_177 | fetched | true | stamped | https://www.pricecharting.com/game/pokemon-2022-battle-academy/potion-42-cinderace-stamp-177 |
| swsh1 | 177 | nwcardgames_potion_pikachu_stamp_177 | fetched | true | stamped | https://www.nwcardgames.com/collections/pokemon-singles/products/potion-177-202-pikachu-stamp-18-battle-academy-2022 |
| swsh8 | 29 | pricecharting_vulpix_cinderace_stamp_29 | fetched | true | stamped | https://www.pricecharting.com/game/pokemon-2022-battle-academy/vulpix-31-cinderace-stamped-29 |
| swsh8 | 46 | pricecharting_sizzlipede_cinderace_stamp_46 | fetched | true | stamped | https://www.pricecharting.com/game/pokemon-2022-battle-academy/sizzlipede-17-cinderace-stamped-46 |
| swsh8 | 46 | bulbapedia_fusion_strike_additional_cards | fetched | true | stamped | https://bulbapedia.bulbagarden.net/wiki/Fusion_Strike_(TCG) |
| swsh9 | 147 | magicmadhouse_professors_research_professor_program_147 | fetched | true |  | https://magicmadhouse.co.uk/pokemon-brilliant-stars-147-172-professors-research-rowan-professor-program-league-promo |
| swsh9 | 147 | pricecharting_professors_research_professor_program_147 | fetched | true |  | https://www.pricecharting.com/search-products?q=professors+research+147&type=prices |


## Guardrails

- Existing pkmn.gg evidence is not enough by itself to create a DB write package.
- Identity-only Professor Program evidence does not prove active finish.
- Battle Academy deck stamps are not Professor Program rows.
- This pass emitted only audit artifacts and one fixture packet for rows with second-source active finish evidence.
