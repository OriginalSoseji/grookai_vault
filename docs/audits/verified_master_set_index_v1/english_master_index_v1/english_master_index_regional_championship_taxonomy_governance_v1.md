# Regional Championship Taxonomy Governance V1

Audit-only application of `REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1` to Regional Championships evidence rows.

## Summary

| metric | value |
| --- | --- |
| target_rows | 3 |
| identity_governed_finish_blocked | 3 |
| write_ready_now | 0 |
| db_writes_performed | false |
| migrations_created | false |
| fingerprint_sha256 | `ea65b2aefdc4ec5e8b67578ac8a03668aee9e5f2c9ad7dfe612ff94c647526fa` |

## Decision

- Regional Championships wording is parent identity-bearing.
- Staff and non-Staff Regional Championships identities must stay separate.
- Crosshatch is evidence/display metadata for now, not a child `finish_key`.
- Active child finish remains blocked until exact source labels can be adjudicated into an existing finish key.

## Rows

| set | number | card | governed variant | crosshatch treatment | active finish status | next action |
| --- | --- | --- | --- | --- | --- | --- |
| dv1 | 6 | Bagon | regional_championships_stamp | evidence_and_display_metadata_not_finish_key | blocked_pending_exact_finish_adjudication | Use regional_championships_stamp as the parent identity modifier, then adjudicate active finish from exact sources before any guarded dry-run package. |
| dv1 | 7 | Shelgon | regional_championships_stamp | evidence_and_display_metadata_not_finish_key | blocked_pending_exact_finish_adjudication | Use regional_championships_stamp as the parent identity modifier, then adjudicate active finish from exact sources before any guarded dry-run package. |
| dv1 | 8 | Salamence | regional_championships_stamp | evidence_and_display_metadata_not_finish_key | blocked_pending_exact_finish_adjudication | Use regional_championships_stamp as the parent identity modifier, then adjudicate active finish from exact sources before any guarded dry-run package. |

## Safety

- No DB writes.
- No migrations.
- No dry-run package prepared.
- No finish-key activation.
- No collapse into generic `league_stamp`.
