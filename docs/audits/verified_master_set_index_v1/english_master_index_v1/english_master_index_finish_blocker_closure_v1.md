# English Master Index Finish Blocker Closure V1

Generated: 2026-06-08T19:10:17.922Z

Audit-only report. This does not authorize database writes, cleanup, quarantine, insertion, deletion, or canonical mutation.

## Safety

| check | value |
| --- | --- |
| audit_only | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| mutation_authority | false |
| write_ready_now | 0 |

## Summary

| metric | value |
| --- | --- |
| closure_status | closed_to_blocker_boundary |
| remaining_finish_second_source_needed | 5 |
| blocker_mapped_rows | 5 |
| unmapped_queue_rows | 0 |
| stale_blocker_rows | 0 |
| promotion_safe_now | 0 |
| write_ready_now | 0 |

## By Finish

| finish | rows |
| --- | --- |
| holo | 1 |
| normal | 3 |
| stamped | 1 |

## By Blocker Type

| blocker_type | rows |
| --- | --- |
| finish_label_conflict | 4 |
| card_number_conflict | 1 |

## Mapped Blockers

| set | number | card | finish | blocker | reason |
| --- | --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | finish_label_conflict | Evidence distinguishes cracked ice holo from the base card; this audit does not collapse cracked_ice into holo. |
| ex9 | 107 | Farfetch'd | normal | finish_label_conflict | Available exact source context does not support normal finish. |
| sm8 | 187 | Net Ball | stamped | card_number_conflict | Exact league/stamped evidence points to 187a/214, not exact card number 187/214. |
| sv03.5 | 146 | Moltres | normal | finish_label_conflict | Available exact source does not list normal finish. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | finish_label_conflict | Available exact source context does not support normal finish. |

## Unmapped Queue Rows

_None._

## Stale Blocker Rows

_None._

## Rule

Remaining finish-second-source rows are not promotion safe. They require exact finish or number resolution before they can leave manual review.
