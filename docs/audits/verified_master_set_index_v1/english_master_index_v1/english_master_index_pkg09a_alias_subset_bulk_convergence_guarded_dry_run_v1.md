# PKG-09A Alias / Subset Bulk Convergence Guarded Dry-Run V1

Rollback-only guarded dry-run for the PKG-09 bulk alias/subset convergence package.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- transaction_ended_with_rollback: true

## Scope

| metric | value |
| --- | --- |
| package_id | PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE |
| source_readiness_fingerprint | d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a |
| candidate_rows | 155 |
| parent_set_code_update_rows | 105 |
| parent_insert_rows | 48 |
| child_insert_rows | 53 |
| external_mapping_insert_rows | 48 |
| blocked_rows_excluded | 36 |
| target_sets | cel25c, mep, swsh12pt5gg, xya |

## By Set

| set | candidate_rows |
| --- | --- |
| cel25c | 25 |
| mep | 54 |
| swsh12pt5gg | 70 |
| xya | 6 |

## Proof

- package_fingerprint_sha256: `d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a`
- dry_run_proof_hash_sha256: `a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f`
- status: pkg09a_alias_subset_bulk_convergence_completed_rolled_back_no_durable_change

No real apply is authorized by this dry-run.
