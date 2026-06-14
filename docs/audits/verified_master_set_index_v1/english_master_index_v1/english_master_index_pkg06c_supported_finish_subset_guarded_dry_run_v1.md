# PKG-06C Supported Finish Subset Guarded Dry-Run V1

Rollback-only dry-run for the next DB-supported child-printing insert subset after PKG-06B apply.

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
| package_id | PKG-06C-SUPPORTED-FINISH-SUBSET-CHILD-PRINTING-INSERTS |
| source_readiness_fingerprint_sha256 | `e89f24ba671422a6198da0f9668753409cee408321c178248e8f78fe56639eec` |
| package_fingerprint_sha256 | `839a42b870b455a16055c88c5b4e39c4a83da421e4cd36df581eee4358000684` |
| sql_hash_sha256 | `cc9060568b83642f27cc67aa56a1f53080771accb54d9aaeb61f983ce25af2ae` |
| dry_run_execution_status | pkg06c_supported_finish_subset_completed_rolled_back_no_durable_change |
| stop_findings | 0 |

## Supported Subset

| metric | value |
| --- | --- |
| child_printing_rows | 8 |
| target_parent_rows | 8 |
| set_count | 1 |

### Supported Finish Counts

| finish_key | count |
| --- | --- |
| holo | 8 |

## Blocked Subset

Blocked rows are excluded because their finish keys are not active in `public.finish_keys`.

| finish_key | count |
| --- | --- |
| first_edition_holo | 63 |
| first_edition_normal | 314 |
| stamped | 3 |

## Snapshot Proof

| Snapshot | target_parent_rows | existing_target_child_rows | planned_id_collision_rows | hash |
| --- | ---: | ---: | ---: | --- |
| before | 8 | 0 | 0 | `7365fd1b32fd3c3072b3f3ddae25c17dd171938ca552d7cb3cb9db5fa4357358` |
| after | 8 | 0 | 0 | `7365fd1b32fd3c3072b3f3ddae25c17dd171938ca552d7cb3cb9db5fa4357358` |

## Stop Findings

- none
