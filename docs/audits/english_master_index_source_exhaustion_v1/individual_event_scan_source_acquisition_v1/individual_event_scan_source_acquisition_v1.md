# Individual Event Scan Source Acquisition V1

Audit-only source acquisition for the first individual-event stamped/special rows.

## Summary

| metric | value |
| --- | ---: |
| target_queue_rows | 28 |
| rows_attempted | 8 |
| source_ready_candidates | 6 |
| identity_supported_finish_unproven | 2 |
| unattempted_rows | 20 |
| fixture_records_written | 9 |
| write_ready_created | 0 |

## Evidence Rows

| set | number | card | stamp | finish | status | sources |
| --- | --- | --- | --- | --- | --- | ---: |
| bw1 | 111 | Darkness Energy | Play! Pokemon Stamp | holo | source_ready_candidate_no_db_write | 1 |
| col1 | 88 | Grass Energy | Player Rewards Crosshatch Stamp | holo | source_ready_candidate_no_db_write | 1 |
| ex10 | 29 | Lugia | Pokemon Rocks America Stamped; 2005 | normal | source_ready_candidate_no_db_write | 2 |
| ex11 | 61 | Ditto | Origins Game Fair Stamped; 200 | unproven | identity_supported_finish_unproven | 1 |
| ex11 | 64 | Ditto | Games Expo Stamped; 2007 | unproven | identity_supported_finish_unproven | 1 |
| ex12 | 5 | Gengar | Gym Challenge Stamped; 2006 2007 | normal | source_ready_candidate_no_db_write | 2 |
| ex9 | 60 | Pikachu | San Diego Comic Con International Stamped; 2005 | normal | source_ready_candidate_no_db_write | 2 |
| ex9 | 70 | Treecko | Indianapolis GenCon Stamped; 2005 | normal | source_ready_candidate_no_db_write | 1 |

## Safety

- No DB writes.
- No migrations.
- No dry-run package prepared.
- Source-ready means evidence was preserved for future source-delta review only.

Fixture: `docs\audits\verified_master_set_index_v1\source_fixtures\generated_individual_event_scan_source_acquisition_v1\individual_event_scan_source_acquisition_v1.json`

Fingerprint: `2a93788d74d2e6e30fa1dabeeb2b775fec18f5c74c201edb3794d39cfa9fa40e`
