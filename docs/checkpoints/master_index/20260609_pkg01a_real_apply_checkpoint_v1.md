# PKG-01A Real Apply Checkpoint V1

Date: 2026-06-09

## Scope

This checkpoint records the approved real one-row apply for `PKG-01A / fut2020`.

Operator approval:

```text
Approve real one-row PKG-01A apply only.
```

Approved scope:

- `PKG-01A` only
- set key `fut2020`
- one `card_prints` row
- field change: `set_code`

Not approved:

- `PKG-01B`
- migrations
- cleanup
- quarantine
- insertion
- deletion
- hiding
- normalization
- child printing changes
- vault, ownership, provenance, pricing, scanner, or marketplace changes

## Result

```text
pkg01a_real_apply_committed_and_verified
```

Generated reports:

- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_real_apply_v1.json`
- `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_pkg01a_real_apply_v1.md`

## Target Row

| Field | Value |
| --- | --- |
| card_print_id | `a676888d-19e0-4064-89aa-e67019af5b95` |
| name | `Pikachu on the Ball` |
| number | `1` |
| changed field | `set_code` |
| before set_code | `null` |
| after set_code | `fut2020` |
| updated rows | `1` |

## Verification

| Check | Result |
| --- | --- |
| db_write_committed | `true` |
| durable_db_writes_performed | `true` |
| parent_set_code_resolved | `true` |
| child_printing_count_unchanged | `true` |
| finish_scope_unchanged | `true` |
| vault_items_still_zero | `true` |
| PKG-01B included | `false` |
| stop_findings | `0` |

Snapshot hashes:

| Snapshot | Hash |
| --- | --- |
| before | `cddc8bf8863e93ab941cf7a22c90cf26e98170f815256cbd6048d49394f76cd9` |
| after | `4fa8b17f27c696704af2f570b015ac015d4ea2f9bae0202293ae2a85f89a7c84` |

The hash changed only because the approved parent `set_code` changed from `null` to `fut2020`.

## Rollback Proof

Rollback remains scoped to the same one row:

```sql
update public.card_prints
set set_code = null
where id = 'a676888d-19e0-4064-89aa-e67019af5b95'::uuid
  and set_code = 'fut2020';
```

Rollback must not touch `PKG-01B`, `card_printings`, vault ownership, provenance, pricing, scanner, or marketplace tables.

## Safety State

```text
migrations_created: false
cleanup_performed: false
quarantine_performed: false
child_printing_rows_changed: false
pkg01b_included: false
```

## Next Gate

The next gate is post-apply Master Index comparison/report regeneration for `fut2020`, then a decision on whether to prepare the next one-set package from `PKG-01B`.
