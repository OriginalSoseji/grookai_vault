# English Master Index Action Plan V1

Generated: 2026-06-08T19:45:00.417Z

Audit only. No DB writes, migrations, inserts, cleanup, quarantine, or public hiding were performed.

Global principles:

- `unsupported_by_current_index` is not deletion authority.
- `missing_from_grookai` is not insertion authority.
- `candidate_unconfirmed` is not truth.
- `api_agreed` is not master truth.
- Only `master_verified` evidence may eventually participate in controlled normalization.

## Safety Confirmation

| check | value |
| --- | --- |
| report_only_generator | scripts/audits/verified_master_set_index_v1_build_action_plan.mjs |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_runners_imported | false |
| maintenance_mutation_code_touched | false |

## Global Status Counts

| status | count |
| --- | --- |
| human_source_verified_by_index | 1 |
| master_verified_by_index | 31975 |
| missing_from_grookai | 7317 |
| name_mismatch_needs_review | 139 |
| set_unmapped | 11176 |
| unsupported_by_current_index | 11975 |

## Truth Readiness Summary

| classification | set_count |
| --- | --- |
| proof_ready | 8 |
| high_confidence | 75 |
| blocked | 124 |
| source_limited | 29 |

## 1. Already Proven

| set | name | verified_printings | verified_percent | finish_profiles | apply_status | rollback_artifact_exists |
| --- | --- | --- | --- | --- | --- | --- |
| base6 |  | 223 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| ecard1 | Expedition Base Set | 330 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| ex5.5 | Poké Card Creator Pack | 5 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| mcd21 |  | 25 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| me02.5 | Ascended Heroes | 620 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | controlled_apply_completed_and_post_apply_verified | not_verified_by_this_action_plan |
| sv04.5 | Paldean Fates | 178 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv4pt5 |  | 326 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv6pt5 |  | 154 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |

## 2. Do Not Touch

These are not mutation-safe.

| status | count |
| --- | --- |
| missing_from_grookai | 7317 |
| name_mismatch_needs_review | 139 |
| set_unmapped | 11176 |
| unsupported_by_current_index | 11975 |

## 3. Needs Source Acquisition

| lane | rows | categories |
| --- | --- | --- |
| reverse_holo | 1253 | reverse_holo_overgeneration_candidate, reverse_holo_single_source, api_agreed_reverse_holo_needs_human_source |
| holo | 4274 | holo_overgeneration_candidate, holo_single_source, api_agreed_holo_needs_human_source |
| parallel | 694 | modern_parallel_exact_finish_needs_source, modern_parallel_set_review |
| promo | 2862 | promo_family_source_coverage_gap, promo_family_source_only_candidate, promo_family_single_source, api_agreed_promo_family_needs_human_source |
| subset | 1015 | subset_or_numbering_alias_review, subset_alias_or_numbering_gap, subset_alias_single_source, api_agreed_subset_alias_needs_human_source |
| legacy | 0 | first_edition_policy_gap, legacy_or_old_era_single_source, api_agreed_legacy_or_old_era_needs_human_source |

## 4. Needs Alias Resolution

| set | name | alias_risk_count | subset_source_need_count |
| --- | --- | --- | --- |
| unknown |  | 5733 | 0 |
| B1 |  | 993 | 0 |
| A1 |  | 858 | 0 |
| A4 |  | 723 | 0 |
| A3 |  | 717 | 0 |
| A2 |  | 621 | 0 |
| swsh45sv | Shining Fates Shiny Vault | 0 | 366 |
| A2b |  | 333 | 0 |
| A3b |  | 321 | 0 |
| A4a |  | 315 | 0 |
| A2a |  | 288 | 0 |
| A1a |  | 258 | 0 |
| g1 | Generations | 52 | 143 |
| bw11 | Legendary Treasures | 10 | 108 |
| col1 | Call of Legends | 12 | 90 |
| pl3 | Supreme Victors | 1 | 86 |
| swsh12.5 | Crown Zenith | 25 | 45 |
| swsh12tg | Silver Tempest Trainer Gallery | 0 | 47 |
| swsh9tg | Brilliant Stars Trainer Gallery | 0 | 46 |
| swsh10tg | Astral Radiance Trainer Gallery | 0 | 30 |
| swsh11tg | Lost Origin Trainer Gallery | 0 | 30 |
| cel25 | Celebrations | 0 | 22 |
| legacy_orphan |  | 16 | 0 |
| pl4 | Arceus | 9 | 0 |
| pl2 | Rising Rivals | 7 | 1 |

