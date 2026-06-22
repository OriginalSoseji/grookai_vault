# Small Custom Stamp Web Evidence V1

Audit-only fresh web evidence pass for selected small-custom stamp rows.

No DB writes, migrations, applies, cleanup, quarantine, parent inserts, child inserts, or identity inserts were performed.

## Summary

| metric | value |
| --- | --- |
| target_queue_rows | 31 |
| targets_in_script | 5 |
| source_ready_candidates | 3 |
| identity_or_review_supported_finish_unproven | 2 |
| fixture_records_written | 3 |
| write_ready_created | 0 |
| fingerprint_sha256 | `84cf82075d8a7249544ef24d8cd70d859bb8935b469d062c1e2834f8736f16dc` |


## Results

| set | number | card | stamp | finish | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| ex10 | 29 | Lugia | Pokemon Rocks America Stamped; 2005 | normal | source_ready_candidate_no_db_write | At least one source proves exact small-custom stamp identity and active finish. Source-delta must still decide whether this is useful. |
| ex9 | 60 | Pikachu | San Diego Comic Con International Stamped; 2005 | normal | source_ready_candidate_no_db_write | At least one source proves exact small-custom stamp identity and active finish. Source-delta must still decide whether this is useful. |
| ex9 | 70 | Treecko | Indianapolis GenCon Stamped; 2005 | normal | source_ready_candidate_no_db_write | At least one source proves exact small-custom stamp identity and active finish. Source-delta must still decide whether this is useful. |
| ex12 | 5 | Gengar | Gym Challenge Stamped; 2006 2007 |  | identity_or_review_supported_finish_unproven_no_write | Source evidence supports identity or review context, but active finish is not clean enough for promotion. |
| ex11 | 64 | Ditto | Games Expo Stamped; 2007 |  | identity_or_review_supported_finish_unproven_no_write | Source evidence supports identity or review context, but active finish is not clean enough for promotion. |


## Source Checks

| set | number | source | all_terms | finish | review_only | url |
| --- | --- | --- | --- | --- | --- | --- |
| ex10 | 29 | pokecardvalues_lugia_rocks_america_non_holo_29 | true | normal | no | https://pokecardvalues.co.uk/cards/lugia-29-115-non-holo-exclusive-unseen-forces/ex10-29-2-30/ |
| ex10 | 29 | facetofacegames_lugia_rocks_america_non_holo_29 | false | normal | no | https://facetofacegames.com/en-us/products/lugia-29115-promo-pokemon-rocks-america-2005-ex10msp-29-non-holo |
| ex9 | 60 | pokecardvalues_pikachu_sdcc_non_holo_60 | true | normal | no | https://pokecardvalues.co.uk/cards/pikachu-60-106-non-holo-comic-con-promo-emerald/ex9-60-2-24/ |
| ex9 | 60 | pricecharting_pikachu_comic_con_60 | true |  | no | https://www.pricecharting.com/game/pokemon-emerald/pikachu-comic-con-promo-60 |
| ex9 | 70 | pokecardvalues_treecko_gencon_non_holo_70 | true | normal | no | https://pokecardvalues.co.uk/cards/treecko-70-106-non-holo-exclusive-emerald/ex9-70-2-30/ |
| ex9 | 70 | pricecharting_treecko_gencon_70 | true |  | no | https://www.pricecharting.com/game/pokemon-promo/treecko-gencon-70 |
| ex12 | 5 | pricecharting_gengar_gym_challenge_5 | true |  | no | https://www.pricecharting.com/game/pokemon-legend-maker/gengar-gym-challenge-5 |
| ex12 | 5 | sportscardinvestor_gengar_reverse_holo_gym_challenge_context_5 | true | reverse | yes | https://www.sportscardinvestor.com/cards/gengar-pokemon/2006-ex-legend-maker-reverse-holo-05-92 |
| ex11 | 64 | pricecharting_ditto_games_expo_64 | true |  | no | https://www.pricecharting.com/game/pokemon-delta-species/ditto-games-expo-64 |
| ex11 | 64 | landrypop_ditto_games_expo_64 | true |  | no | https://www.landrypop.com/auctions/2026/03/pokemon-30-icons-rarities-grails/224 |
