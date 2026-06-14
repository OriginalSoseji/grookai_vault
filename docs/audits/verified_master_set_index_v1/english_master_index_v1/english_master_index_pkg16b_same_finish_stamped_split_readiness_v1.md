# PKG-16B Same-Finish Stamped Split Readiness V1

Audit-only split-readiness report for stamped rows where one card has multiple exact source labels sharing the same active finish.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- ambiguous_source_rows: 21
- split_candidate_rows: 43
- already_applied_verified: 17
- second_source_needed: 18
- conflict_blocked: 3
- metadata_strategy_blocked: 5
- fingerprint_sha256: `d2ef7b3bf998f85ce0b38ae33be8de4496b377be6f75087c0e73c4264f4bc9a4`

| status | rows |
| --- | --- |
| blocked_second_independent_source_needed | 18 |
| already_applied_verified | 17 |
| blocked_battle_academy_display_metadata_strategy | 5 |
| blocked_conflicting_finish_observation | 3 |

## Remaining Split Candidates

| set | number | name | variant | finish | sources | status |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | 1 | blocked_second_independent_source_needed |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | 1 | blocked_conflicting_finish_observation |
| bw5 | 25 | Vaporeon | states_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| bw5 | 37 | Jolteon | regional_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| bw5 | 84 | Eevee | city_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| dp1 | 52 | Luxio | staff_prerelease_stamp | normal | 1 | blocked_second_independent_source_needed |
| dp1 | 52 | Luxio | states_championships_staff_stamp | normal | 1 | blocked_second_independent_source_needed |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal | 1 | blocked_second_independent_source_needed |
| me02 | 26 | Suicune | eb_games_stamp | holo | 1 | blocked_second_independent_source_needed |
| me02 | 26 | Suicune | gamestop_stamp | holo | 1 | blocked_conflicting_finish_observation |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | 1 | blocked_second_independent_source_needed |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| sm6 | 102 | Beast Ring | league_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| swsh6 | 23 | Larvesta | battle_academy_deck_mark | normal | 1 | blocked_battle_academy_display_metadata_strategy |
| swsh6 | 23 | Larvesta | battle_academy_deck_mark | normal | 1 | blocked_battle_academy_display_metadata_strategy |
| swsh6 | 23 | Larvesta | battle_academy_deck_mark | normal | 1 | blocked_battle_academy_display_metadata_strategy |
| swsh6 | 24 | Volcarona | battle_academy_deck_mark | normal | 1 | blocked_battle_academy_display_metadata_strategy |
| swsh6 | 24 | Volcarona | battle_academy_deck_mark | normal | 1 | blocked_battle_academy_display_metadata_strategy |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | 1 | blocked_conflicting_finish_observation |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| xy10 | 94 | Chaos Tower | national_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
| xy8 | 145 | Parallel City | city_championships_staff_stamp | reverse | 1 | blocked_second_independent_source_needed |