## 5. Likely Generation Bug Candidates

High suspicion only. These are not deletion candidates.

| set | name | likely_generation_bug_count | unsupported_count |
| --- | --- | --- | --- |
| sm12 | Cosmic Eclipse | 269 | 269 |
| sv10.5w | White Flare | 264 | 264 |
| sv10.5b | Black Bolt | 263 | 263 |
| sm11 | Unified Minds | 253 | 253 |
| sm8 | Lost Thunder | 241 | 241 |
| sm10 | Unbroken Bonds | 227 | 227 |
| sm9 | Team Up | 196 | 196 |
| sm7 | Celestial Storm | 184 | 184 |
| sm5 | Ultra Prism | 178 | 178 |
| sm1 | Sun & Moon | 177 | 177 |
| xy5 | Primal Clash | 173 | 173 |
| xy8 | BREAKthrough | 172 | 172 |
| sv8pt5 |  | 167 | 167 |
| sm2 | Guardians Rising | 166 | 166 |
| sm3 | Burning Shadows | 161 | 161 |
| bw7 | Boundaries Crossed | 161 | 161 |
| xy1 | XY | 156 | 156 |
| sm6 | Forbidden Light | 151 | 151 |
| xy10 | Fates Collide | 141 | 141 |
| xy9 | BREAKpoint | 141 | 141 |
| bw8 | Plasma Storm | 140 | 140 |
| xy4 | Phantom Forces | 131 | 131 |
| bw6 | Dragons Exalted | 130 | 130 |
| xy12 | Evolutions | 127 | 127 |
| xy11 | Steam Siege | 126 | 126 |

## 6. Blocked From Apply

| set | name | readiness_score | reasons | rows |
| --- | --- | --- | --- | --- |
| unknown |  | 22 | set_unmapped, no_master_verified_coverage | 5733 |
| smp | SM Black Star Promos | 39.61 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 1052 |
| B1 |  | 22 | set_unmapped, no_master_verified_coverage | 993 |
| xyp | XY Black Star Promos | 38.8 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 872 |
| swshp | SWSH Black Star Promos | 42.11 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 862 |
| A1 |  | 22 | set_unmapped, no_master_verified_coverage | 858 |
| sm12 | Cosmic Eclipse | 81.81 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 819 |
| sm11 | Unified Minds | 81.77 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 785 |
| sm8 | Lost Thunder | 80.36 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 731 |
| A4 |  | 22 | set_unmapped, no_master_verified_coverage | 723 |
| A3 |  | 22 | set_unmapped, no_master_verified_coverage | 717 |
| sm10 | Unbroken Bonds | 82.17 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 708 |
| svp | Scarlet & Violet Black Star Promos | 66.69 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 695 |
| A2 |  | 22 | set_unmapped, no_master_verified_coverage | 621 |
| sm9 | Team Up | 81.63 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 593 |
| sm7 | Celestial Storm | 81.03 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 561 |
| sm1 | Sun & Moon | 79.2 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 548 |
| sm5 | Ultra Prism | 80.49 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 532 |
| sv02 | Paldea Evolved | 93.48 | name_mismatch_needs_review, unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 525 |
| sv10.5w | White Flare | 72.4 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 520 |
| sm3 | Burning Shadows | 81.92 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 519 |
| sm2 | Guardians Rising | 81.46 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 518 |
| sv10.5b | Black Bolt | 72.26 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 518 |
| xy8 | BREAKthrough | 79.79 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 509 |
| xy5 | Primal Clash | 80.58 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 497 |
| swsh45sv | Shining Fates Shiny Vault | 23.5 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 488 |
| bw7 | Boundaries Crossed | 80.11 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 470 |
| sma | Hidden Fates Shiny Vault | 41.8 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 470 |
| xy1 | XY | 78.97 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 459 |
| sv01 | Scarlet & Violet | 97.32 | name_mismatch_needs_review, missing_from_grookai_not_insertion_authority | 450 |

