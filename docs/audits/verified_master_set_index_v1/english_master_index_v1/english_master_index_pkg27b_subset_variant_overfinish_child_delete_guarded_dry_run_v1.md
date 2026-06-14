# PKG-27B Subset Variant Overfinish Child Delete Guarded Dry Run V1

Rollback-only dry-run proof for deterministic subset/number-prefix overfinish child deletes.

## Safety

- real_apply_performed: false
- db_writes_persisted: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Summary

- target_rows: 131
- blocked_rows: 0
- dry_run_status: pkg27b_guarded_dry_run_passed_rolled_back_no_durable_change
- rollback_proof_hash_match: true
- package_fingerprint: 2c6d003783412de97d2e273bf4cc26970edba2818bcab2a7609f6ab9bf25b96a
- dry_run_proof_hash: edefb0f6b8ae5f1773fb96000a3e8ac29ea88cf760bd26ae73b0293e49c55994

## Target Families

| family | rows |
| --- | --- |
| generations_radiant_collection_overfinish | 64 |
| celebrations_classic_collection_overfinish | 19 |
| trainer_gallery_normal_overfinish | 17 |
| call_of_legends_sl_reverse_overfinish | 11 |
| legendary_treasures_radiant_collection_overfinish | 10 |
| arceus_ar_prefix_overfinish | 4 |
| rising_rivals_rotom_prefix_overfinish | 4 |
| shiny_secret_prefix_holo_overfinish | 2 |

## Target Sets

| set | rows |
| --- | --- |
| g1 | 64 |
| cel25c | 19 |
| swsh12tg | 17 |
| col1 | 11 |
| bw11 | 10 |
| pl4 | 5 |
| pl2 | 4 |
| pl1 | 1 |

## Target Finishes

| finish | rows |
| --- | --- |
| normal | 62 |
| reverse | 51 |
| holo | 18 |

## Guardrails

- This was rollback-only.
- No durable DB change was performed.
- No migrations were created.
- No parent writes are included.
- Real apply requires exact approval with package fingerprint and dry-run proof hash.
