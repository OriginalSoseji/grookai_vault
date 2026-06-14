# PKG-06A Supported Finish Subset Guarded Dry-Run Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| package_id | PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_artifact_fingerprint_sha256 | `a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120` |
| package_fingerprint_sha256 | `4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9` |
| sql_hash_sha256 | `54599d99925c9e8fcbdfe694b1bfab0fd801e45e1e3e2ffe616fcbb48de05e98` |
| supported_child_printing_rows | 115 |
| supported_target_parent_rows | 115 |
| blocked_child_printing_rows | 282 |
| dry_run_execution_status | pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change |
| durable_after_snapshot_matches_before_snapshot | true |
| stop_findings | 0 |
| durable_db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| real_apply_authorized | false |

## Interpretation

The original PKG-06A scope contains Master Index logical finish keys that the current DB taxonomy cannot represent. The supported subset proves that DB-supported child-only inserts can be staged safely without weakening the finish-key foreign key.

Blocked finish keys require separate finish-taxonomy governance before any write package can include them.
