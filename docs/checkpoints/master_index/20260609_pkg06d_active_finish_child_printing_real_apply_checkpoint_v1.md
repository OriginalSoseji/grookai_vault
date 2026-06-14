# PKG-06D Active Finish Child Printing Real Apply Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| apply_status | pkg06d_active_finish_child_printing_real_apply_committed_and_verified |
| package_id | PKG-06D-ACTIVE-FINISH-CHILD-PRINTING-INSERTS |
| package_fingerprint_sha256 | `c67558f261d8d70faf6beac7f63faafa5b627cf0cf7dfeb09989da5e617055b1` |
| sql_hash_sha256 | `00e3b463005122578ea313e7ca7ac0819fcc49fe6b5d005d1379452a0fc6ffec` |
| inserted_rows | 319 |
| parent_rows_unchanged | true |
| db_write_committed | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| parent_writes_performed | false |
| stop_findings | 0 |

## Safety

- Real apply was scoped to 319 child-only card_printing inserts.
- Parent rows were not changed.
- No migrations.
- No global apply.
- No deletes, merges, unsupported cleanup, or quarantine.
