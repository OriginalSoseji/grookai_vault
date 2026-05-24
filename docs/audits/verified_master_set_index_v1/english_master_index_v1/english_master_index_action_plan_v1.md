# English Master Index Action Plan V1

Generated: 2026-05-24T14:13:11.642Z

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
| api_agreed_by_index | 21179 |
| candidate_unconfirmed_by_index | 11606 |
| master_verified_by_index | 620 |
| missing_from_grookai | 6080 |
| name_mismatch_needs_review | 196 |
| set_unmapped | 11176 |
| unsupported_by_current_index | 10489 |

## Truth Readiness Summary

| classification | set_count |
| --- | --- |
| proof_ready | 1 |
| moderate_confidence | 50 |
| blocked | 125 |
| source_limited | 66 |

## 1. Already Proven

| set | name | verified_printings | verified_percent | finish_profiles | apply_status | rollback_artifact_exists |
| --- | --- | --- | --- | --- | --- | --- |
| me02.5 | Ascended Heroes | 620 | 100 | normal, holo, reverse, pokeball, cosmos, rocket_reverse | controlled_apply_completed_and_post_apply_verified | not_verified_by_this_action_plan |

## 2. Do Not Touch

These are not mutation-safe.

| status | count |
| --- | --- |
| api_agreed_by_index | 21179 |
| candidate_unconfirmed_by_index | 11606 |
| missing_from_grookai | 6080 |
| name_mismatch_needs_review | 196 |
| set_unmapped | 11176 |
| unsupported_by_current_index | 10489 |

## 3. Needs Source Acquisition

| lane | rows | categories |
| --- | --- | --- |
| reverse_holo | 9818 | reverse_holo_overgeneration_candidate, reverse_holo_single_source, api_agreed_reverse_holo_needs_human_source |
| holo | 8426 | holo_overgeneration_candidate, holo_single_source, api_agreed_holo_needs_human_source |
| parallel | 691 | modern_parallel_exact_finish_needs_source, modern_parallel_set_review |
| promo | 4652 | promo_family_source_coverage_gap, promo_family_source_only_candidate, promo_family_single_source, api_agreed_promo_family_needs_human_source |
| subset | 3512 | subset_or_numbering_alias_review, subset_alias_or_numbering_gap, subset_alias_single_source, api_agreed_subset_alias_needs_human_source |
| legacy | 8160 | first_edition_policy_gap, legacy_or_old_era_single_source, api_agreed_legacy_or_old_era_needs_human_source |

## 4. Needs Alias Resolution

| set | name | alias_risk_count | subset_source_need_count |
| --- | --- | --- | --- |
| unknown |  | 5733 | 0 |
| B1 |  | 993 | 0 |
| A1 |  | 858 | 0 |
| A4 |  | 723 | 0 |
| A3 |  | 717 | 0 |
| A2 |  | 621 | 0 |
| swsh45sv | Shining Fates Shiny Vault | 0 | 488 |
| pl3 | Supreme Victors | 1 | 414 |
| bw11 | Legendary Treasures | 11 | 391 |
| g1 | Generations | 66 | 322 |
| swsh12.5 |  | 25 | 317 |
| A2b |  | 333 | 0 |
| A3b |  | 321 | 0 |
| A4a |  | 315 | 0 |
| col1 | Call of Legends | 15 | 298 |
| A2a |  | 288 | 0 |
| pl2 | Rising Rivals | 8 | 262 |
| pl1 | Platinum | 2 | 258 |
| A1a |  | 258 | 0 |
| dp7 | Stormfront | 4 | 208 |
| pl4 | Arceus | 9 | 195 |
| swsh12tg | Silver Tempest Trainer Gallery | 0 | 77 |
| swsh9tg | Brilliant Stars Trainer Gallery | 0 | 76 |
| cel25 | Celebrations | 8 | 61 |
| swsh10tg | Astral Radiance Trainer Gallery | 0 | 60 |

## 5. Likely Generation Bug Candidates

High suspicion only. These are not deletion candidates.

| set | name | likely_generation_bug_count | unsupported_count |
| --- | --- | --- | --- |
| sv10.5w |  | 263 | 263 |
| sv10.5b |  | 261 | 261 |
| sm12 | Cosmic Eclipse | 249 | 249 |
| sm11 | Unified Minds | 237 | 237 |
| sm8 | Lost Thunder | 215 | 215 |
| sm10 | Unbroken Bonds | 212 | 212 |
| sm9 | Team Up | 177 | 177 |
| sv8pt5 | Prismatic Evolutions | 167 | 167 |
| sm7 | Celestial Storm | 165 | 165 |
| sm1 | Sun & Moon | 165 | 165 |
| sm5 | Ultra Prism | 160 | 160 |
| sm3 | Burning Shadows | 156 | 156 |
| sm2 | Guardians Rising | 154 | 154 |
| xy8 | BREAKthrough | 148 | 148 |
| xy5 | Primal Clash | 146 | 146 |
| xy1 | XY | 139 | 139 |
| bw7 | Boundaries Crossed | 135 | 135 |
| sm6 | Forbidden Light | 134 | 134 |
| bw8 | Plasma Storm | 128 | 128 |
| xy10 | Fates Collide | 121 | 121 |
| bw6 | Dragons Exalted | 118 | 118 |
| xy9 | BREAKpoint | 118 | 118 |
| sm4 | Crimson Invasion | 112 | 112 |
| bw1 | Black & White | 111 | 111 |
| xy4 | Phantom Forces | 111 | 111 |

