# Base Pikachu Variants Guarded Dry Run V1

Rollback-only dry-run for source-ready Base Set Pikachu print-run, cheek-color, stamp, and release lanes.

## Safety

- db_writes_performed: false
- durable_db_writes_performed: false
- transaction_writes_rolled_back: true
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- rollback_verified: true

## Scope

- parent_inserts: 7
- identity_inserts: 7
- child_inserts: 7
- deletes: 0
- merges: 0
- source_unique_finish_rows: 0

## Targets

| set | number | name | variant | modifier | finish | base_finishes |
| --- | --- | --- | --- | --- | --- | --- |
| base1 | 58 | Pikachu | e3_stamp_red_cheeks | stamp:e3;color:red_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | e3_stamp_yellow_cheeks | stamp:e3;color:yellow_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | first_edition_red_cheeks | edition:first_edition;print_run:shadowless;color:red_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | first_edition_yellow_cheeks | edition:first_edition;print_run:shadowless;color:yellow_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | ghost_stamp_shadowless | print_run:shadowless;stamp_error:ghost_first_edition | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | shadowless_red_cheeks | print_run:shadowless;color:red_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |
| base1 | 58 | Pikachu | shadowless_yellow_cheeks | print_run:shadowless;color:yellow_cheeks | normal | normal, normal, normal, normal, normal, normal, normal |

## Result

- dry_run_status: base_pikachu_variants_parent_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `1707129776982c793e5e507370e1f425acbb9a056f25f8a01dfc165394274dcb`
- sql_hash_sha256: `75ae3600600ea5eb0c730e05cf14a1938dc7d06f1527fce5a4b4d0183494e38a`
- dry_run_proof_sha256: `72203de8200dfe5df1bb2c4c78c518593b1268307ac8a54f87a96c310c48c49b`
- stop_findings: 0

## Approval Text

```text
Approve real SPECIAL-VAR-04-BASE-PIKACHU-VARIANT-PARENT-INSERTS apply only. Fingerprint: 1707129776982c793e5e507370e1f425acbb9a056f25f8a01dfc165394274dcb. SQL hash: 75ae3600600ea5eb0c730e05cf14a1938dc7d06f1527fce5a4b4d0183494e38a. Scope: 7 Base Set Pikachu special-case parent inserts, 7 active identity inserts, 7 normal child printing inserts; source_unique_finish_rows=0; sets base1=7. Dry-run proof: 71b7d277e7f0223377d4671a6637241c5cab460ee3788ab64f6fecfd6f0bcf15 == 71b7d277e7f0223377d4671a6637241c5cab460ee3788ab64f6fecfd6f0bcf15. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```
