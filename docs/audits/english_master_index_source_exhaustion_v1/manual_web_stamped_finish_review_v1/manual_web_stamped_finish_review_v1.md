# Manual Web Stamped Finish Review V1

Audit-only review of stable human-readable/checklist pages found during stamped blocker source acquisition.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- write_ready_now: 0

## Summary

- curated_source_rows: 13
- exact_pkg15k_matches: 13
- unmatched_rows: 0
- conflict_review_rows: 2

## Exact Source Rows

| set | number | card | variant | finish | source | match |
| --- | --- | --- | --- | --- | --- | --- |
| sm6 | 102 | Beast Ring | league_stamp | reverse | bulbapedia_forbidden_light_set_list | exact_pkg15k_match |
| sm6 | 102 | Beast Ring | league_stamp | reverse | nobleknight_league_championship_cards | exact_pkg15k_match |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | bulbapedia_forbidden_light_set_list | exact_pkg15k_match |
| sm6 | 105 | Diantha | regional_championships_staff_stamp | reverse | bulbapedia_forbidden_light_set_list | exact_pkg15k_match |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | nobleknight_league_championship_cards | exact_pkg15k_match |
| sm4 | 95 | Gladion | regional_championships_staff_stamp | reverse | nobleknight_league_championship_cards | exact_pkg15k_match |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | nobleknight_league_championship_cards | exact_pkg15k_match |
| sm1 | 135 | Ultra Ball | oceania_championships_staff_stamp | reverse | pokumon_promo_database | exact_pkg15k_match |
| swsh10 | 150 | Roxanne | regional_championships_stamp | reverse | pricecharting_historic_sales_title | exact_pkg15k_match |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | pokumon_promo_database | exact_pkg15k_match |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | pokumon_promo_database | exact_pkg15k_match |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | pokumon_promo_database | exact_pkg15k_match |
| dp1 | 98 | Shinx | city_championships_stamp | normal | pokumon_promo_database | exact_pkg15k_match |

## Conflict Review Rows

| set | number | card | variant | current_finish | observed_finish | source |
| --- | --- | --- | --- | --- | --- | --- |
| me02 | 026 | Suicune | gamestop_stamp | holo | cosmos | tcgplayer_misc_product |
| me02 | 026 | Suicune | gamestop_stamp | holo | cosmos | pokescope_variant_page |

## Governance

- These rows do not execute DB writes.
- Stable checklist/product pages may be used by a later guarded readiness package only when exact identity and finish remain aligned.
- Suicune GameStop is intentionally not promoted as plain holo because multiple sources identify the active finish as cosmos.
