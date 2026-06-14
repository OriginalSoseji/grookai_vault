# PKG-06A Child Printing Guarded Dry-Run Execution V1

Rollback-only dry-run execution proof for PKG-06A. No real apply was authorized or performed.

## Approval

- approval_text: Proceed next step
- approval_scope: rollback-only dry-run execution and proof generation only
- approved_readiness_fingerprint: `7b2339f8004754d69bfcdc59bb63965a2e9f2e27827a211853af53ab8c18ab41`
- approved_artifact_fingerprint: `a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120`
- real_apply_authorized: false

## Safety

- transaction_artifact_executed: true
- dry_run_insert_executed_inside_rolled_back_transaction: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- real_apply_authorized: false
- write_ready_now: 0

## Status

- dry_run_execution_status: pkg06a_guarded_dry_run_failed
- stop_findings: 3
- before_hash: `36ea7325c169cdd082ab302e6d939312908583f3720663286f422e6d709fa10e`
- after_hash: `36ea7325c169cdd082ab302e6d939312908583f3720663286f422e6d709fa10e`
- durable_after_snapshot_matches_before_snapshot: true

## Scope

| set_key | set_name | child_printing_inserts | finish_counts |
| --- | --- | --- | --- |
| gym1 | Gym Heroes | 134 | {"first_edition_holo":19,"first_edition_normal":113,"stamped":2} |
| gym2 | Gym Challenge | 133 | {"first_edition_holo":20,"first_edition_normal":112,"stamped":1} |
| pl3 | Supreme Victors | 130 | {"normal":113,"cracked_ice":3,"stamped":12,"cosmos":2} |

## Counts

| metric | value |
| --- | --- |
| planned_set_count | 3 |
| planned_child_printing_inserts | 397 |
| target_parent_rows | 390 |

## Snapshot Counts

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows |
| --- | ---: | ---: | ---: |
| before | 390 | 0 | 0 |
| after | 390 | 0 | 0 |

## Rollback Proof

No rollback proof row captured.

## Stop Findings

- dry_run_transaction_did_not_complete
- dry_run_transaction_error_message_present
- rollback_proof_row_missing
