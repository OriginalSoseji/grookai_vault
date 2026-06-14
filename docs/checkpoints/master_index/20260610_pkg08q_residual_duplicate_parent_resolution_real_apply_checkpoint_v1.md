# PKG-08Q Residual Duplicate Parent Resolution Real Apply V1

Approved real apply for the safe subset of residual duplicate-parent rows.

| Field | Value |
| --- | --- |
| apply_status | pkg08q_residual_duplicate_parent_resolution_committed |
| package_fingerprint_sha256 | `a0d03986b2871b4cb8b42a637bfbd695e54dc9cd4691760a16870eb14d283839` |
| db_write_committed | true |
| groups | 2 |
| child_inserts | 3 |
| duplicate_parent_deletes | 2 |
| mapping_transfers | 2 |
| blocked_append_only_rows | 1 |
| migrations_created | false |
| unsupported_cleanup_performed | false |
| quarantine_performed | false |
| stop_findings | 0 |

## By Set

| set_key | rows |
| --- | --- |
| swsh12.5 | 1 |
| swsh6 | 2 |

## Blocked Rows

| set_key | card_number | card_name | finish_key | blocked_reason |
| --- | --- | --- | --- | --- |
| sv03.5 | 25 | Pikachu | cosmos | duplicate_parent_has_append_only_card_feed_events_requires_non_delete_strategy |
