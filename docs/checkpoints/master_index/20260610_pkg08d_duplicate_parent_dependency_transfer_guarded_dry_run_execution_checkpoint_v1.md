# PKG-08D Duplicate Parent Dependency Transfer Guarded Dry-Run Execution V1

This report records rollback-only dry-run execution for `PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER`.

No real apply, migration, cleanup, quarantine, merge, or durable delete was performed.

## Status

| Field | Value |
| --- | --- |
| dry_run_execution_status | pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change |
| package_fingerprint_sha256 | b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8 |
| duplicate_parent_rows | 39 |
| db_writes_performed | false |
| durable_db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Proof

| Metric | Value |
| --- | --- |
| Before snapshot hash | 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2 |
| After snapshot hash | 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2 |
| Durable after matches before | true |
| Artifact fresh snapshot matches before | true |
| Execution error |  |

## Stop Findings

None.
