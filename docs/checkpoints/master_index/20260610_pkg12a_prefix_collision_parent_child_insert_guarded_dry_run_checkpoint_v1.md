# PKG-12A Prefix-Collision Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for non-colliding unprefixed checklist parents whose current same-number live candidates are protected prefix/subset identities.

## Status

- dry_run_status: pkg12a_prefix_collision_parent_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `5d2f3e012f334dbda88680766a82a72cec18c9cffd3296cc1c644e4a4c971c80`
- source_strategy_fingerprint_sha256: `c5751c15f7f66c9fb10e5fb69069134821bcdf9bd6d471721dea9e2811fc1e26`
- target_parent_rows: 3
- target_child_rows: 6
- target_external_mappings: 3
- blocked_rows: 5
- durable_db_writes_performed: false
- migrations_created: false

## By Set

| set_key | child_rows |
| --- | --- |
| col1 | 6 |

## By Finish

| finish_key | child_rows |
| --- | --- |
| holo | 3 |
| reverse | 3 |

## By Mapping Source

| source | mapping_rows |
| --- | --- |
| pokemonapi | 3 |

## Rollback Proof

- before_hash: `dcf719b4259ba805ff13a2f33ea1e66cb3dd9593cf0416d1484705733be079f5`
- after_hash: `dcf719b4259ba805ff13a2f33ea1e66cb3dd9593cf0416d1484705733be079f5`
- durable_after_snapshot_matches_before_snapshot: true

## Approval Boundary

This report is dry-run proof only. It does not authorize real apply.
