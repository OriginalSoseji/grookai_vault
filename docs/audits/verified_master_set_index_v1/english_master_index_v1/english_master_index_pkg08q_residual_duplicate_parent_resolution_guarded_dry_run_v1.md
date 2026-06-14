# PKG-08Q Residual Duplicate Parent Resolution Guarded Dry Run V1

Rollback-only dry run for the remaining duplicate-exact-parent rows after cracked_ice closure.

## Status

- dry_run_status: pkg08q_residual_duplicate_parent_resolution_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `a0d03986b2871b4cb8b42a637bfbd695e54dc9cd4691760a16870eb14d283839`
- groups: 2
- duplicate_parent_delete_simulation: 2
- child_inserts: 3
- mapping_transfers: 2
- vault_transfers: 0
- vault_instance_transfers: 0
- pricing_watch_transfers: 0
- pricing_watch_dedupe_deletes: 0
- external_discovery_candidate_transfers: 0
- durable_db_writes_performed: false
- migrations_created: false
- stop_findings: 0

## By Set

| set_key | rows |
| --- | --- |
| swsh12.5 | 1 |
| swsh6 | 2 |

## By Finish

| finish_key | rows |
| --- | --- |
| cosmos | 1 |
| holo | 1 |
| reverse | 1 |

## Proof

- before_hash: `63f0beb47a99229eb7d53a0523fe3160ab78e497a27cefa6f7bb07860f26d704`
- after_hash: `63f0beb47a99229eb7d53a0523fe3160ab78e497a27cefa6f7bb07860f26d704`
- durable_after_snapshot_matches_before_snapshot: true
