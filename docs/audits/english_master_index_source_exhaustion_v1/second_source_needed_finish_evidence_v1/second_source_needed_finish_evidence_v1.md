# Second Source Needed Finish Evidence V1

Audit-only pass for stamped/special rows that already had one preserved source and needed a second independent exact source.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, or identity inserts were performed.

## Summary

| metric | value |
| --- | --- |
| target_queue_rows | 10 |
| source_ready_candidates | 9 |
| manual_finish_taxonomy_conflicts | 1 |
| review_only_rows | 0 |
| fixture_records_written | 10 |
| write_ready_created | 0 |
| fingerprint_sha256 | `44d605596df6305fb8e6a96b1ae912b3b315df87034358dee07afee1ab00c23e` |


## Results

| set | number | card | stamp | finish | status | reason |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | National Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| bw5 | 25 | Vaporeon | States Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| bw5 | 37 | Jolteon | Regional Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| bw5 | 84 | Eevee | City Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| dp1 | 52 | Luxio | Staff Prerelease Stamp | normal | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| dp1 | 52 | Luxio | States Championships Staff Stamp | normal | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| me02 | 26 | Suicune | EB Games Stamp | holo | manual_finish_taxonomy_conflict_no_write | Sources disagree between Holo and Cosmo/Cosmos wording for Suicune EB Games Stamp; fail closed until finish taxonomy is adjudicated. |
| sm6 | 102 | Beast Ring | League Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| xy10 | 94 | Chaos Tower | National Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |
| xy8 | 145 | Parallel City | City Championships Staff Stamp | reverse | source_ready_candidate_no_db_write | At least one independent exact source proves set, number, card name, stamp family, and active finish. |


## Source Checks

| set | number | source | status | all_terms | review_only | url |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | pokecardvalues_escavalier_staff_national_reverse_80 | fetched | true | no | https://pokecardvalues.co.uk/cards/escavalier-80-101-reverse-holo-staff-national-championships-noble-victories/bw3-80-3-80/ |
| bw3 | 80 | thewasteland_escavalier_crosshatch_national_80 | fetched | true | yes | https://www.thewastelandgaming.com/catalog/pokmon_singles-organized_play_promos/escavalier__80101__promotional__crosshatch_holo_national_championships_2011/512013 |
| bw5 | 25 | pokecardvalues_vaporeon_staff_states_reverse_25 | fetched | true | no | https://pokecardvalues.co.uk/cards/vaporeon-25-108-reverse-holo-staff-states-championships-dark-explorers/bw5-25-3-84/ |
| bw5 | 37 | pokecardvalues_jolteon_staff_regional_reverse_37 | fetched | true | no | https://pokecardvalues.co.uk/cards/jolteon-37-108-reverse-holo-staff-regional-championships-dark-explorers/bw5-37-3-83/ |
| bw5 | 37 | pricecharting_jolteon_staff_regional_37 | fetched | true | yes | https://www.pricecharting.com/game/pokemon-dark-explorers/jolteon-staff-regional-championship-37 |
| bw5 | 84 | pokecardvalues_eevee_staff_city_reverse_84 | fetched | true | no | https://pokecardvalues.co.uk/cards/eevee-84-108-reverse-holo-staff-city-championships-dark-explorers/bw5-84-3-75/ |
| dp1 | 52 | pokecardvalues_luxio_staff_prerelease_normal_52 | fetched | true | no | https://pokecardvalues.co.uk/cards/luxio-52-130-non-holo-staff-prerelease-diamond-pearl/dp1-52-2-82/ |
| dp1 | 52 | pokecardvalues_luxio_staff_states_normal_52 | fetched | true | no | https://pokecardvalues.co.uk/cards/luxio-52-130-non-holo-staff-states-championships-diamond-pearl/dp1-52-2-84/ |
| me02 | 26 | hobbyscan_suicune_eb_games_holo_26 | fetched | true | yes | https://www.hobbyscan.com/card/379797 |
| me02 | 26 | magicmadhouse_suicune_eb_games_cosmo_26 | fetched | false | yes | https://magicmadhouse.co.uk/pokemon-1/?page=21 |
| sm6 | 102 | pokecardvalues_beast_ring_staff_league_reverse_102 | fetched | true | no | https://pokecardvalues.co.uk/cards/beast-ring-102-131-reverse-holo-staff-league-promo-forbidden-light/sm6-102-3-78/ |
| sm6 | 102 | pricecharting_beast_ring_league_promo_102 | fetched | false | yes | https://www.pricecharting.com/game/pokemon-forbidden-light/beast-ring-league-promo-102 |
| xy10 | 94 | pokecardvalues_chaos_tower_staff_national_reverse_94 | fetched | true | no | https://pokecardvalues.co.uk/cards/chaos-tower-94-124-reverse-holo-staff-national-championships-fates-collide/xy10-94-3-80/ |
| xy10 | 94 | pricecharting_chaos_tower_94_sales_context | fetched | true | yes | https://www.pricecharting.com/game/pokemon-fates-collide/chaos-tower-94 |
| xy8 | 145 | pokecardvalues_parallel_city_staff_city_reverse_145 | fetched | true | no | https://pokecardvalues.co.uk/cards/parallel-city-145-162-reverse-holo-staff-city-championships-breakthrough/xy8-145-3-75/ |
| xy8 | 145 | collectorsedition101_parallel_city_staff_city_reverse_145 | fetched | true | no | https://collectorsedition101.com/products/3754424023 |


## Guardrails

- No write package is created by this report.
- Suicune EB Games remains blocked because source wording conflicts between Holo and Cosmo/Cosmos.
- Review-only crosshatch/holo wording is preserved but not promoted as active finish truth when it does not match the queue finish exactly.
