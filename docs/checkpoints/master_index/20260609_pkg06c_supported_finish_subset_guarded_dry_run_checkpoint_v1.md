# PKG-06C Supported Finish Subset Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| package_id | PKG-06C-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `e89f24ba671422a6198da0f9668753409cee408321c178248e8f78fe56639eec` |
| package_fingerprint_sha256 | `839a42b870b455a16055c88c5b4e39c4a83da421e4cd36df581eee4358000684` |
| sql_hash_sha256 | `cc9060568b83642f27cc67aa56a1f53080771accb54d9aaeb61f983ce25af2ae` |
| supported_child_printing_rows | 8 |
| supported_target_parent_rows | 8 |
| blocked_child_printing_rows | 380 |
| dry_run_execution_status | pkg06c_supported_finish_subset_completed_rolled_back_no_durable_change |
| durable_after_snapshot_matches_before_snapshot | true |
| stop_findings | 0 |
| durable_db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| real_apply_authorized | false |

## Interpretation

PKG-06C is ready for a separate real-apply gate if the operator chooses. The blocked finish-taxonomy rows remain excluded.