## 6a. Finish Blocker Boundary

These rows are not normal source-acquisition gaps. Current exact evidence indicates finish-label or card-number conflicts, so they require manual adjudication and are not mutation-safe.

| set | number | name | finish | blocker_type | next_action |
| --- | --- | --- | --- | --- | --- |
| bw8 | 94 | Druddigon | holo | finish_label_conflict | Classify as finish-label conflict unless an exact plain holo source is found. |
| ex9 | 107 | Farfetch'd | normal | finish_label_conflict | Classify as possible unsupported normal unless an exact normal-source record is found. |
| sm8 | 187 | Net Ball | stamped | card_number_conflict | Resolve numbering/alias identity before any promotion. |
| sv03.5 | 146 | Moltres | normal | finish_label_conflict | Classify as possible unsupported normal unless exact normal evidence is found. |
| swsh3.5 | 62 | Professor's Research (Professor Magnolia) | normal | finish_label_conflict | Classify as possible unsupported normal unless exact normal evidence is found. |

## 7. Controlled Set Repair Candidates

| set | name | priority_score | recommendation | readiness | expected_repair_safety |
| --- | --- | --- | --- | --- | --- |
| sv08 | Surging Sparks | 86.59 | controlled_proof_loop_candidate | high_confidence | higher |
| sv03 | Obsidian Flames | 86.56 | controlled_proof_loop_candidate | high_confidence | higher |
| base4 | Base Set 2 | 86.12 | controlled_proof_loop_candidate | high_confidence | higher |
| sv06 | Twilight Masquerade | 86.08 | controlled_proof_loop_candidate | high_confidence | higher |
| ex2 | Sandstorm | 85.96 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh10.5 | Pokémon GO | 84.34 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh3.5 | Champion's Path | 83.73 | controlled_proof_loop_candidate | high_confidence | higher |
| sv01 | Scarlet & Violet | 83.62 | source_acquisition_first | blocked | higher |
| sv04 | Paradox Rift | 83.61 | controlled_proof_loop_candidate | high_confidence | higher |
| sv03.5 | 151 | 83.3 | controlled_proof_loop_candidate | high_confidence | higher |
| ex4 | Team Magma vs Team Aqua | 83.25 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh3 | Darkness Ablaze | 82.08 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh4 | Vivid Voltage | 82.08 | controlled_proof_loop_candidate | high_confidence | higher |
| sv07 | Stellar Crown | 82.05 | controlled_proof_loop_candidate | high_confidence | higher |
| ex1 | Ruby & Sapphire | 81.6 | controlled_proof_loop_candidate | high_confidence | higher |
| sv09 | Journey Together | 81.5 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh2 | Rebel Clash | 81.41 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh8 | Fusion Strike | 81.32 | source_acquisition_then_overgeneration_review | high_confidence | higher |
| sv10 | Destined Rivals | 80.55 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh5 | Battle Styles | 80 | controlled_proof_loop_candidate | high_confidence | higher |
| pgo |  | 79.8 | controlled_proof_loop_candidate | high_confidence | higher |
| tk2a |  | 79.78 | controlled_proof_loop_candidate | high_confidence | higher |
| tk2b |  | 79.78 | controlled_proof_loop_candidate | high_confidence | higher |
| tk1a |  | 79.74 | controlled_proof_loop_candidate | high_confidence | higher |
| tk1b |  | 79.74 | controlled_proof_loop_candidate | high_confidence | higher |
