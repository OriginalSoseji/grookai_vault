# PKG-01 Split One-Set Pilot Checkpoint V1

Date: 2026-06-09

## Summary

Split the 106-row PKG-01 recovery package into:

- `PKG-01A`: one-set pilot
- `PKG-01B`: blocked remainder

This is no-write planning only. No approval was recorded and no execution artifact was created.

## Pilot Package

| Field | Value |
| --- | --- |
| package_id | PKG-01A |
| set_key | fut2020 |
| set_name | Pokémon Futsal 2020 |
| card_print_rows | 1 |
| child_printing_rows_verified | 1 |
| changed_fields | set_code |
| vault_items_referencing_targets | 0 |
| status | ready_for_operator_decision_apply_blocked_no_write |

## Remainder Package

| Field | Value |
| --- | --- |
| package_id | PKG-01B |
| card_print_rows | 105 |
| child_printing_rows_verified | 142 |
| status | blocked_until_pkg01a_pilot_verified_no_write |

## Guardrails

| Guardrail | Value |
| --- | --- |
| db_reads_performed | false |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_paths_executed | false |
| approval_recorded | false |
| apply_allowed | false |
| write_ready_now | 0 |
| stop_findings | 0 |

## Meaning

The next decision is no longer all of PKG-01. The next decision is only whether to approve `PKG-01A` for final snapshot and dry-run transaction artifact preparation.

`PKG-01B` must remain out of any pilot execution artifact until `PKG-01A` is applied and verified separately.
