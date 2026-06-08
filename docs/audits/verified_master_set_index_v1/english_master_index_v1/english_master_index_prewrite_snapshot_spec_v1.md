# English Master Index Prewrite Snapshot Spec V1

This is a no-write specification for the future fresh before-state snapshot required after approval.

It does not capture a snapshot, execute SQL, create a migration, or authorize writes.

## Status

| Field | Value |
| --- | --- |
| audit_only | true |
| spec_status | prewrite_snapshot_spec_complete_approval_required_no_write |
| approval_recorded | false |
| write_ready_now | 0 |
| db_reads_performed | false |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| pass | true |
| stop_findings | 0 |

## Package Scope

| Metric | Value |
| --- | --- |
| package_id | PKG-01 |
| package_fingerprint_sha256 | `34cc9acbb81bfadbe2115528a1339cb82afa71fa01fd0d52b62b83834a990b79` |
| card_print_rows | 106 |
| child_printing_rows_verified | 143 |
| affected_sets | 12 |
| approval_guard_status | pass_blank_template_verified_no_write |

## Required Snapshot Content

| Table | Key | Expected | Purpose | Required Columns |
| --- | --- | --- | --- | --- |
| card_prints | id | min 106 | Capture before-state parent identity/display fields for every approved card_print_id. | id, set_id, set_code, number, number_plain, name, updated_at |
| card_printings | card_print_id | min 143 | Verify child printing rows still match the reviewed master-verified finish scope. | id, card_print_id, finish, variant, printing_key, updated_at |
| external_mappings | card_print_id | min 0 | Detect source ownership drift before future mutation. | id, card_print_id, source, external_id, is_active, updated_at |
| card_print_identity | card_print_id | min 0 | Detect active identity/domain-hash drift before future mutation. | id, card_print_id, domain_hash, is_active, updated_at |
| card_print_traits | card_print_id | min 0 | Detect trait drift before future mutation. | id, card_print_id, updated_at |
| vault_items | card_print_id | exact 0 | Stop if any target row has gained vault ownership references. | id, card_print_id, owner_id, updated_at |

## Future Snapshot Stop Rules

- Stop if approval has not been explicitly recorded before snapshot capture.
- Stop if package_fingerprint_sha256 differs from the guarded approval template.
- Stop if any target card_print_id is missing from the fresh snapshot.
- Stop if any target has gained vault_items references.
- Stop if child printing row counts differ from reviewed master-verified counts without documented explanation.
- Stop if active external mappings or identity rows indicate ownership drift.
- Stop if the future snapshot is older than the future execution artifact.

## Target Summary By Set

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

## Explicit Non-Authorizations

- This specification is not approval.
- This specification does not capture a DB snapshot.
- This specification is not SQL.
- This specification is not a migration.
- This specification is not an execution artifact.
- This specification does not allow DB writes, cleanup, quarantine, insertion, deletion, or hiding.

Source approval template: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_operator_approval_record_template_v1.json`
Source approval guard: `docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_operator_approval_template_guard_v1.json`
