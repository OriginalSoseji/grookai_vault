# PKG-15I Stamped Same-Finish Ambiguous Adjudication V1

Audit-only adjudication for stamped source rows where Poke Card Values found multiple exact stamped product matches. These rows are not write-ready because active finish agreement does not automatically resolve printed identity granularity.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- reviewed_rows: 22
- same_finish_supported_rows: 22
- write_ready_now: 0
- fingerprint_sha256: `f9978a7a3d3976f2c0f42dfe09b12e682aeb7e03732bf64fcccd41ff3fd0e6fc`

| adjudication_status | rows |
| --- | --- |
| blocked_identity_granularity_required | 22 |

## Rows

| set | number | name | variant | common_finish | source_matches | status |
| --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 25 | Vaporeon | championship_staff_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| bwp | BW50 | Tropical Beach | finalist_stamp | normal | 3 | blocked_identity_granularity_required |
| dp1 | 98 | Shinx | city_championships_stamp | normal | 2 | blocked_identity_granularity_required |
| me02 | 26 | Suicune | eb_games_stamp | holo | 2 | blocked_identity_granularity_required |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm6 | 102 | Beast Ring | league_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm6 | 113 | Mysterious Treasure | league_stamp | reverse | 2 | blocked_identity_granularity_required |
| sm7 | 142 | Rare Candy | league_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy11 | 103 | Ninja Boy | league_stamp | reverse | 2 | blocked_identity_granularity_required |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | 2 | blocked_identity_granularity_required |
| xyp | XY27 | Champions Festival | finalist_stamp | normal | 2 | blocked_identity_granularity_required |

## Rule

Multiple exact source rows with the same active finish may prove finish treatment, but they do not prove whether Grookai should store one generic stamped parent or multiple narrower parent identities. These remain blocked until identity-granularity governance is explicit.
