# English Master Index Action Plan V1

Generated: 2026-06-12T08:59:01.119Z

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
| human_source_verified_by_index | 17 |
| master_verified_by_index | 36651 |
| missing_from_grookai | 4564 |
| name_mismatch_needs_review | 176 |
| set_unmapped | 10462 |
| unsupported_by_current_index | 12308 |

## Truth Readiness Summary

| classification | set_count |
| --- | --- |
| proof_ready | 25 |
| high_confidence | 70 |
| blocked | 125 |
| source_limited | 16 |

## 1. Already Proven

| set | name | verified_printings | verified_percent | finish_profiles | apply_status | rollback_artifact_exists |
| --- | --- | --- | --- | --- | --- | --- |
| 2021swsh | McDonald's Collection 2021 | 50 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| 2023sv | McDonald's Collection 2023 | 15 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| 2024sv | McDonald's Collection 2024 | 15 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| base6 |  | 223 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| ecard1 | Expedition Base Set | 330 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| ex5.5 | Poké Card Creator Pack | 5 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| fut2020 | Pokémon Futsal 2020 | 5 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| mcd21 |  | 25 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| me02.5 | Ascended Heroes | 620 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | controlled_apply_completed_and_post_apply_verified | not_verified_by_this_action_plan |
| me04 | Chaos Rising | 247 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| mee | Mega Evolution Energy | 16 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| mfb | My First Battle | 34 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| pop3 | POP Series 3 | 24 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| pop4 | POP Series 4 | 24 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| pop5 | POP Series 5 | 23 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| pop7 | POP Series 7 | 24 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| pop8 | POP Series 8 | 37 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| ru1 | Pokémon Rumble | 19 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| si1 | Southern Islands | 24 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv04 | Paradox Rift | 428 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv04.5 | Paldean Fates | 326 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv06 | Twilight Masquerade | 379 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv08 | Surging Sparks | 420 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv4pt5 |  | 326 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |
| sv6pt5 |  | 154 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | proof_ready_no_apply_record_in_global_artifacts | unknown |

## 2. Do Not Touch

These are not mutation-safe.

| status | count |
| --- | --- |
| missing_from_grookai | 4564 |
| name_mismatch_needs_review | 176 |
| set_unmapped | 10462 |
| unsupported_by_current_index | 12308 |

## 3. Needs Source Acquisition

| lane | rows | categories |
| --- | --- | --- |
| reverse_holo | 1255 | reverse_holo_overgeneration_candidate, reverse_holo_single_source, api_agreed_reverse_holo_needs_human_source |
| holo | 4337 | holo_overgeneration_candidate, holo_single_source, api_agreed_holo_needs_human_source |
| parallel | 694 | modern_parallel_exact_finish_needs_source, modern_parallel_set_review |
| promo | 3010 | promo_family_source_coverage_gap, promo_family_source_only_candidate, promo_family_single_source, api_agreed_promo_family_needs_human_source |
| subset | 952 | subset_or_numbering_alias_review, subset_alias_or_numbering_gap, subset_alias_single_source, api_agreed_subset_alias_needs_human_source |
| legacy | 0 | first_edition_policy_gap, legacy_or_old_era_single_source, api_agreed_legacy_or_old_era_needs_human_source |

## 4. Needs Alias Resolution

| set | name | alias_risk_count | subset_source_need_count |
| --- | --- | --- | --- |
| unknown |  | 5019 | 0 |
| B1 |  | 993 | 0 |
| A1 |  | 858 | 0 |
| A4 |  | 723 | 0 |
| A3 |  | 717 | 0 |
| A2 |  | 621 | 0 |
| A2b |  | 333 | 0 |
| A3b |  | 321 | 0 |
| swsh45sv | Shining Fates Shiny Vault | 0 | 316 |
| A4a |  | 315 | 0 |
| A2a |  | 288 | 0 |
| A1a |  | 258 | 0 |
| g1 | Generations | 52 | 144 |
| bw11 | Legendary Treasures | 17 | 126 |
| col1 | Call of Legends | 24 | 97 |
| pl3 | Supreme Victors | 3 | 87 |
| swsh12tg | Silver Tempest Trainer Gallery | 0 | 47 |
| swsh9tg | Brilliant Stars Trainer Gallery | 0 | 46 |
| swsh10tg | Astral Radiance Trainer Gallery | 0 | 30 |
| swsh11tg | Lost Origin Trainer Gallery | 0 | 30 |
| cel25c | Celebrations: Classic Collection | 0 | 19 |
| sm115 | Hidden Fates | 19 | 0 |
| pl4 | Arceus | 17 | 0 |
| legacy_orphan |  | 16 | 0 |
| pl2 | Rising Rivals | 10 | 5 |

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
| sm2 | Guardians Rising | 167 | 167 |
| sv8pt5 |  | 167 | 167 |
| sm3 | Burning Shadows | 161 | 161 |
| bw7 | Boundaries Crossed | 161 | 161 |
| xy1 | XY | 158 | 158 |
| sm6 | Forbidden Light | 152 | 152 |
| xy10 | Fates Collide | 141 | 141 |
| xy9 | BREAKpoint | 141 | 141 |
| bw8 | Plasma Storm | 140 | 140 |
| bw6 | Dragons Exalted | 132 | 132 |
| xy4 | Phantom Forces | 131 | 131 |
| xy12 | Evolutions | 128 | 128 |
| xy11 | Steam Siege | 126 | 126 |

