# PKG-02F Duplicate Dependency Transfer Real Apply Checkpoint V1

Date: 2026-06-09

## Purpose

Record the approved real apply for PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER after successful rollback-only dry-run proof.

## Result

| Field | Value |
| --- | --- |
| apply_status | pkg02f_duplicate_dependency_transfer_real_apply_committed_and_verified |
| package_id | PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER |
| package_fingerprint_sha256 | `21a4bfe4e443cf098d7ae257216fbfcd8daa5be06b9232af56328dc531b42d0a` |
| updated_external_mapping_rows | 21 |
| deleted_child_rows | 23 |
| deleted_parent_rows | 21 |
| db_write_committed | true |
| number_key_rows_unchanged | true |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| global_apply_included | false |
| stop_findings | 0 |

## Safety

- Real apply was scoped to PKG-02F-DUPLICATE-DEPENDENCY-TRANSFER only.
- Duplicate parent rows deleted: 21.
- Duplicate child rows deleted: 23.
- Number-key collision rows excluded and unchanged: 58.
- No migrations.
- No global apply.
- No quarantine.

