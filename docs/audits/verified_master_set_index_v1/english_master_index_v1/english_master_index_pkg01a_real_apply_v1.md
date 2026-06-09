# English Master Index PKG-01A Real Apply V1

This report records the real one-row `PKG-01A / fut2020` apply authorized by the operator.

## Status

| Field | Value |
| --- | --- |
| apply_status | pkg01a_real_apply_committed_and_verified |
| apply_approved_by_user | true |
| pilot_package_id | PKG-01A |
| set_key | fut2020 |
| updated_rows | 1 |
| db_write_committed | true |
| durable_db_writes_performed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| PKG-01B included | false |
| stop_findings | 0 |

## Before And After

| Snapshot | Hash | set_code | number | name | child_printings | vault_items |
| --- | --- | --- | --- | --- | ---: | ---: |
| before | `cddc8bf8863e93ab941cf7a22c90cf26e98170f815256cbd6048d49394f76cd9` |  | 1 | Pikachu on the Ball | 1 | 0 |
| after | `4fa8b17f27c696704af2f570b015ac015d4ea2f9bae0202293ae2a85f89a7c84` | fut2020 | 1 | Pikachu on the Ball | 1 | 0 |

## Rollback Proof

```sql
update public.card_prints
set set_code = null
where id = 'a676888d-19e0-4064-89aa-e67019af5b95'::uuid
  and set_code = 'fut2020';
```

## Stop Findings

- none

## Non-Authorizations

- PKG-01B remains blocked.
- No migrations were authorized or created.
- No cleanup, quarantine, insertion, deletion, hiding, or normalization was authorized.
- No child printing rows were changed.
- No vault, ownership, provenance, pricing, scanner, or marketplace rows were changed.
