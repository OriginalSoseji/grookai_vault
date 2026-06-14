# PKG-06F Active Finish Child Printing Guarded Dry-Run V1

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
| package_id | PKG-06F-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `27e3873d92679d3255f13f65f90e14597511535a3f4567c89099515ea1ada8f2` |
| package_fingerprint_sha256 | `795cb07aed903181a3f671c1ad76d55139ca31dcf73c84269a13494d71b25a5f` |
| sql_hash_sha256 | `e76cf579592e7f005518aa24d7356d0ddaa266e811d4c5cd71945306cebefc9b` |
| dry_run_execution_status | pkg06f_active_finish_child_printing_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Scope

| metric | value |
| --- | --- |
| child_printing_rows | 355 |
| target_parent_rows | 355 |
| set_count | 4 |

### Set Counts

| set_key | count |
| --- | --- |
| ex14 | 88 |
| ex15 | 89 |
| ex5 | 90 |
| ex9 | 88 |

### Finish Counts

| finish_key | count |
| --- | --- |
| reverse | 355 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 355 | 0 | 0 | `8410c763077cfb51af7243eb025b52f9f0c0b14ead0f60307ea716e77e5a2d24` |
| after | 355 | 0 | 0 | `8410c763077cfb51af7243eb025b52f9f0c0b14ead0f60307ea716e77e5a2d24` |

## Stop Findings

- none
