# Pokumon Detail Parent Insert Guarded Dry Run V1

Generated: 2026-06-22T02:33:12.182Z

Rollback-only dry-run artifact. No durable writes were performed.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Summary

| metric | value |
| --- | --- |
| source_child_candidate_rows | 23 |
| parent_insert_scope | 22 |
| child_insert_scope | 23 |
| identity_insert_scope | 22 |
| write_ready_for_approval | true |
| rollback_verified | true |
| dry_run_proof_sha256 | f747a15c0c18916645906540f0338d549d9ade5a3f1128f94a981cdb902f2b73 |
| fingerprint_sha256 | `d8dba1ac6b247dd860107630743f1a0e6af2734d569bb63ef11c7d2b018e41a0` |

## Parent Scope

| set | number | card | variant | child finishes |
| --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | normal |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse |
| bw5 | 25 | Vaporeon | championship_staff_stamp | normal, reverse |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal |
| ex6 | 50 | Wartortle | prerelease_stamp | normal |
| ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | normal |
| hgss2 | 37 | Poliwhirl | staff_stamp | reverse |
| hgss4 | 20 | Electivire | prerelease_stamp | normal |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse |
| sm6 | 108 | Judge | professor_program_stamp | reverse |
| sm6 | 113 | Mysterious Treasure | league_stamp | reverse |
| swsh2 | 167 | Sonia | professor_program_stamp | reverse |
| swsh3 | 110 | Hydreigon | thank_you_stamp | reverse |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse |
| xy11 | 103 | Ninja Boy | league_stamp | reverse |
| xy12 | 90 | Double Colorless Energy | national_championships_stamp | reverse |

## Child Scope

| set | number | card | variant | finish |
| --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | normal |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse |
| bw5 | 25 | Vaporeon | championship_staff_stamp | normal |
| bw5 | 25 | Vaporeon | championship_staff_stamp | reverse |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse |
| dp1 | 98 | Shinx | city_championships_staff_stamp | normal |
| ex6 | 50 | Wartortle | prerelease_stamp | normal |
| ex8 | 91 | Space Center | pokemon_10th_anniversary_stamped | normal |
| hgss2 | 37 | Poliwhirl | staff_stamp | reverse |
| hgss4 | 20 | Electivire | prerelease_stamp | normal |
| sm1 | 128 | Professor Kukui | regional_championships_staff_stamp | reverse |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse |
| sm5 | 119 | Cynthia | regional_championships_staff_stamp | reverse |
| sm6 | 108 | Judge | professor_program_stamp | reverse |
| sm6 | 113 | Mysterious Treasure | league_stamp | reverse |
| swsh2 | 167 | Sonia | professor_program_stamp | reverse |
| swsh3 | 110 | Hydreigon | thank_you_stamp | reverse |
| xy1 | 83 | Honedge | regional_championships_staff_stamp | reverse |
| xy1 | 85 | Aegislash | regional_championships_staff_stamp | reverse |
| xy11 | 103 | Ninja Boy | league_stamp | reverse |
| xy12 | 90 | Double Colorless Energy | national_championships_stamp | reverse |

## Required Approval Boundary

Do not real-apply this package without explicit approval. If approved, the exact scope is 22 parent inserts, 22 active identity inserts, and 23 child printing inserts. No deletes, no merges, no migrations.