## 6. Blocked From Apply

| set | name | readiness_score | reasons | rows |
| --- | --- | --- | --- | --- |
| unknown |  | 22 | set_unmapped, no_master_verified_coverage | 5019 |
| smp | SM Black Star Promos | 39.44 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 1079 |
| B1 |  | 22 | set_unmapped, no_master_verified_coverage | 993 |
| swshp | SWSH Black Star Promos | 41.21 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 956 |
| xyp | XY Black Star Promos | 38.7 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 888 |
| A1 |  | 22 | set_unmapped, no_master_verified_coverage | 858 |
| sm12 | Cosmic Eclipse | 81.97 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 820 |
| sm11 | Unified Minds | 82.13 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 785 |
| sm8 | Lost Thunder | 81.2 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 733 |
| svp | Scarlet & Violet Black Star Promos | 70.37 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 731 |
| A4 |  | 22 | set_unmapped, no_master_verified_coverage | 723 |
| A3 |  | 22 | set_unmapped, no_master_verified_coverage | 717 |
| sm10 | Unbroken Bonds | 82.5 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 708 |
| A2 |  | 22 | set_unmapped, no_master_verified_coverage | 621 |
| sm9 | Team Up | 81.93 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 593 |
| sm7 | Celestial Storm | 81.64 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 564 |
| sm1 | Sun & Moon | 81.07 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 551 |
| sv02 | Paldea Evolved | 94.16 | name_mismatch_needs_review, unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 545 |
| sm5 | Ultra Prism | 80.89 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 537 |
| sm2 | Guardians Rising | 81.93 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 522 |
| sm3 | Burning Shadows | 82.31 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 521 |
| sv10.5w | White Flare | 72.4 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 520 |
| sv10.5b | Black Bolt | 72.26 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 518 |
| xy8 | BREAKthrough | 81 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 511 |
| xy5 | Primal Clash | 81.05 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 497 |
| bw7 | Boundaries Crossed | 81.26 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 471 |
| sma | Hidden Fates Shiny Vault | 41.8 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 470 |
| xy1 | XY | 80.5 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 465 |
| sv8pt5 |  | 80.19 | unsupported_by_current_index | 456 |
| sm6 | Forbidden Light | 80.92 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority | 455 |

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
| ex13 | Holon Phantoms | 86.59 | controlled_proof_loop_candidate | high_confidence | higher |
| ex15 | Dragon Frontiers | 86.4 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh10.5 | Pokémon GO | 86.2 | controlled_proof_loop_candidate | high_confidence | higher |
| base4 | Base Set 2 | 86.13 | controlled_proof_loop_candidate | high_confidence | higher |
| ex12 | Legend Maker | 86.03 | controlled_proof_loop_candidate | high_confidence | higher |
| ex11 | Delta Species | 85.97 | controlled_proof_loop_candidate | high_confidence | higher |
| ex2 | Sandstorm | 85.97 | controlled_proof_loop_candidate | high_confidence | higher |
| exu | Unseen Forces Unown Collection | 85.96 | controlled_proof_loop_candidate | high_confidence | higher |
| sv01 | Scarlet & Violet | 85.43 | source_acquisition_first | blocked | higher |
| sv03.5 | 151 | 85.42 | controlled_proof_loop_candidate | high_confidence | higher |
| ex14 | Crystal Guardians | 85.4 | controlled_proof_loop_candidate | high_confidence | higher |
| ex4 | Team Magma vs Team Aqua | 84.97 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh4 | Vivid Voltage | 84.51 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh2 | Rebel Clash | 84.32 | controlled_proof_loop_candidate | high_confidence | higher |
| ex16 | Power Keepers | 84.3 | source_acquisition_then_overgeneration_review | high_confidence | higher |
| ex1 | Ruby & Sapphire | 84.18 | source_acquisition_then_overgeneration_review | high_confidence | higher |
| swsh3.5 | Champion's Path | 83.73 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh3 | Darkness Ablaze | 83.43 | controlled_proof_loop_candidate | high_confidence | higher |
| basep | Wizards Black Star Promos | 83.28 | controlled_proof_loop_candidate | high_confidence | higher |
| ecard3 | Skyridge | 83.24 | source_acquisition_then_overgeneration_review | high_confidence | higher |
| sv07 | Stellar Crown | 83.16 | controlled_proof_loop_candidate | high_confidence | higher |
| ecard2 | Aquapolis | 83 | source_acquisition_then_overgeneration_review | high_confidence | higher |
| sv10 | Destined Rivals | 82.57 | controlled_proof_loop_candidate | high_confidence | higher |
| sv06.5 | Shrouded Fable | 82.49 | controlled_proof_loop_candidate | high_confidence | higher |
| swsh1 | Sword & Shield | 82.4 | controlled_proof_loop_candidate | high_confidence | higher |
