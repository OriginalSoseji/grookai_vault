# ENRICH-06C Source-Mapped Child Printing Insert Guarded Dry Run V1

Package: `ENRICH-06C-SOURCE-MAPPED-CHILD-PRINTING-INSERT`

## Result

- Pass: false
- Target parent rows: 354
- Target child inserts: 535
- Dry-run status: skipped_guard_blocked_rolled_back_no_durable_change
- Inserted inside transaction: 0
- Before hash: `d8c96ea20a3b0e44755b248b23e9f2819e85c3040e791d769f3f964854a733ae`
- After rollback hash: `d8c96ea20a3b0e44755b248b23e9f2819e85c3040e791d769f3f964854a733ae`
- Package fingerprint: `b806e98635c62371acf4095ef74658847b6f68ba958e3897615361f218634d71`

## Guard

| metric | value |
| --- | --- |
| target_printing_count | 535 |
| target_parent_count | 354 |
| distinct_target_printing_count | 535 |
| missing_parent_count | 0 |
| inactive_finish_key_count | 5 |
| existing_child_finish_count | 0 |
| existing_child_any_count | 0 |
| missing_active_mapping_parent_count | 0 |

## By Finish

| finish | rows |
| --- | --- |
| holo | 212 |
| reverse | 174 |
| normal | 144 |
| stamped | 5 |

## Stop Findings

- guard_blocked
- skipped_guard_blocked_rolled_back_no_durable_change
- inserted_child_row_count_mismatch
- matching_child_count_mismatch

## Approval Text

_Not available; dry-run did not pass._
