# PKG-06B Supported Finish Subset Guarded Dry-Run V1

Rollback-only dry-run for the next DB-supported child-printing insert subset after PKG-06A apply.

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
| package_id | PKG-06B-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `723fba910048e21e8f1df079f3269ecd4b81e3a441cdf2657f3f26d88666a9be` |
| package_fingerprint_sha256 | `caf8126b5941cf9b4c43b9d3027415ae1dfc94dc204e64b2f00fb16ff0089cad` |
| sql_hash_sha256 | `6f6d9fc18e8642cd2c6cbd7a29e26c54f400d11054519626bfd2dc78156b93a6` |
| dry_run_execution_status | pkg06b_supported_finish_subset_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Supported Subset

| metric | value |
| --- | --- |
| child_printing_rows | 120 |
| target_parent_rows | 120 |
| set_count | 1 |

### Supported Finish Counts

| finish_key | count |
| --- | --- |
| holo | 55 |
| normal | 65 |

## Blocked Subset

Blocked rows are excluded because their finish keys are not active in `public.finish_keys`.

| finish_key | count |
| --- | --- |
| first_edition_holo | 39 |
| first_edition_normal | 225 |
| stamped | 4 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 120 | 0 | 0 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |
| after | 120 | 0 | 0 | `98d147969837ba9bb50874233ddd8876df3e8c8459b9b4514a0f7a7bc093a6c7` |

## Stop Findings

- none
