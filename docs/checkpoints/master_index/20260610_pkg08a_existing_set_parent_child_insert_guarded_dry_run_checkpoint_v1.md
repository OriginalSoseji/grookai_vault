# PKG-08A Existing-Set Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for low-risk existing-set parent + child inserts. No durable write was authorized or performed.

## Status

- dry_run_status: pkg08a_existing_set_parent_child_insert_failed_rolled_back
- package_fingerprint_sha256: `7947cb0310ec38821edf4c85e8b4e7e53975c7a8689365437bd0500ea22e6fdb`
- target_parent_rows: 25
- target_child_rows: 25
- target_external_mappings: 25
- blocked_rows: 0
- stop_findings: 3
- durable_db_writes_performed: false
- migrations_created: false

## By Set

| set_key | child_rows |
| --- | --- |
| swsh4.5 | 25 |

## By Finish

| finish_key | child_rows |
| --- | --- |
| normal | 25 |

## Rollback Proof

- before_hash: `4015ad75d790994aeb1d05328d33a31b4f1bdea17ba8064d2112b17a18b92d41`
- after_hash: `4015ad75d790994aeb1d05328d33a31b4f1bdea17ba8064d2112b17a18b92d41`
- durable_after_snapshot_matches_before_snapshot: true
