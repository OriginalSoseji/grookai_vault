# PKG-01A Guarded Dry-Run Execution Checkpoint V1

Date: 2026-06-09

## Scope

This checkpoint records execution of the `PKG-01A / fut2020` guarded transaction artifact in dry-run mode only.

`PKG-01B` remains blocked.

No DB write/apply approval was granted.

## Result

```text
pkg01a_guarded_dry_run_passed_rolled_back_no_durable_change
```

Generated reports:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_guarded_dry_run_execution_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_guarded_dry_run_execution_v1.md`

Executed artifact:

- `docs/sql/english_master_index_pkg01a_fut2020_guarded_dry_run_transaction_v1.sql`

## Package

| Field | Value |
| --- | --- |
| pilot_package_id | `PKG-01A` |
| set_key | `fut2020` |
| card_print_rows | `1` |
| child_printing_rows_verified | `1` |
| allowed_changed_fields | `set_code` |
| PKG-01B included | `false` |

## Transaction Safety

| Field | Value |
| --- | --- |
| transaction_artifact_executed | `true` |
| dry_run_update_executed_inside_rolled_back_transaction | `true` |
| durable_db_writes_performed | `false` |
| db_write_committed | `false` |
| contains_commit_statement | `false` |
| contains_rollback_statement | `true` |
| write_ready_now | `0` |
| apply_allowed | `false` |
| stop_findings | `0` |

The dry-run artifact transiently updated `public.card_prints.set_code` inside a transaction and then rolled back.

## Durable State Proof

| Snapshot | Hash |
| --- | --- |
| before | `cddc8bf8863e93ab941cf7a22c90cf26e98170f815256cbd6048d49394f76cd9` |
| after | `cddc8bf8863e93ab941cf7a22c90cf26e98170f815256cbd6048d49394f76cd9` |

Durable after snapshot matches before snapshot:

```text
true
```

Target row after dry-run:

```text
card_print_id: a676888d-19e0-4064-89aa-e67019af5b95
name: Pikachu on the Ball
number: 1
set_code: null
child_printings: 1
finish_key: holo
vault_items: 0
```

## Non-Authorizations

```text
DB apply approval: false
PKG-01B approval: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
apply_paths_executed: false
```

## Next Gate

The next gate is explicit operator approval for a real one-row `PKG-01A` apply, using the same target row and rollback proof.
