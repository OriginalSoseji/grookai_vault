# PKG-28B External Mapping Transfer Child Delete Dry-Run Artifact V1

Rollback-only artifact prepared from PKG-28A transfer-ready rows.

No DB writes were committed. No migrations were created. No parent writes, merges, unsupported cleanup, quarantine, or global apply are authorized by this artifact.

| metric | value |
| --- | --- |
| package_id | PKG-28B-EXTERNAL-MAPPING-TRANSFER-CHILD-DELETE |
| fingerprint | 9a4b671f19abe698262b55d2c5d9cbe7dc3ab068b74146e2341489de5cfea9ee |
| source_readiness_fingerprint | 3c196d849bc0c375cc57a932970576135dec0cd174824224584aac354159c6f9 |
| target_rows | 4 |
| mapping_transfers | 4 |
| child_deletes_in_dry_run | 4 |
| sql_hash | 66f084dc988ddc87bb02f008c3141e4049b763af761d319e08fe1e9f38f887bf |
| dry_run_sql | docs\sql\english_master_index_pkg28b_external_mapping_transfer_child_delete_guarded_dry_run_transaction_v1.sql |
| db_writes_committed | false |
| migrations_created | false |

## Rows

| set | card | source_child | mapping | target_child |
| --- | --- | --- | --- | --- |
| ecard2 | 1 Ampharos holo | be415b20-0da5-4493-a30c-10f0cdfe34cb | tcgdex:ecard2-H01 | 37a6be79-4e47-4aec-a567-5ad9865c872b |
| ecard2 | 5 Bellossom holo | 6971fe2c-bcdf-4671-bf82-28738595ce96 | tcgdex:ecard2-H05 | e0295a7f-de79-4a1f-a95b-28ce8b3b4105 |
| ecard2 | 6 Blissey holo | 390b57da-d2dc-4815-9069-312516ecba23 | tcgdex:ecard2-H06 | ffe8d593-ffc2-4539-8795-0e64b8d7c858 |
| ecard3 | 17 Magcargo holo | 50940a33-ce3f-48ed-b7c3-3aa65bac051e | tcgdex:ecard3-H17 | 50c11bac-6547-4c74-8b59-459a84c0bb32 |
