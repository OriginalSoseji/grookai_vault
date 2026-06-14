# PKG-08T Non-TCGdex Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for PKG-08S rows that already have approved non-TCGdex mapping carriers.

## Status

- dry_run_status: pkg08t_non_tcgdex_parent_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `6f173353f1e455e1eef8d67f3d577183b939a4dcea4a5c719bcb61623933a341`
- source_readiness_fingerprint_sha256: `cba7fe096f8d122decdec0cc5656e6fb00e2337caaeb259ce768d62753070f6b`
- target_parent_rows: 34
- target_child_rows: 34
- target_external_mappings: 34
- blocked_rows: 0
- durable_db_writes_performed: false
- migrations_created: false

## By Set

| set_key | child_rows |
| --- | --- |
| bw11 | 20 |
| bwp | 2 |
| mep | 6 |
| svp | 6 |

## By Finish

| finish_key | child_rows |
| --- | --- |
| holo | 28 |
| normal | 6 |

## By Mapping Source

| source | mapping_rows |
| --- | --- |
| pokemonapi | 23 |
| tcgplayer | 11 |

## Rollback Proof

- before_hash: `2116311d42d31a693a757f4f24ae32f8eb55138eac8de6de77542fb785cb6e3a`
- after_hash: `2116311d42d31a693a757f4f24ae32f8eb55138eac8de6de77542fb785cb6e3a`
- durable_after_snapshot_matches_before_snapshot: true

## Approval Boundary

This report is dry-run proof only. It does not authorize real apply.
