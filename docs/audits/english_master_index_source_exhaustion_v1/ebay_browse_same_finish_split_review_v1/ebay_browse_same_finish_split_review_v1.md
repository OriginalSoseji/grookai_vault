# eBay Browse Same-Finish Split Review V1

Audit-only source review for same-finish stamped split candidates. This report does not promote eBay listings into canonical truth and does not perform DB writes.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- write_ready_now: 0
- source_policy: eBay Browse listing titles are volatile review evidence only; they are not automatically promoted into Master Index truth.

## Summary

- rows_targeted: 26
- browse_queries_attempted: 26
- browse_queries_succeeded: 0
- exact_title_match_rows: 0
- exact_title_matches: 0
- partial_title_match_rows: 0

| review_status | count |
| --- | --- |
| source_error | 26 |

## Review Rows

| set | number | card | variant | finish | search | exact | partial | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 25 | Vaporeon | states_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 37 | Jolteon | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 84 | Eevee | city_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| dp1 | 52 | Luxio | staff_prerelease_stamp | normal | source_error | 0 | 0 | source_error |
| dp1 | 52 | Luxio | states_championships_staff_stamp | normal | source_error | 0 | 0 | source_error |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal | source_error | 0 | 0 | source_error |
| me02 | 26 | Suicune | eb_games_stamp | holo | source_error | 0 | 0 | source_error |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| sm6 | 102 | Beast Ring | league_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| swsh10 | 150 | Roxanne | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| xy1 | 84 | Doublade | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | source_error | 0 | 0 | source_error |
| xy10 | 94 | Chaos Tower | national_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |
| xy8 | 145 | Parallel City | city_championships_staff_stamp | reverse | source_error | 0 | 0 | source_error |

## Governance

- eBay Browse evidence is volatile marketplace evidence.
- Exact title matches are review candidates only.
- A future promotion path must preserve item URL, retrieval timestamp, and title validation checks, and must not overwrite stronger preserved source evidence.
