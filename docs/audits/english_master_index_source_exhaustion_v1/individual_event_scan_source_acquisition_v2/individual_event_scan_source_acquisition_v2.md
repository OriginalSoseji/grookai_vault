# Individual Event Scan Source Acquisition V2

Audit-only source acquisition for the remaining individual-event stamped/special rows.

## Summary

| metric | value |
| --- | ---: |
| target_remaining_rows | 20 |
| rows_attempted | 20 |
| source_ready_candidates | 9 |
| identity_supported_finish_unproven | 7 |
| taxonomy_review_no_write | 4 |
| fixture_records_written | 19 |
| write_ready_created | 0 |

## Evidence Rows

| set | number | card | stamp | finish | status | sources |
| --- | --- | --- | --- | --- | --- | ---: |
| hgss2 | 24 | Steelix | Player Rewards Crosshatch Stamp | holo | source_ready_candidate_no_db_write | 2 |
| hgss1 | 40 | Donphan | Player Rewards Crosshatch Stamp | holo | source_ready_candidate_no_db_write | 3 |
| pl3 | 136 | Cynthia's Guidance | PokéBall Stamped, Player Rewards Promo; 2009 2010 | unproven | identity_supported_finish_unproven | 1 |
| me02 | 26 | Suicune | EB Games Stamp | unproven | taxonomy_review_no_write | 2 |
| sm10 | 129 | Melmetal | Unbroken Bonds Stamp | holo | source_ready_candidate_no_db_write | 2 |
| sm8 | 59 | Suicune | Legendary PokéMon Stamp | holo | source_ready_candidate_no_db_write | 2 |
| sm9 | 19 | Moltres | Team Up Stamp | holo | source_ready_candidate_no_db_write | 2 |
| sv10 | 51 | Team Rocket's Articuno | Destined Rivals Stamp | cosmos | source_ready_candidate_no_db_write | 2 |
| sv10 | 70 | Team Rocket's Zapdos | Destined Rivals Stamp | holo | source_ready_candidate_no_db_write | 2 |
| swsh11 | 76 | Hisuian Zoroark | Lost Origin Stamp | unproven | identity_supported_finish_unproven | 1 |
| smp | SM86 | Pikachu | Alolan Raichu Half Deck 14 Stamp | unproven | taxonomy_review_no_write | 2 |
| swsh12 | 131 | Dragonite | Silver Tempest Stamp | unproven | identity_supported_finish_unproven | 3 |
| swsh3 | 150 | Bunnelby | Play! PokéMon, Thank You Stamp | reverse | source_ready_candidate_no_db_write | 2 |
| swsh3 | 172 | Turbo Patch | Play! PokéMon, Thank You Stamp | unproven | identity_supported_finish_unproven | 2 |
| swsh3 | 36 | Galarian Mr. Rime | Play! PokéMon, Thank You Stamp | unproven | identity_supported_finish_unproven | 2 |
| swsh3 | 78 | Dedenne | Play! PokéMon, Thank You Stamp | unproven | identity_supported_finish_unproven | 1 |
| swsh3 | 83 | Polteageist | Play! PokéMon, Thank You Stamp | unproven | identity_supported_finish_unproven | 2 |
| swsh4 | 131 | Snorlax | Vivid Voltage Stamp | cosmos | source_ready_candidate_no_db_write | 2 |
| swsh5 | 82 | Sandaconda | EB Games Stamp | unproven | taxonomy_review_no_write | 2 |
| xy6 | 20 | Pikachu | McDonald's Stamp | unproven | taxonomy_review_no_write | 2 |

## Safety

- No DB writes.
- No migrations.
- No dry-run package prepared.
- Taxonomy rows remain blocked.

Fixture: `docs\audits\verified_master_set_index_v1\source_fixtures\generated_individual_event_scan_source_acquisition_v2\individual_event_scan_source_acquisition_v2.json`

Fingerprint: `6b91557297178faf801a23ec5e2ffdc6b100a76bf0b687cd26dd93f08881fca8`
