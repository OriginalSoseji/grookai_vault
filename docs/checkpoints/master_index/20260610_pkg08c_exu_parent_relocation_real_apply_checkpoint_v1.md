# PKG-08C EXU Parent Relocation Real Apply V1

Real apply for the approved EXU parent relocation package.

## Result

- apply_status: pkg08c_exu_parent_relocation_real_apply_committed
- package_fingerprint_sha256: `89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62`
- parent_updates: 28
- mapping_inserts: 1
- db_write_committed: true
- migrations_created: false
- deletes_performed: false
- merges_performed: false
- unsupported_cleanup_performed: false
- global_apply_performed: false
- stop_findings: 0

## Post-Apply Verification

| set_code | rows |
| --- | --- |
| exu | 28 |

- target_rows_with_holo: 28
- target_rows_with_tcgdex_mapping: 28

## Rollback Preview

Rollback would move the 28 listed parent rows back to `ex10` and remove only the package-created `exu-?` TCGdex mapping. Do not run rollback unless explicitly approved.
