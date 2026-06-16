# Pocket GV-ID Readiness V1

Read-only readiness report for assigning separate `GV-TCGP-*` IDs to TCG Pocket rows.

## Safety

- DB writes performed: false
- Migrations created: false
- Physical rows targeted: false
- Contract: `POCKET_GV_ID_NAMESPACE_CONTRACT_V1`

## Totals

| metric | value |
| --- | --- |
| pocket_parent_rows | 2012 |
| pocket_child_printing_rows | 6036 |
| parent_rows_missing_gv_id | 0 |
| child_rows_missing_printing_gv_id | 0 |
| blocked_parent_rows | 0 |
| proposed_parent_duplicate_groups | 0 |
| proposed_child_duplicate_groups | 0 |
| existing_parent_collision_groups | 0 |
| existing_child_collision_groups | 0 |

Ready for guarded dry-run: false

GV-ID backfill complete: true

## By Set

| set | parents |
| --- | --- |
| B1 | 331 |
| A1 | 286 |
| A4 | 241 |
| A3 | 239 |
| A2 | 207 |
| A2b | 111 |
| A3b | 107 |
| A4a | 105 |
| A3a | 103 |
| P-A | 100 |
| A2a | 96 |
| A1a | 86 |

## By Finish

| finish | children |
| --- | --- |
| holo | 2012 |
| normal | 2012 |
| reverse | 2012 |

## Blocked Rows

_None._

## Duplicate Parent ID Samples

_None._

Fingerprint: `3489c931f3360ce06326056888f4066e951f8b66fc3d29dd0ad3446cc4128dbb`
