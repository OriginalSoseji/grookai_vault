# WOTC Single Card Errors Real Apply V1

## Result

- apply_status: wotc_single_card_errors_parent_insert_applied
- post_apply_verified: true
- package_fingerprint_sha256: `e86d05bb30c630306e57cc4bdab5ab53f6b101d050c0e395913a2e99798d6c61`
- sql_hash_sha256: `5ca77d000f034f205e014d638bed8a2ad163bf7b499d5dd752721f2245873347`
- no_global_apply: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Scope

| metric | value |
| --- | --- |
| target_rows | 8 |
| parent_inserts | 8 |
| identity_inserts | 8 |
| child_inserts | 8 |
| deletes | 0 |
| merges | 0 |
| source_unique_finish_rows | 1 |
| by_set | {"basep":4,"base1":3,"base5":1} |
| by_finish | {"normal":5,"holo":3} |
| by_variant | {"incorrect_artist_variant":3,"evolution_box_error":1,"no_damage_error":1,"no_hp_error":1,"nonholo_error":1,"stage_error":1} |

## Targets

| set | number | name | variant | modifier | finish |
| --- | --- | --- | --- | --- | --- |
| base1 | 2 | Blastoise | stage_error | recognized_error:missing_stage_text | holo |
| base1 | 12 | Ninetales | no_damage_error | recognized_error:no_damage | holo |
| base1 | 42 | Wartortle | evolution_box_error | recognized_error:evolution_box_wartortle | normal |
| base5 | 5 | Dark Dragonite | nonholo_error | recognized_error:nonholo_holo_number | normal |
| basep | 17 | Dark Persian | no_hp_error | recognized_error:missing_hp | holo |
| basep | 21 | Moltres | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal |
| basep | 22 | Articuno | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal |
| basep | 23 | Zapdos | incorrect_artist_variant | text_variant:incorrect_artist_toshinao_aoki | normal |
