# Collexy Stamp Taxonomy Governance V1

Generated: 2026-06-22T17:44:09.772Z

Audit-only. No DB writes, no migrations, no apply.

This report converts Collexy source findings into governance actions. It does not prepare or authorize writes.

## Summary

| metric | value |
| --- | --- |
| source_records | 17 |
| taxonomy_change_required | 5 |
| placement_identity_split_required | 1 |
| variant_synonym_or_taxonomy_review | 2 |
| queued_variant_mismatch | 2 |
| synonym_governed_review_candidate | 7 |
| write_ready_now | 0 |
| fingerprint_sha256 | `2b8c3e3d2e6d225bd568fec70cbabc634b203275531b7dda0d8c1b99c98d67b8` |

## Rows

| set | number | card | queued | recommended | finish | action | contract | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bw3 | 8 | Karrablast | league_stamp | city_championships_staff_stamp | reverse | variant_taxonomy_change_required | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw3 | 11 | Shelmet | league_stamp | regional_championships_staff_stamp | reverse | variant_taxonomy_change_required | REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw5 | 4 | Scyther | league_stamp | first_place_league_stamp | reverse | placement_identity_split_required | LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw5 | 12 | Flareon | league_stamp | regional_championships_staff_stamp | reverse | variant_taxonomy_change_required | REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw8 | 118 | Colress | league_stamp | player_rewards_crosshatch_stamp | reverse | variant_synonym_or_taxonomy_review | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | not_write_ready_governance_review_required |
| bw8 | 123 | Hypnotoxic Laser | league_stamp | player_rewards_crosshatch_stamp | reverse | variant_synonym_or_taxonomy_review | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | not_write_ready_governance_review_required |
| bw9 | 11 | Leafeon | league_stamp | states_championships_staff_stamp | reverse | variant_taxonomy_change_required | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw9 | 23 | Glaceon | league_stamp | city_championships_staff_stamp | reverse | variant_taxonomy_change_required | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_taxonomy_change_required |
| bw1 | 15 | Tepig | player_rewards_crosshatch_stamp | player_rewards_crosshatch_stamp | reverse | synonym_governed_review_candidate | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw1 | 105 | Grass Energy | play_pokemon_stamp | play_pokemon_stamp | reverse | synonym_governed_review_candidate | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw1 | 106 | Fire Energy | play_pokemon_stamp | play_pokemon_stamp | reverse | synonym_governed_review_candidate | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw2 | 95 | Pokémon Catcher | prize_pack_stamp | play_pokemon_stamp | reverse | queued_variant_mismatch | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | blocked_wrong_family_for_current_queue |
| bw9 | 100 | Frozen City | prize_pack_stamp | player_rewards_crosshatch_stamp | reverse | queued_variant_mismatch | PLAY_POKEMON_PLAYER_REWARDS_STAMP_IDENTITY_RULE_V1 | blocked_wrong_family_for_current_queue |
| bw3 | 80 | Escavalier | national_championships_staff_stamp | national_championships_staff_stamp | reverse | synonym_governed_review_candidate | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw5 | 25 | Vaporeon | states_championships_staff_stamp | states_championships_staff_stamp | reverse | synonym_governed_review_candidate | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw5 | 37 | Jolteon | regional_championships_staff_stamp | regional_championships_staff_stamp | reverse | synonym_governed_review_candidate | REGIONAL_CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |
| bw5 | 84 | Eevee | city_championships_staff_stamp | city_championships_staff_stamp | reverse | synonym_governed_review_candidate | CHAMPIONSHIP_STAMP_IDENTITY_RULE_V1 | not_write_ready_second_source_delta_required |

## Guardrail

No row is write-ready from this report. Rows must go through source-delta comparison, collision checks, rollback-only dry-run preparation, and explicit user approval before any DB write.
