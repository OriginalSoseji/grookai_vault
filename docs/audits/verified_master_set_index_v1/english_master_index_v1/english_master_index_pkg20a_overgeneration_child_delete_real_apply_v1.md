# PKG-20A Overgeneration Child Delete Real Apply V1

Approved real apply for unsupported overgeneration child printing cleanup.

## Safety

- package_id: PKG-20A-OVERGENERATION-CHILD-DELETE
- committed: true
- db_writes_performed: true
- migrations_created: false
- parent_writes: 0
- merges: 0
- quarantine_performed: false

## Scope

- deleted_child_rows: 9453
- target_child_deletes: 9453

| finish | rows |
| --- | --- |
| holo | 5321 |
| reverse | 2133 |
| normal | 1999 |

| lane | rows |
| --- | --- |
| holo_overgeneration_candidate_no_dependencies | 5321 |
| reverse_overgeneration_candidate_no_dependencies | 2133 |
| normal_overgeneration_candidate_no_dependencies | 1999 |

## Proof

- dry_run_proof_hash: ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562
- pre_apply_hash: ab258fa5767a7d6ad4d119b62568d0dbdb8161f60ca198cd9201e130a22e6562
- remaining_target_children: 0

## Rollback Material

The JSON artifact contains the full pre-apply child row snapshot needed for a manual reinsert rollback if separately approved.
