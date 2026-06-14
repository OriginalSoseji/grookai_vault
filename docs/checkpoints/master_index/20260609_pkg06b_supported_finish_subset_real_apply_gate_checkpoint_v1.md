# PKG-06B Supported Finish Subset Real Apply Gate Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad` |
| sql_hash_sha256 | `6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6` |
| child_card_printing_inserts | 120 |
| target_parent_rows | 120 |
| blocked_finish_taxonomy_rows_excluded | 268 |
| dry_run_before_hash_sha256 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |
| dry_run_after_hash_sha256 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Required Approval Phrase

```text
Approve real PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS apply only. Fingerprint: caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad. SQL hash: 6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6. Scope: 120 child-only card_printing inserts for me03/Perfect Order, finishes normal=65 and holo=55. Blocked finish-taxonomy rows remain excluded: 268. Dry-run proof: 98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7 == 98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No parent writes.
```
