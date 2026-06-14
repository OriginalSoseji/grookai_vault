# English Master Index PKG-02F Duplicate Dependency Transfer Real Apply Gate V1

This is a no-write real-apply approval gate. It records that the rollback-only dry run passed, but it does not authorize or perform a durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER |
| package_fingerprint_sha256 | `21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a` |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_execution_status | pkg02f_duplicate_dependency_transfer_guarded_dry_run_passed_rolled_back_no_durable_change |
| before_hash_sha256 | `ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69` |
| after_hash_sha256 | `ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69` |
| durable_after_snapshot_matches_before_snapshot | true |
| artifact_fresh_snapshot_matches_before_snapshot | true |
| contains_commit_statement | false |
| contains_rollback_statement | true |
| contains_delete_statement | true |

## Required Approval Phrase

```text
Approve real PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER apply only. Fingerprint: 21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a. Scope: 21 duplicate parent rows, 23 duplicate child printings, external mapping transfer, 58 number-key collision rows excluded. Dry-run proof: ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69 == ca6bbbca58b64546658c33ffc2ab851982fe9d1342a1eefe6123d6645a49df69. No global apply. No migrations.
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
- This gate does not authorize the 58 number-key collision rows.