## 6. Blocked From Apply

| set | name | readiness_score | reasons | rows |
| --- | --- | --- | --- | --- |
| unknown |  | 22 | set_unmapped, no_master_verified_coverage | 5733 |
| smp | SM Black Star Promos | 41.67 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 1215 |
| xyp | XY Black Star Promos | 41.62 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 1056 |
| B1 |  | 22 | set_unmapped, no_master_verified_coverage | 993 |
| swshp | SWSH Black Star Promos | 43.05 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 930 |
| A1 |  | 22 | set_unmapped, no_master_verified_coverage | 858 |
| sm12 | Cosmic Eclipse | 55.96 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 813 |
| sm11 | Unified Minds | 56.16 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 774 |
| A4 |  | 22 | set_unmapped, no_master_verified_coverage | 723 |
| A3 |  | 22 | set_unmapped, no_master_verified_coverage | 717 |
| sm8 | Lost Thunder | 56.11 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 708 |
| sm10 | Unbroken Bonds | 56.2 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 702 |
| A2 |  | 22 | set_unmapped, no_master_verified_coverage | 621 |
| svp | Scarlet & Violet Black Star Promos | 56.14 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 615 |
| sm9 | Team Up | 56.12 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 588 |
| sm7 | Celestial Storm | 56.21 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 549 |
| sm5 | Ultra Prism | 55.97 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 519 |
| sv10.5w |  | 55.15 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 519 |
| sm1 | Sun & Moon | 55.59 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 516 |
| sv10.5b |  | 55.08 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 516 |
| sm2 | Guardians Rising | 55.94 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 507 |
| sm3 | Burning Shadows | 55.83 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 507 |
| xy8 | BREAKthrough | 56.58 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 493 |
| xy5 | Primal Clash | 56.51 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 492 |
| bwp | BW Black Star Promos | 41.4 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 490 |
| swsh45sv | Shining Fates Shiny Vault | 18.5 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 488 |
| sma | Hidden Fates Shiny Vault | 41.8 | unsupported_by_current_index, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 470 |
| sv02 |  | 66.1 | name_mismatch_needs_review, unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 459 |
| bw7 | Boundaries Crossed | 56.72 | unsupported_by_current_index, candidate_unconfirmed, api_agreed_not_master_truth, no_master_verified_coverage | 459 |
| sv8pt5 | Prismatic Evolutions | 59.73 | unsupported_by_current_index, api_agreed_not_master_truth, missing_from_grookai_not_insertion_authority, no_master_verified_coverage | 448 |

## 7. Controlled Set Repair Candidates

| set | name | priority_score | recommendation | readiness | expected_repair_safety |
| --- | --- | --- | --- | --- | --- |
| sv04 |  | 63.4 | blocked | moderate_confidence | higher |
| sv04.5 |  | 63.4 | blocked | moderate_confidence | higher |
| sv06 |  | 63.4 | blocked | moderate_confidence | higher |
| sv08 |  | 63.4 | blocked | moderate_confidence | higher |
| swsh10.5 |  | 63.4 | blocked | moderate_confidence | higher |
| swsh3 | Darkness Ablaze | 63.4 | blocked | moderate_confidence | higher |
| swsh3.5 |  | 63.4 | blocked | moderate_confidence | higher |
| swsh4 | Vivid Voltage | 63.4 | blocked | moderate_confidence | higher |
| swsh5 | Battle Styles | 63.4 | blocked | moderate_confidence | higher |
| sv03.5 |  | 63.36 | source_acquisition_then_overgeneration_review | moderate_confidence | higher |
| sv07 |  | 63.32 | source_acquisition_first | moderate_confidence | higher |
| swsh1 | Sword & Shield | 63.31 | source_acquisition_first | moderate_confidence | higher |
| ex2 | Sandstorm | 63.28 | source_acquisition_first | moderate_confidence | higher |
| sv4pt5 | Paldean Fates | 63.12 | source_acquisition_first | moderate_confidence | higher |
| sv09 |  | 62.99 | source_acquisition_first | moderate_confidence | higher |
| base4 | Base Set 2 | 62.96 | source_acquisition_first | moderate_confidence | higher |
| sv03 |  | 62.93 | source_acquisition_then_overgeneration_review | moderate_confidence | higher |
| ecard1 | Expedition Base Set | 62.91 | source_acquisition_first | moderate_confidence | higher |
| swsh6 | Chilling Reign | 62.84 | source_acquisition_first | moderate_confidence | higher |
| swsh4.5 |  | 62.62 | source_acquisition_first | moderate_confidence | higher |
| sv10 | Destined Rivals | 62.6 | source_acquisition_then_overgeneration_review | moderate_confidence | higher |
| swsh2 | Rebel Clash | 62.45 | source_acquisition_first | moderate_confidence | higher |
| base6 | Legendary Collection | 62.15 | source_acquisition_first | moderate_confidence | higher |
| sv05 |  | 61.89 | source_acquisition_then_overgeneration_review | moderate_confidence | higher |
| swsh8 | Fusion Strike | 61.85 | source_acquisition_then_overgeneration_review | moderate_confidence | higher |
