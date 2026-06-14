# PKG-06A Supported Finish Subset Guarded Dry-Run V1

The original PKG-06A dry-run failed safely because some Master Index logical finish keys are not present in `public.finish_keys`. This report splits that package and dry-runs only rows whose finish keys are active in the DB.

## Safety

- real_apply_authorized: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- deletes_or_merges: false
- parent_writes: false

## Package

| Field | Value |
| --- | --- |
| package_id | PKG-06A-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_artifact_fingerprint_sha256 | `a374b8c75f79f0abcda3923d100058366de48e4b1f3db50bea6ea8d599c3f120` |
| package_fingerprint_sha256 | `4018ba8039a8b3835ec2a76d11af3af8ea0099ce21bbf5466c525df8772ab6d9` |
| sql_hash_sha256 | `54599d99925c9e8fcbdfe694b1bfab0fd801e45e1e3e2ffe616fcbb48de05e98` |
| dry_run_execution_status | pkg06a_supported_finish_subset_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Supported Subset

| Metric | Value |
| --- | ---: |
| supported_child_printing_rows | 115 |
| supported_target_parent_rows | 115 |
| supported_set_count | 1 |

### Supported Sets

| set_key | child_printing_rows |
| --- | --- |
| pl3 | 115 |

### Supported Finish Counts

| finish_key | count |
| --- | --- |
| cosmos | 2 |
| normal | 113 |

## Blocked Subset

These rows are not rejected as Master Index truth. They are blocked because the current DB finish taxonomy cannot represent their finish keys.

| finish_key | count | blocked_reason |
| --- | --- | --- |
| cracked_ice | 3 | finish_key_not_present_as_active_public_finish_keys_row |
| first_edition_holo | 39 | finish_key_not_present_as_active_public_finish_keys_row |
| first_edition_normal | 225 | finish_key_not_present_as_active_public_finish_keys_row |
| stamped | 15 | finish_key_not_present_as_active_public_finish_keys_row |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 115 | 0 | 0 | `3f045c7dd1742d32a742cdfd891e6709bf3306e42073cb148c3d9b67e8fe5b2d` |
| after | 115 | 0 | 0 | `3f045c7dd1742d32a742cdfd891e6709bf3306e42073cb148c3d9b67e8fe5b2d` |

## Stop Findings

None.
