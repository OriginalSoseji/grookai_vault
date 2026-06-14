# PKG-29B Base Cosmos Overfinish Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-29A base cosmos overfinish candidates.

No DB writes were committed. No migrations were created. No parent writes, merges, quarantine, or global apply are authorized by this artifact.

| metric | value |
| --- | --- |
| package_id | PKG-29B-BASE-COSMOS-OVERFINISH-CHILD-DELETE |
| fingerprint | 141eb3c42c6c0218db926e01ff72105bd6b200c839f3cd1d092bbfbb6683ef74 |
| source_readiness_fingerprint | ac2e57bfd287e020be1cde9c9536ba7d0dc6173c812a7f21cbabedb69cc0e76b |
| target_rows | 4 |
| child_deletes_in_dry_run | 4 |
| sql_hash | 15d12abbe17df4fe7e1c0849c576fb5543fbd93fa7837c3102e9dca014ac257d |
| dry_run_sql | docs\sql\english_master_index_pkg29b_base_cosmos_overfinish_child_delete_guarded_dry_run_transaction_v1.sql |
| db_writes_committed | false |
| migrations_created | false |

## Rows

| set | card | child | known_finishes |
| --- | --- | --- | --- |
| sv06.5 | 002 Galvantula cosmos | 7236391b-6297-4946-96f3-dc85e69e9cc1 | normal, reverse |
| swsh12.5 | 135 Lost Vacuum cosmos | ed3fdf71-5b1c-4fa1-b31b-eb97e86a7ba0 | normal, reverse |
| swsh12.5 | 145 Trekking Shoes cosmos | a1283a03-9ccf-4916-80e0-f9b4c7121936 | normal, reverse |
| swsh12.5 | 146 Ultra Ball cosmos | 3a4ca694-58a2-4a9a-a184-207e0261f9fd | normal, reverse |
