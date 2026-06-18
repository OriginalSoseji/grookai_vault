# Residual Source Ready Variants Real Apply V1

## Result

- apply_status: residual_source_ready_parent_insert_applied
- post_apply_verified: true
- package_fingerprint_sha256: `d8868b21fb25b7834ad967dcd4659a8ff7ff750b4a516825eb2d6a4a0a2d96c2`
- sql_hash_sha256: `15922fd72f503afa5ffd0af086680222ae19c5422d07f38297a65d1951c0d32a`
- no_global_apply: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Scope

| metric | value |
| --- | --- |
| target_rows | 4 |
| parent_inserts | 4 |
| identity_inserts | 4 |
| child_inserts | 4 |
| deletes | 0 |
| merges | 0 |
| source_unique_finish_rows | 0 |
| by_set | {"base1":2,"base3":1,"gym2":1} |
| by_finish | {"normal":3,"holo":1} |
| by_variant | {"corrected_text_variant":1,"d_fending_error":1,"missing_holo_evolution_box_error":1,"sideways_fighting_energy_error":1} |

## Targets

| set | number | name | variant | modifier | finish |
| --- | --- | --- | --- | --- | --- |
| base1 | 17 | Beedrill | d_fending_error | recognized_error:d_fending_text | normal |
| base1 | 47 | Diglett | sideways_fighting_energy_error | recognized_error:sideways_fighting_energy | normal |
| base3 | 15 | Zapdos | missing_holo_evolution_box_error | recognized_error:missing_holo_evolution_box | holo |
| gym2 | 119 | Rocket's Minefield Gym | corrected_text_variant | text_variant:corrected_damage_counter_text | normal |
