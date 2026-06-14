# PKG-09A Alias / Subset Bulk Convergence Real Apply Gate V1

This is a no-write real-apply gate. It records whether the approved dry-run artifact is eligible for one real apply.

| Field | Value |
| --- | --- |
| approval_gate_status | ready_for_real_apply_operator_decision_apply_blocked_no_write |
| package_id | PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE |
| package_fingerprint_sha256 | `d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a` |
| candidate_rows | 155 |
| parent_set_code_update_rows | 105 |
| parent_insert_rows | 48 |
| child_insert_rows | 53 |
| external_mapping_insert_rows | 48 |
| blocked_rows_excluded | 36 |
| dry_run_proof_hash_sha256 | `a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f` |
| db_writes_performed | false |
| migrations_created | false |
| stop_findings | 0 |

## Required Approval

```text
Approve real PKG-09A-ALIAS-SUBSET-BULK-CONVERGENCE apply only. Fingerprint: d66cc542f4f348f2cd137c03e2c13949da5ac22391eda5388a8d7d8ab1f7976a. Scope: 155 candidate rows, 105 parent set_id/set_code updates, 48 parent inserts, 53 child printing inserts, 48 external mapping inserts, 36 blocked rows excluded. Dry-run proof: a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f == a92b17da81d0e9166238cdd7a62750385a89b5d1044c1caf5b788de83680906f. No global apply. No migrations. No deletes. No merges. No unsupported cleanup. No quarantine.
```
