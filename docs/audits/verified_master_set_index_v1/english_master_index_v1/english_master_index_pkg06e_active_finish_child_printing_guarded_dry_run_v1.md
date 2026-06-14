# PKG-06E Active Finish Child Printing Guarded Dry-Run V1

Rollback-only dry-run for the next taxonomy-safe active-finish child-printing insert bucket.

## Safety

- real_apply_authorized: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- parent_writes: false
- deletes_or_merges: false

## Package

| Field | Value |
| --- | --- |
| package_id | PKG-06E-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `0a1a320527119d55a012ae2a564059993f48b83220591cd522f6ca9119393a32` |
| package_fingerprint_sha256 | `87af87fa1a17297509296b6a06d421ec8840a8323d6f348bff01817962408aa6` |
| sql_hash_sha256 | `f54045f6359547976f14d07b7fcedf71cc9203f7b868f386eb2f87f5a103cece` |
| dry_run_execution_status | pkg06e_active_finish_child_printing_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Scope

| metric | value |
| --- | --- |
| child_printing_rows | 391 |
| target_parent_rows | 387 |
| set_count | 4 |

### Set Counts

| set_key | count |
| --- | --- |
| ex10 | 102 |
| ex13 | 99 |
| ex7 | 95 |
| ex8 | 95 |

### Finish Counts

| finish_key | count |
| --- | --- |
| cosmos | 2 |
| holo | 2 |
| normal | 1 |
| reverse | 386 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 387 | 0 | 0 | `e4d5083408fa739a34f5b08c491a9dba88d2c46053262b0160e7bc6f8b95dbe2` |
| after | 387 | 0 | 0 | `e4d5083408fa739a34f5b08c491a9dba88d2c46053262b0160e7bc6f8b95dbe2` |

## Stop Findings

- none
