# PKG-31A External ID Relocation Readiness V1

Read-only readiness for dependency-blocked unsupported child rows whose only dependency is an external printing mapping.

This report does not authorize a real apply. No DB writes were committed. No migrations were created.

| metric | value |
| --- | --- |
| package_id | PKG-31A-EXTERNAL-ID-RELOCATION-READINESS |
| fingerprint | 131a318841a43eb488a9f685a004e50540606f59dfa3cd8dd70777d446077f3d |
| source_readiness_fingerprint | 88e5caf823dd3f5a937fa04662fbe1be984fb4eb3dc67e4922ee18becbfbb907 |
| input_rows | 7 |
| transfer_ready_existing_target_child | 0 |
| blocked_no_master_target | 7 |
| db_writes_committed | false |
| migrations_created | false |

## Ready Rows By Target Rule

| target_rule | count |
| --- | --- |

## Blocked Rows By Target Rule

| target_rule | count |
| --- | --- |
| suffix_external_id | 7 |

## Blocked Rows

| classification | source | external_id | parsed_target | reason |
| --- | --- | --- | --- | --- |
| blocked_no_master_target | g1 28 Jolteon-EX reverse | g1-28a | g1 28a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy10 43a Regirock-EX reverse | xy10-43a | xy10 43a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy10 54a Zygarde-EX reverse | xy10-54a | xy10 54a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy3 55 M Lucario-EX reverse | xy3-55a | xy3 55a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy4 24 M Manectric-EX reverse | xy4-24a | xy4 24a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy4 65a Aegislash-EX reverse | xy4-65a | xy4 65a | external ID target does not exist as a Master-verified printing |
| blocked_no_master_target | xy6 77 Shaymin-EX reverse | xy6-77a | xy6 77a | external ID target does not exist as a Master-verified printing |
