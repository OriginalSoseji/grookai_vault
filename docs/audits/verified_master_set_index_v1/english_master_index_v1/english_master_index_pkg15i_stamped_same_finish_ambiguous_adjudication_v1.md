# PKG-15I Stamped Same-Finish Ambiguous Adjudication V1

Audit-only adjudication for stamped source rows where Poke Card Values found multiple exact stamped product matches. These rows are not write-ready because active finish agreement does not automatically resolve printed identity granularity.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 2

## Summary

- reviewed_rows: 21
- same_finish_supported_rows: 21
- write_ready_now: 2
- fingerprint_sha256: `48d6e2a1f5da4b960a0ef8dc7eade4769139e0681de5449b7187b0c09846eea8`

| adjudication_status | rows |
| --- | --- |
| blocked_identity_granularity_required | 19 |
| ready_for_guarded_battle_academy_deck_mark_display_metadata_route | 2 |

## Rows

| set | number | name | variant | common_finish | source_matches | status |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 25 | Vaporeon | championship_staff_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| dp1 | 52 | Luxio | staff_stamp | normal | 2 | blocked_identity_granularity_required |
| dp1 | 98 | Shinx | city_championships_stamp | normal | 2 | blocked_identity_granularity_required |
| me02 | 26 | Suicune | eb_games_stamp | holo | 2 | blocked_identity_granularity_required |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm6 | 102 | Beast Ring | league_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| swsh10 | 150 | Roxanne | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| swsh6 | 23 | Larvesta | battle_academy_deck_mark | normal | 3 | ready_for_guarded_battle_academy_deck_mark_display_metadata_route |
| swsh6 | 24 | Volcarona | battle_academy_deck_mark | normal | 2 | ready_for_guarded_battle_academy_deck_mark_display_metadata_route |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | 2 | blocked_identity_granularity_required |

## Rule

Multiple exact source rows with the same active finish may prove finish treatment, but they do not prove whether Grookai should store one generic stamped parent or multiple narrower parent identities. These remain blocked until identity-granularity governance is explicit.
