# PKG-15K Stamped Identity Expansion Candidates V1

Audit-only expansion report for Poke Card Values stamped rows that exposed multiple exact source products for the same set/card/number/name.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- parent_rows_reviewed: 19
- exact_source_products_reviewed: 38
- expansion_candidate_rows: 38
- identity_multi_source_rows: 25
- finish_multi_source_rows: 11
- current_identity_single_source_rows: 2
- missing_more_specific_identity_rows: 22
- fingerprint_sha256: `832eba38f63aa2660a65112067730b397e7da5fa536d41791d7c91e63de4b695`

| expansion_status | rows |
| --- | --- |
| candidate_missing_more_specific_identity_single_source | 11 |
| candidate_missing_more_specific_identity_multi_source_finish_single_source | 8 |
| current_master_identity_multi_source_finish_multi_source_review_ready | 8 |
| current_master_identity_multi_source_finish_single_source | 6 |
| candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready | 3 |
| current_master_identity_single_source_finish_supported | 2 |

## Expanded Variant Keys

| expanded_variant_key | rows |
| --- | --- |
| regional_championships_staff_stamp | 10 |
| regional_championships_stamp | 9 |
| city_championships_staff_stamp | 3 |
| city_championships_stamp | 3 |
| national_championships_staff_stamp | 2 |
| national_championships_stamp | 2 |
| states_championships_staff_stamp | 2 |
| eb_games_stamp | 1 |
| europe_championships_staff_stamp | 1 |
| gamestop_stamp | 1 |
| league_staff_stamp | 1 |
| league_stamp | 1 |
| oceania_championships_staff_stamp | 1 |
| staff_prerelease_stamp | 1 |

## Rows

| set | number | name | expanded_variant_key | finish | status |
| --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | current_master_identity_multi_source_finish_single_source |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| bw5 | 25 | Vaporeon | states_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| bw5 | 37 | Jolteon | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_single_source |
| bw5 | 84 | Eevee | city_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | current_master_identity_multi_source_finish_single_source |
| dp1 | 52 | Luxio | staff_prerelease_stamp | normal | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| dp1 | 52 | Luxio | states_championships_staff_stamp | normal | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| dp1 | 98 | Shinx | city_championships_stamp | normal | current_master_identity_multi_source_finish_multi_source_review_ready |
| me02 | 26 | Suicune | eb_games_stamp | holo | current_master_identity_multi_source_finish_single_source |
| me02 | 26 | Suicune | gamestop_stamp | holo | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | current_master_identity_single_source_finish_supported |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| sm1 | 135 | Ultra Ball | oceania_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready |
| sm4 | 95 | Gladion | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_single_source |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| sm6 | 102 | Beast Ring | league_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| sm6 | 102 | Beast Ring | league_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| sm6 | 105 | Diantha | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| swsh10 | 150 | Roxanne | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| swsh10 | 150 | Roxanne | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_multi_source_finish_single_source |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| xy1 | 84 | Doublade | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | current_master_identity_multi_source_finish_single_source |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | current_master_identity_single_source_finish_supported |
| xy10 | 94 | Chaos Tower | national_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |
| xy8 | 145 | Parallel City | city_championships_staff_stamp | reverse | candidate_missing_more_specific_identity_single_source |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | current_master_identity_multi_source_finish_multi_source_review_ready |

## Rule

These rows are not write authority. Poke Card Values can prove an exact stamped product title and active finish, but Grookai still requires a second independent source before the expanded identity becomes Master Index truth or DB reconciliation authority.
