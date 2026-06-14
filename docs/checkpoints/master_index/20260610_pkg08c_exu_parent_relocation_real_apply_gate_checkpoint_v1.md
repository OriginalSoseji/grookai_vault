# PKG-08C EXU Parent Relocation Real Apply Gate V1

This is a no-write approval gate. It validates the rollback-only dry run and emits the exact approval phrase required for a later durable apply.

## Status

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-08C-EXU-PARENT-RELOCATION |
| package_fingerprint_sha256 | `89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62` |
| target_parent_updates | 28 |
| child_printings_preserved | 28 |
| mapping_inserts | 1 |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Dry-Run Proof

| Field | Value |
| --- | --- |
| dry_run_status | pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change |
| before_hash_sha256 | `ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b` |
| after_hash_sha256 | `ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b` |
| durable_after_snapshot_matches_before_snapshot | true |

## Required Approval Phrase

```text
Approve real PKG-08C-EXU-PARENT-RELOCATION apply only. Fingerprint: 89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62. Scope: 28 parent relocations from ex10 to exu, 28 child printings preserved, 1 TCGdex mapping insert for the question-mark Unown. Dry-run proof: ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b == ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b. No global apply. No migrations. No deletes. No merges. No unsupported cleanup.
```

## Stop Findings

- none

## Non-Authorizations

- This gate is not a real apply.
- This gate does not record approval.
- This gate does not write to the database.
- This gate does not create a migration.
- This gate does not delete or merge rows.
- This gate does not authorize global apply.
