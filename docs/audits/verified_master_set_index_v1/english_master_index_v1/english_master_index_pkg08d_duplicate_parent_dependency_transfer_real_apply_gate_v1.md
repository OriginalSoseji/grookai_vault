# PKG-08D Duplicate Parent Dependency Transfer Real Apply Gate V1

This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER |
| package_fingerprint_sha256 | `b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8` |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_execution_status | pkg08d_duplicate_parent_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change |
| before_hash_sha256 | `71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2` |
| after_hash_sha256 | `71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2` |
| sql_artifact_hash_sha256 | `1cef89020ae8aaf4323843cb2895d7ede0b04712ab8818708170810635ddc936` |
| durable_after_snapshot_matches_before_snapshot | true |
| artifact_fresh_snapshot_matches_before_snapshot | true |

## Required Approval Phrase

```text
Approve real PKG-08D-DUPLICATE-PARENT-DEPENDENCY-TRANSFER apply only. Fingerprint: b0c474d462d824e14197629a108f7b6868e87cab38c0fc4155dff9ad77d126c8. SQL hash: 1cef89020ae8aaf4323843cb2895d7ede0b04712ab8818708170810635ddc936. Scope: 38 groups, 39 duplicate parent dependency transfers. Dry-run proof: 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2 == 71b385cde98720adcda0e1db1357b371e036c31efcb072d969b316ed6d0a80a2. No global apply. No migrations.
```

## Stop Findings

- none

## Non-Authorizations

- This gate is not a real apply.
- This gate does not record approval.
- This gate does not run SQL.
- This gate does not write to the database.
- This gate does not create a migration.
- This gate does not authorize global apply.
