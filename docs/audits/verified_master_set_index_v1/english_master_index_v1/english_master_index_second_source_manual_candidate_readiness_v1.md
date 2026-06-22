# Second Source Manual Candidate Readiness V1

Generated: 2026-06-22T05:32:17.100Z

Audit-only readiness split for manual second-source stamped/special evidence candidates.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| rows | 6 |
| existing_parent_child_missing_candidates | 1 |
| parent_identity_child_insert_candidates | 0 |
| already_satisfied_rows | 3 |
| blocked_rows | 2 |
| write_ready_now | 0 |
| fingerprint_sha256 | `98a825e9f729657f260b8dbe6009b36ef147a97f04772b5c0526e422b561972d` |

## Rows

| set | number | card | variant | finish | route | blockers |
| --- | --- | --- | --- | --- | --- | --- |
| bw5 | 25 | Vaporeon | regional_championships_staff_stamp | reverse | already_satisfied_existing_parent_child_present |  |
| me02 | 026 | Suicune | eb_games_stamp | cosmos | blocked | missing_base_parent |
| sm1 | 135 | Ultra Ball | europe_championships_staff_stamp | reverse | already_satisfied_existing_parent_child_present |  |
| sm1 | 135 | Ultra Ball | regional_championships_staff_stamp | holo | blocked | context_only_not_target_variant |
| xy1 | 083 | Honedge | regional_championships_staff_stamp | holo | existing_parent_child_missing_candidate |  |
| xy1 | 085 | Aegislash | regional_championships_staff_stamp | reverse | already_satisfied_existing_parent_child_present |  |

## Boundary

This report does not authorize writes. Existing-parent candidates need a separate rollback-only child/identity reconciliation artifact. Parent insert candidates need a separate rollback-only parent/identity/child insert artifact.
