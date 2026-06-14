# English Master Index Current Unsupported Reconciliation Lanes V1

Current read-only classification of Grookai child printings that are not supported by the current Master Index reconciliation keyspace.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Current Summary

- live_card_printing_rows: 42171
- supported_master_child_keys: 37163
- unsupported_rows: 0
- set_unmapped_scope_governed_rows: 5427
- parallel_finish_governed_non_write_rows: 167
- subset_parallel_supported_finish_governed_non_write_rows: 223
- product_promo_supported_finish_governed_non_write_rows: 134
- governed_stamped_non_write_facts: 553
- routed_stamped_identity_facts: 2
- routed_stamped_active_finish_facts: 23

## Cleanup Readiness

| readiness | rows |
| --- | --- |

## Lanes

| lane | rows | top_sets |
| --- | --- | --- |

## Next Dry-Run Candidate Buckets

| lane | rows | top_sets |
| --- | --- | --- |

## Principles

- This report is not deletion authority.
- Only dry_run_candidate rows may be considered for a future rollback-only cleanup package.
- Rows with dependencies, product/promo review, subset review, source coverage gaps, or parallel uncertainty remain blocked.
- Stamped facts governed as non-write Master Index facts are not considered missing DB rows.
