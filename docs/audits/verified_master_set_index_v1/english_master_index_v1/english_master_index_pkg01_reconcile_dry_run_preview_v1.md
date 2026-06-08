# English Master Index PKG-01 Reconcile Dry-Run Preview V1

This is the first consolidated DB reconcile preview for PKG-01.

It reads current DB state in a read-only transaction and produces before/after/rollback matrices. It does not write to the DB and cannot apply changes.

## Status

| Field | Value |
| --- | --- |
| preview_status | dry_run_reconcile_preview_complete_apply_blocked_no_approval |
| dry_run_only | true |
| approval_recorded | false |
| write_ready_now | 0 |
| apply_allowed | false |
| db_reads_performed | true |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_paths_executed | false |
| stop_findings | 0 |

## Package Scope

| Metric | Value |
| --- | --- |
| package_id | PKG-01 |
| package_fingerprint_sha256 | `34cc9acbb81bfadbe2115528a1339cb82afa71fa01fd0d52b62b83834a990b79` |
| card_print_rows | 106 |
| child_printing_rows_verified | 143 |
| affected_sets | 12 |
| current_db_card_prints_found | 106 |
| current_db_card_printings_found | 143 |
| vault_items_found | 0 |
| snapshot_hash_sha256 | `faa3a50cbda19df2a050a05c558cfdde0734579fd976f5209a4611319fe53e27` |

## Rows By Set

| Set | Rows |
| --- | ---: |
| col1 | 2 |
| dp7 | 8 |
| ecard2 | 13 |
| ecard3 | 15 |
| ex10 | 3 |
| fut2020 | 1 |
| mep | 10 |
| pl1 | 9 |
| pl2 | 17 |
| pl3 | 9 |
| pl4 | 18 |
| swsh2 | 1 |

## Changed Fields

| Field | Rows |
| --- | ---: |
| name | 11 |
| number | 88 |
| set_code | 106 |

## Stop Findings

- none

## Non-Authorizations

- This preview is not approval.
- This preview is not SQL.
- This preview is not a migration.
- This preview does not create an apply runner.
- This preview does not allow DB writes, cleanup, quarantine, insertion, deletion, hiding, or normalization.
