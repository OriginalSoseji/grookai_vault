# Stamped/Special Bulk Post-Apply Verify V1

Read-only verifier for the five-package stamped/special bulk gate.

This report is designed to be safe before and after real apply. Before apply it should report `not_applied`; after apply it should report `passed`.

## Summary

| metric | value |
| --- | --- |
| verification_status | not_applied |
| apply_detected | false |
| expected_parent_rows | 78 |
| present_parent_rows | 0 |
| expected_identity_rows | 78 |
| present_identity_rows | 0 |
| expected_child_rows | 79 |
| present_child_rows | 0 |
| verified_child_rows | 0 |
| forbidden_stamped_child_rows | 0 |
| db_writes_performed | false |
| migrations_created | false |
| fingerprint_sha256 | `b9939c614c0456806574279898897b82f3375d21030730a2501e28337ce171fc` |

## Package Sources

| package | targets | parents | children | rollback | fingerprint |
| --- | --- | --- | --- | --- | --- |
| POKUMON-DETAIL-PARENT-INSERTS | 23 | 22 | 23 | true | `d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0` |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | 46 | 46 | 46 | true | `c5bf150695b2e4c2d009de7e4c39cb2e4acf341ceaccb64e6bd2e0d20d741fc1` |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | 5 | 5 | 5 | true | `46ee2cb0ad4702303aee2da1964578169dc101e6811d6d4a5b5655c3ba99893f` |
| DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS | 2 | 2 | 2 | true | `e69e902cea92414cc5e2c8e25679815713c02ef052d15c15d9e4ee5bb8d8019b` |
| SECOND-SOURCE-MANUAL-PARENT-INSERTS | 3 | 3 | 3 | true | `1a6ab61b6803b788700cc123927c909f80e9de955eeb9fa4c44af9ee483c0cc2` |

## Finish Scope

| finish | target rows |
| --- | --- |
| cosmos | 1 |
| holo | 7 |
| normal | 6 |
| reverse | 65 |

## Verification Notes

- This script opens a read-only transaction and rolls it back.
- The script reads only exact target parent and child IDs from frozen guarded dry-run artifacts.
- `finish_key=stamped` remains forbidden as a child printing finish.
- A `not_applied` status is expected until the exact real apply phrase is approved and executed.

## Not Verified Rows

| package | set | number | card | stamp | finish | blockers |
| --- | --- | --- | --- | --- | --- | --- |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | dv1 | 10 | Latios | Dragon Vault Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | dv1 | 11 | Rayquaza | Dragon Vault Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | dv1 | 16 | Haxorus | Dragon Vault Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | dv1 | 6 | Bagon | League Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-REVIEW-READY-PARENT-INSERTS | dv1 | 7 | Shelgon | League Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS | dv1 | 17 | Druddigon | Dragon Vault Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| DV1-STAMP-HOLO-SECOND-WAVE-PARENT-INSERTS | dv1 | 8 | Salamence | League Stamp | holo | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | bw11 | 97 | Deino | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | bw5 | 4 | Scyther | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | bw5 | 4 | Scyther | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | bw7 | 38 | Delibird | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | bw7 | 38 | Delibird | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm1 | 20 | Tsareena | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm1 | 20 | Tsareena | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm1 | 20 | Tsareena | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm1 | 20 | Tsareena | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm2 | 55 | Oricorio | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm2 | 55 | Oricorio | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm2 | 55 | Oricorio | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm2 | 55 | Oricorio | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm3 | 41 | Raichu | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm3 | 41 | Raichu | Fourth Place League Stamp | cosmos | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm5 | 83 | Magnezone | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm7 | 24 | Magcargo | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm7 | 24 | Magcargo | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm7 | 24 | Magcargo | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm7 | 24 | Magcargo | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm8 | 82 | Zebstrika | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm8 | 82 | Zebstrika | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm8 | 82 | Zebstrika | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | sm8 | 82 | Zebstrika | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy1 | 56 | Pumpkaboo | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy1 | 56 | Pumpkaboo | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy1 | 56 | Pumpkaboo | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy1 | 64 | Solrock | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy1 | 64 | Solrock | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy10 | 63 | Lucario | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy10 | 63 | Lucario | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy11 | 15 | Volcarona | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy11 | 15 | Volcarona | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy11 | 15 | Volcarona | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy12 | 53 | Mew | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy3 | 8 | Shelmet | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy3 | 8 | Shelmet | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy4 | 66 | Klefki | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy4 | 66 | Klefki | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy4 | 66 | Klefki | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy8 | 78 | Marowak | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy8 | 78 | Marowak | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy8 | 78 | Marowak | Second Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy8 | 78 | Marowak | Third Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy9 | 40 | Greninja | First Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS | xy9 | 40 | Greninja | Fourth Place League Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | bw3 | 80 | Escavalier | national_championships_staff_stamp | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | bw3 | 80 | Escavalier | national_championships_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | bw5 | 25 | Vaporeon | championship_staff_stamp | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | bw5 | 25 | Vaporeon | championship_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | dp1 | 98 | Shinx | city_championships_staff_stamp | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | ex6 | 50 | Wartortle | prerelease_stamp | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | hgss2 | 37 | Poliwhirl | staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | hgss4 | 20 | Electivire | prerelease_stamp | normal | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm4 | 95 | Gladion | regional_championships_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm6 | 108 | Judge | professor_program_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | sm6 | 113 | Mysterious Treasure | league_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | swsh2 | 167 | Sonia | professor_program_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | swsh3 | 110 | Hydreigon | thank_you_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | xy11 | 103 | Ninja Boy | league_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| POKUMON-DETAIL-PARENT-INSERTS | xy12 | 90 | Double Colorless Energy | national_championships_stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| SECOND-SOURCE-MANUAL-PARENT-INSERTS | bw5 | 25 | Vaporeon | Regional Championships Staff Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| SECOND-SOURCE-MANUAL-PARENT-INSERTS | sm1 | 135 | Ultra Ball | Europe Championships Staff Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
| SECOND-SOURCE-MANUAL-PARENT-INSERTS | xy1 | 085 | Aegislash | Regional Championships Staff Stamp | reverse | target_parent_missing, target_child_missing, active_identity_missing, variant_mismatch, printed_identity_modifier_mismatch, finish_mismatch, gv_id_mismatch, printing_gv_id_mismatch |
