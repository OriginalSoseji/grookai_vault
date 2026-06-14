# PKG-06B Supported Finish Subset Real Apply Gate V1

This is a no-write real-apply approval gate. It records that the rollback-only supported-finish dry run passed, but it does not authorize or perform a durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad` |
| sql_hash_sha256 | `6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6` |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Scope

| Scope | Count |
| --- | ---: |
| child card_printing inserts | 120 |
| target parent rows | 120 |
| normal | 65 |
| holo | 55 |
| blocked finish-taxonomy rows excluded | 268 |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_execution_status | pkg06b_supported_finish_subset_completed_rolled_back_no_durable_change |
| before_hash_sha256 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |
| after_hash_sha256 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |
| durable_after_snapshot_matches_before_snapshot | true |
| sql_contains_card_printings_insert | true |
| sql_contains_update_statement | false |
| sql_contains_delete_statement | false |
| sql_contains_commit_statement | false |
| sql_contains_rollback_statement | true |

## Required Approval Phrase

```text
Approve real PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS apply only. Fingerprint: caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad. SQL hash: 6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6. Scope: 120 child-only card_printing inserts for me03/Perfect Order, finishes normal=65 and holo=55. Blocked finish-taxonomy rows remain excluded: 268. Dry-run proof: 98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7 == 98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.
```

## Stop Findings

- none

## Non-Authorizations

- This gate is not a real apply.
- This gate does not record approval.
- This gate does not run SQL.
- This gate does not read from or write to the database.
- This gate does not create a migration.
- This gate does not authorize global apply.
- This gate does not authorize deletes.
- This gate does not authorize merges.
- This gate does not authorize unsupported cleanup.
- This gate does not authorize parent writes.
- This gate does not authorize blocked finish-taxonomy rows.
