# PKG-05A Final Snapshot Transaction Artifact V1

Preparation only. This artifact was generated for review and rollback-only dry-run execution. It was not executed by this script.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Fingerprints

- source_readiness_fingerprint: `da6014ad1fbac00382875106ba2ae4dc2709c6b8cd3a2a09c85aada55a2c69e1`
- artifact_fingerprint: `df4c9dcae0a19731d4b96f9efd0322f5fde78722c0c08786e4d97a8a2d395dc9`
- fresh_snapshot_hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`

## Scope

| set_key | set_name | expected_parent_rows | expected_child_printings | finish_counts |
| --- | --- | --- | --- | --- |
| 2023sv | McDonald's Collection 2023 | 15 | 15 | {"holo":6,"normal":9} |
| 2024sv | McDonald's Collection 2024 | 15 | 15 | {"normal":8,"holo":7} |
| mee | Mega Evolution Energy | 8 | 16 | {"normal":8,"reverse":8} |
| mfb | My First Battle | 34 | 34 | {"normal":34} |

## Counts

| metric | value |
| --- | --- |
| planned_set_inserts | 4 |
| planned_parent_inserts | 72 |
| planned_child_printing_inserts | 80 |
| planned_external_mapping_inserts | 72 |
| existing_set_rows_in_fresh_snapshot | 0 |
| existing_parent_rows_in_fresh_snapshot | 0 |
| existing_child_rows_in_fresh_snapshot | 0 |

## Stop Findings

None.

## SQL Artifact

`docs\sql\english_master_index_pkg05a_missing_set_inserts_guarded_dry_run_transaction_v1.sql`
