# PKG-06D Active Finish Child Printing Guarded Dry-Run V1

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
| package_id | PKG-06D-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `1b96ceb09853c30e4f73a8a135a5d6c9f8632d8fef9cc6c3457496e9d1589bcd` |
| package_fingerprint_sha256 | `c67558f261d8d70faf6beac7f63faafa5b627cf0cf7dfeb09989da5e617055b1` |
| sql_hash_sha256 | `00e3b463005122578ea313e7ca7ac0819fcc49fe6b5d005d1379452a0fc6ffec` |
| dry_run_execution_status | pkg06d_active_finish_child_printing_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Scope

| metric | value |
| --- | --- |
| child_printing_rows | 319 |
| target_parent_rows | 318 |
| set_count | 3 |

### Set Counts

| set_key | count |
| --- | --- |
| ex11 | 107 |
| ex16 | 107 |
| ex6 | 105 |

### Finish Counts

| finish_key | count |
| --- | --- |
| cosmos | 1 |
| holo | 16 |
| normal | 1 |
| reverse | 301 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 318 | 0 | 0 | `6f5e3eeac4591aaccd28d80dc155d5fa7d620463a97f8fee83cf200dbc573103` |
| after | 318 | 0 | 0 | `6f5e3eeac4591aaccd28d80dc155d5fa7d620463a97f8fee83cf200dbc573103` |

## Stop Findings

- none
