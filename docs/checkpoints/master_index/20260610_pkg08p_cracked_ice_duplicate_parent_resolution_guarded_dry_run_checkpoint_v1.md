# PKG-08P Cracked Ice Duplicate Parent Resolution Guarded Dry Run V1

Rollback-only dry run for the remaining cracked_ice duplicate-parent rows.

## Status

- dry_run_status: pkg08p_cracked_ice_duplicate_parent_resolution_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `67b344815544f4cb8962318d19298f25ef1153b60ce7ef07b75e9401f6ba43e2`
- target_rows: 8
- mapping_transfers: 8
- child_inserts: 8
- duplicate_parent_delete_simulation: 8
- durable_db_writes_performed: false
- migrations_created: false
- stop_findings: 0

## By Set

| set_key | rows |
| --- | --- |
| bw2 | 1 |
| sve | 7 |

## Proof

- before_hash: `d765d98ad3197e06da8f37cb20c881dd6bfb44f5b164fae7434a272512523108`
- after_hash: `d765d98ad3197e06da8f37cb20c881dd6bfb44f5b164fae7434a272512523108`
- durable_after_snapshot_matches_before_snapshot: true

## Approval Boundary

This is rollback-only proof. It does not authorize real apply.
