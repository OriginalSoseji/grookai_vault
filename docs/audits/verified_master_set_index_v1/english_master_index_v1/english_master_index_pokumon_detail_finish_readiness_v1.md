# Pokumon Detail Finish Readiness V1

Generated: 2026-06-22T02:33:01.795Z

Read-only readiness view. No DB writes, no migrations, no apply. Pokumon detail-page finish classes are treated as source evidence candidates only, not final truth.

## Summary

| metric | value |
| --- | --- |
| source_candidate_rows | 193 |
| deduped_target_facts | 56 |
| future_guarded_parent_identity_insert_candidates | 23 |
| blocked_or_review_rows | 33 |
| write_ready_now | 0 |
| fingerprint_sha256 | `f370ff684f879abfe38ae1f82238a6ee0d1447161a50b8d53d0f5e9073346c85` |

## Blockers

| blocker | count |
| --- | --- |
| stamp_label_granularity_governance_needed | 29 |
| base_parent_missing_target_child_finish | 13 |
| target_variant_parent_already_exists_review | 1 |

## Future Guarded Candidates

| set | number | card | variant | finish | sources |
| --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | normal | 1 |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | 1 |
| bw5 | 25 | Vaporeon | championship_staff_stamp | normal | 1 |
| bw5 | 25 | Vaporeon | championship_staff_stamp | reverse | 1 |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | 1 |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal | 1 |
| ex6 | 50 | Wartortle | prerelease_stamp | normal | 1 |
| ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | normal | 1 |
| hgss2 | 37 | Poliwhirl | staff_stamp | reverse | 1 |
| hgss4 | 20 | Electivire | prerelease_stamp | normal | 1 |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse | 1 |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse | 4 |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | 1 |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | 1 |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse | 1 |
| sm6 | 108 | Judge | professor_program_stamp | reverse | 1 |
| sm6 | 113 | Mysterious Treasure | league_stamp | reverse | 2 |
| swsh2 | 167 | Sonia | professor_program_stamp | reverse | 1 |
| swsh3 | 110 | Hydreigon | thank_you_stamp | reverse | 1 |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse | 1 |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse | 1 |
| xy11 | 103 | Ninja Boy | league_stamp | reverse | 2 |
| xy12 | 90 | Double Colorless Energy | national_championships_stamp | reverse | 12 |

## Blocked / Review Sample

| set | number | card | variant | finish | blockers |
| --- | --- | --- | --- | --- | --- |
| bw11 | 97 | Deino | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| bw11 | 97 | Deino | league_stamp | reverse | stamp_label_granularity_governance_needed |
| bw5 | 4 | Scyther | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| bw5 | 4 | Scyther | league_stamp | reverse | stamp_label_granularity_governance_needed |
| bw7 | 38 | Delibird | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| bw7 | 38 | Delibird | league_stamp | reverse | stamp_label_granularity_governance_needed |
| dp1 | 52 | Luxio | staff_prerelease_stamp | normal | target_variant_parent_already_exists_review |
| sm1 | 20 | Tsareena | league_stamp | reverse | stamp_label_granularity_governance_needed |
| sm2 | 55 | Oricorio | league_stamp | reverse | stamp_label_granularity_governance_needed |
| sm3 | 41 | Raichu | league_stamp | cosmos | stamp_label_granularity_governance_needed |
| sm3 | 41 | Raichu | league_stamp | reverse | stamp_label_granularity_governance_needed |
| sm5 | 83 | Magnezone | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| sm5 | 83 | Magnezone | league_stamp | reverse | stamp_label_granularity_governance_needed |
| sm7 | 24 | Magcargo | league_stamp | reverse | stamp_label_granularity_governance_needed |
| sm8 | 59 | Suicune | legendary_pok_mon_stamp | cosmos | base_parent_missing_target_child_finish |
| sm8 | 82 | Zebstrika | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy1 | 56 | Pumpkaboo | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy1 | 56 | Pumpkaboo | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy1 | 64 | Solrock | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy1 | 64 | Solrock | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy10 | 63 | Lucario | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy10 | 94 | Chaos Tower | national_championships_staff_stamp | cosmos | base_parent_missing_target_child_finish |
| xy11 | 15 | Volcarona | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy11 | 15 | Volcarona | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy12 | 53 | Mew | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy12 | 53 | Mew | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy3 | 8 | Shelmet | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy3 | 8 | Shelmet | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy4 | 66 | Klefki | league_stamp | cosmos | base_parent_missing_target_child_finish, stamp_label_granularity_governance_needed |
| xy4 | 66 | Klefki | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy8 | 145 | Parallel City | city_championships_staff_stamp | cosmos | base_parent_missing_target_child_finish |
| xy8 | 78 | Marowak | league_stamp | reverse | stamp_label_granularity_governance_needed |
| xy9 | 40 | Greninja | league_stamp | reverse | stamp_label_granularity_governance_needed |
