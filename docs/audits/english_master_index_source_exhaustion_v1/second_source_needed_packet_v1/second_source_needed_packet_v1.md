# Second Source Needed Packet V1

Generated: 2026-06-22T14:24:45.533Z

This is audit-only. It extracts the remaining stamped/special rows that specifically need one additional independent exact source before any guarded write package can be considered.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| rows | 10 |
| write_ready_now | 0 |
| fingerprint_sha256 | `a67881a2d8e73a65277cf9c21e8ed43454851df849c663611450d52a2e376fd7` |

## Rows

| set | number | card | stamp | status | first search phrase |
| --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | National Championships Staff Stamp | blocked_second_independent_source_needed | "Escavalier" "80" "Noble Victories" "National Championships Staff Stamp" |
| bw5 | 25 | Vaporeon | States Championships Staff Stamp | blocked_second_independent_source_needed | "Vaporeon" "25" "Dark Explorers" "States Championships Staff Stamp" |
| bw5 | 37 | Jolteon | Regional Championships Staff Stamp | blocked_second_independent_source_needed | "Jolteon" "37" "Dark Explorers" "Regional Championships Staff Stamp" |
| bw5 | 84 | Eevee | City Championships Staff Stamp | blocked_second_independent_source_needed | "Eevee" "84" "Dark Explorers" "City Championships Staff Stamp" |
| dp1 | 52 | Luxio | Staff Prerelease Stamp | blocked_second_independent_source_needed | "Luxio" "52" "Diamond & Pearl" "Staff Prerelease Stamp" |
| dp1 | 52 | Luxio | States Championships Staff Stamp | blocked_second_independent_source_needed | "Luxio" "52" "Diamond & Pearl" "States Championships Staff Stamp" |
| me02 | 26 | Suicune | EB Games Stamp | blocked_second_independent_source_needed | "Suicune" "26" "Phantasmal Flames" "EB Games Stamp" |
| sm6 | 102 | Beast Ring | League Staff Stamp | blocked_second_independent_source_needed | "Beast Ring" "102" "Forbidden Light" "League Staff Stamp" |
| xy10 | 94 | Chaos Tower | National Championships Staff Stamp | blocked_second_independent_source_needed | "Chaos Tower" "94" "Fates Collide" "National Championships Staff Stamp" |
| xy8 | 145 | Parallel City | City Championships Staff Stamp | blocked_second_independent_source_needed | "Parallel City" "145" "BREAKthrough" "City Championships Staff Stamp" |

## Rule

Do not promote any row from this packet unless the source proves:

```text
set + card number + card name + exact stamp/variant + finish when applicable + source URL
```
