# PKG-06B Supported Finish Subset Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| package_id | PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `723fba910048e21e8f1df079f3269ecd4b81e3a441cdf2657f3f26d88666a9be` |
| package_fingerprint_sha256 | `caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad` |
| sql_hash_sha256 | `6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6` |
| supported_child_printing_rows | 120 |
| supported_target_parent_rows | 120 |
| blocked_child_printing_rows | 268 |
| dry_run_execution_status | pkg06b_supported_finish_subset_completed_rolled_back_no_durable_change |
| durable_after_snapshot_matches_before_snapshot | true |
| stop_findings | 0 |
| durable_db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| real_apply_authorized | false |

## Interpretation

PKG-06B is ready for a separate real-apply gate if the operator chooses. The blocked finish-taxonomy rows remain excluded.
