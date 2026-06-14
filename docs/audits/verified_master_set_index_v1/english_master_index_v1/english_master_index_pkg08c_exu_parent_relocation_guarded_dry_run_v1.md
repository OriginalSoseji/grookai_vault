# PKG-08C EXU Parent Relocation Guarded Dry Run V1

Rollback-only dry run for relocating Unseen Forces Unown Collection parents from `ex10` to existing set `exu`.

## Safety

- rollback_only: true
- durable_db_writes_performed: false
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- real_apply_authorized: false

## Scope

- dry_run_status: pkg08c_exu_parent_relocation_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `89c340ab1b663ba736f85fe8b5715eb1ba95b61b2a0e26b8f81323bf26f00a62`
- target_parent_updates: 28
- child_printings_preserved: 28
- simulated_mapping_inserts: 1
- blocked_rows: 0

| set | rows |
| --- | --- |
| exu | 28 |

| finish | rows |
| --- | --- |
| holo | 28 |

## Rollback Proof

- before_hash: `ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b`
- after_hash: `ca62890133468355372a35aef9ead4379649e87ccaa274706784a862dbb39a1b`
- durable_after_snapshot_matches_before_snapshot: true

## Stop Findings

| finding |
| --- |
