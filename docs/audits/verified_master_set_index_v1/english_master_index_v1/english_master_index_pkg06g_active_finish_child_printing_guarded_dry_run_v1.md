# PKG-06G Active Finish Child Printing Guarded Dry-Run V1

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
| package_id | PKG-06G-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `3024e09ed58f58fddaaf5ce1e7fe99e0afec2ced46b741b527776b762feb965d` |
| package_fingerprint_sha256 | `4218f824485c51703e3428dbd1e8e5dcacabe0490242500cc3d803efdfd7baad` |
| sql_hash_sha256 | `e6360b72debe78c2b71d65949a1dfb3547e61cd48e5738bfd375722142c1854c` |
| dry_run_execution_status | pkg06g_active_finish_child_printing_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Scope

| metric | value |
| --- | --- |
| child_printing_rows | 313 |
| target_parent_rows | 305 |
| set_count | 10 |

### Set Counts

| set_key | count |
| --- | --- |
| ex12 | 81 |
| hgss4 | 15 |
| pop3 | 14 |
| sv02 | 17 |
| sv04 | 20 |
| swsh1 | 20 |
| swsh2 | 17 |
| swsh4 | 14 |
| swsh7 | 56 |
| swshp | 59 |

### Finish Counts

| finish_key | count |
| --- | --- |
| cosmos | 38 |
| holo | 115 |
| normal | 46 |
| reverse | 114 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 305 | 0 | 0 | `d371471409efd17427ccefba86e34b2d9a87294e2e173a1f570e5219fd8c3b7e` |
| after | 305 | 0 | 0 | `d371471409efd17427ccefba86e34b2d9a87294e2e173a1f570e5219fd8c3b7e` |

## Stop Findings

- none
