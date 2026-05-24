# English Master Index Alias Resolution V1

Generated: 2026-05-24T14:47:16.487Z

Alias Resolution V1 is audit-only. It creates source-backed alias candidates and manual review queues only; it does not mutate canon or resolve aliases automatically.

No DB writes, migrations, cleanup, quarantine, apply, insert, update, or delete operations were performed.

## Safety Confirmation

| check | value |
| --- | --- |
| report_only_generator | scripts/audits/verified_master_set_index_v1_build_alias_resolution.mjs |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_runners_imported | false |
| maintenance_mutation_code_touched | false |

## Summary

| metric | value |
| --- | --- |
| set_unmapped_total | 11176 |
| name_mismatch_total | 196 |
| source_acquisition_alias_rows | 6727 |
| alias_queue_items | 49 |
| source_backed_existing_alias_candidates | 367 |
| manual_alias_resolution_candidates | 49 |

## Category Counts

| category | rows |
| --- | --- |
| missing_set_code | 5733 |
| out_of_scope_pocket | 5427 |
| subset_or_numbering_alias_review | 868 |
| source_coverage_or_alias_gap | 110 |
| subset_number_collision_generations_radiant_collection | 66 |
| subset_number_collision_crown_zenith_galarian_gallery | 25 |
| basic_energy_prefix_style | 16 |
| legacy_orphan | 16 |
| subset_number_collision_call_of_legends_shiny | 15 |
| lvx_suffix_style | 14 |
| subset_number_collision_legendary_treasures_radiant_collection | 11 |
| diacritic_punctuation_only | 9 |
| parenthetical_qualifier | 9 |
| subset_number_collision_arceus_ar_subset | 9 |
| subset_number_collision_celebrations_classic_collection | 8 |
| subset_number_collision_rising_rivals_rotom | 7 |
| subset_number_collision_dp_secret_shiny | 4 |
| subset_number_collision_platinum_secret_shiny | 2 |
| subset_number_collision_supreme_victors_secret_shiny | 1 |

## Top Alias Blocked Sets

| set | rows |
| --- | --- |
| unknown | 5733 |
| B1 | 993 |
| A1 | 858 |
| A4 | 723 |
| A3 | 717 |
| A2 | 621 |
| swsh45sv | 366 |
| A2b | 333 |
| A3b | 321 |
| A4a | 315 |
| A2a | 288 |
| A1a | 258 |
| g1 | 175 |
| bw11 | 96 |
| col1 | 89 |
| swsh12.5 | 70 |
| dpp | 58 |
| swsh12tg | 47 |
| swsh9tg | 46 |
| cel25 | 44 |
| swsh10tg | 30 |
| swsh11tg | 30 |
| hsp | 25 |
| ecard2 | 18 |
| legacy_orphan | 16 |

## Blocked Rules

| bucket | rule |
| --- | --- |
| missing_set_code | Blocked until source provenance is recovered. Do not infer set identity from name/number alone. |
| out_of_scope_pocket | Blocked from English physical TCG master index unless scope changes. |
| subset_number_collision | Blocked until subset numbering and source set alias are proven together. |
| name_mismatch | Blocked from identity rewrite; review as card-name display/alias evidence only. |

## Non-Authority Rules

- Missing set code is not alias evidence.
- Subset number collision is not proof of the target subset.
- Name mismatch is not identity rewrite authority.
- Existing source aliases are reference evidence only until a controlled proof loop consumes them.
