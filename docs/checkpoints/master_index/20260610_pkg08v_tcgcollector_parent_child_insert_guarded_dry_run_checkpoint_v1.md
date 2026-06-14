# PKG-08V TCGCollector Parent+Child Insert Guarded Dry Run V1

Rollback-only dry run for PKG-08U rows governed for TCGCollector exact-card-ID mapping.

## Status

- dry_run_status: pkg08v_tcgcollector_parent_child_insert_completed_rolled_back_no_durable_change
- package_fingerprint_sha256: `e86895227018977a83c26b53253dda6c98f9a7477b30c6b7facfd3f53f548d5e`
- source_readiness_fingerprint_sha256: `7b2ed3b4ef021ea9b4f83ce932a957d34800cdf52c1704948a2890e48fa8000c`
- target_parent_rows: 104
- target_child_rows: 104
- target_external_mappings: 104
- blocked_rows: 0
- durable_db_writes_performed: false
- migrations_created: false

## By Set

| set_key | child_rows |
| --- | --- |
| ecard2 | 5 |
| ecard3 | 5 |
| sm115 | 94 |

## By Finish

| finish_key | child_rows |
| --- | --- |
| holo | 104 |

## By Mapping Source

| source | mapping_rows |
| --- | --- |
| tcgcollector | 104 |

## Rollback Proof

- before_hash: `2076d3f38f8234aac3dcdf764b87e3527d1953d750717f18b7230320fd22ecc4`
- after_hash: `2076d3f38f8234aac3dcdf764b87e3527d1953d750717f18b7230320fd22ecc4`
- durable_after_snapshot_matches_before_snapshot: true

## Approval Boundary

This report is dry-run proof only. It does not authorize real apply.
