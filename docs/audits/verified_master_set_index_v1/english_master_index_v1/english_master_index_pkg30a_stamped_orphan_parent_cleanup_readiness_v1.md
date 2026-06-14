# PKG-30A Stamped Orphan Parent Cleanup Readiness V1

Read-only readiness report for stamped cosmos rows that remain unsupported by the Master Index.

No DB writes were performed. No migrations were created. No deletes, merges, quarantine, or global apply are authorized by this report.

| metric | value |
| --- | --- |
| package_id | PKG-30A-STAMPED-ORPHAN-PARENT-CLEANUP-READINESS |
| fingerprint | 6c1199a5dba229a2a085db024ff206d91d575f43a16fa78814d9e7a022ed6584 |
| target_rows | 6 |
| eligible_parent_child_delete_candidates | 0 |
| blocked_rows | 6 |
| db_writes_performed | false |
| migrations_created | false |

## Classification Counts

| classification | rows |
| --- | --- |
| blocked_parent_has_dependencies_or_identity | 6 |

## Eligible Rows

| set | card | variant | child | parent |
| --- | --- | --- | --- | --- |

## Blocked Rows

| set | card | variant | classification | reason |
| --- | --- | --- | --- | --- |
| sv03 | 196 Town Store cosmos | play_pokemon_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
| sv06.5 | 002 Galvantula cosmos | prize_pack_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
| swsh12.5 | 036 Kyogre cosmos | prize_pack_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
| swsh12.5 | 135 Lost Vacuum cosmos | prize_pack_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
| swsh12.5 | 145 Trekking Shoes cosmos | prize_pack_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
| swsh12.5 | 146 Ultra Ball cosmos | prize_pack_stamp | blocked_parent_has_dependencies_or_identity | parent has identity or dependency references and needs a separate transfer/preserve strategy |
