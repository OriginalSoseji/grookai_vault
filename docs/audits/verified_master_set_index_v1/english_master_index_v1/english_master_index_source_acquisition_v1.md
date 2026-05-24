# English Master Index Source Acquisition V1

Generated: 2026-05-24T14:39:57.131Z

This report creates source-acquisition queues only. It does not promote any fact to master truth and does not authorize insert, update, delete, quarantine, cleanup, or apply.

No DB writes, migrations, cleanup, quarantine, apply, insert, update, or delete operations were performed.

## Safety Confirmation

| check | value |
| --- | --- |
| report_only_generator | scripts/audits/verified_master_set_index_v1_build_source_acquisition.mjs |
| db_writes_performed | false |
| migrations_created | false |
| cleanup_performed | false |
| quarantine_performed | false |
| apply_runners_imported | false |
| maintenance_mutation_code_touched | false |

## Queue Summary

| lane | rows | sets | categories |
| --- | --- | --- | --- |
| reverse_holo | 10238 | 107 | reverse_holo_overgeneration_candidate:1252, api_agreed_missing_needs_human_source:420, reverse_holo_single_source:4654, api_agreed_reverse_holo_needs_human_source:3912 |
| holo | 8846 | 104 | holo_overgeneration_candidate:3847, api_agreed_missing_needs_human_source:420, holo_single_source:1972, api_agreed_holo_needs_human_source:2607 |
| legacy | 8160 | 42 | first_edition_policy_gap:1091, legacy_or_old_era_single_source:1702, api_agreed_legacy_or_old_era_needs_human_source:5367 |
| alias_resolution | 6727 | 17 | legacy_orphan:16, missing_set_code:5733, source_coverage_or_alias_gap:110, subset_or_numbering_alias_review:868 |
| promo | 4652 | 7 | promo_family_source_coverage_gap:2680, promo_family_source_only_candidate:1523, promo_family_single_source:395, api_agreed_promo_family_needs_human_source:54 |
| subset | 3512 | 16 | subset_or_numbering_alias_review:868, subset_alias_or_numbering_gap:590, subset_alias_single_source:615, api_agreed_subset_alias_needs_human_source:1439 |
| parallel | 691 | 3 | modern_parallel_exact_finish_needs_source:167, modern_parallel_set_review:524 |

## Category Summary

| category | rows | work_type | lanes | mutation_warning |
| --- | --- | --- | --- | --- |
| api_agreed_normal_needs_human_source | 7586 | human_checklist_evidence | not_queued_to_requested_lanes | not master truth |
| missing_set_code | 5733 | alias_governance | alias_resolution | not mutation authority |
| out_of_scope_pocket | 5427 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| api_agreed_legacy_or_old_era_needs_human_source | 5367 | human_checklist_evidence | legacy | not master truth |
| reverse_holo_single_source | 4654 | second_source_evidence | reverse_holo | not truth |
| api_agreed_reverse_holo_needs_human_source | 3912 | human_checklist_evidence | reverse_holo | not master truth |
| holo_overgeneration_candidate | 3847 | finish_disproof_or_overgeneration_review | holo | not deletion authority |
| promo_family_source_coverage_gap | 2680 | source_acquisition | promo | not mutation authority |
| api_agreed_holo_needs_human_source | 2607 | human_checklist_evidence | holo | not master truth |
| source_only_candidate_missing | 2382 | second_source_evidence | not_queued_to_requested_lanes | not insertion authority |
| holo_single_source | 1972 | second_source_evidence | holo | not truth |
| normal_single_source | 1739 | second_source_evidence | not_queued_to_requested_lanes | not truth |
| legacy_or_old_era_single_source | 1702 | second_source_evidence | legacy | not truth |
| promo_family_source_only_candidate | 1523 | second_source_evidence | promo | not truth |
| api_agreed_subset_alias_needs_human_source | 1439 | alias_governance | subset | not mutation authority |
| reverse_holo_overgeneration_candidate | 1252 | finish_disproof_or_overgeneration_review | reverse_holo | not deletion authority |
| first_edition_policy_gap | 1091 | legacy_policy_evidence | legacy | not mutation authority |
| product_or_deck_set_source_coverage_gap | 1027 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_or_numbering_alias_review | 868 | alias_governance | alias_resolution, subset | not mutation authority |
| subset_alias_single_source | 615 | alias_governance | subset | not mutation authority |
| subset_alias_or_numbering_gap | 590 | alias_governance | subset | not mutation authority |
| product_or_deck_set_single_source | 529 | second_source_evidence | not_queued_to_requested_lanes | not truth |
| modern_parallel_set_review | 524 | source_acquisition | parallel | not mutation authority |
| api_agreed_missing_needs_human_source | 420 | human_checklist_evidence | holo, reverse_holo | not insertion authority |
| promo_family_single_source | 395 | second_source_evidence | promo | not truth |
| api_agreed_product_or_deck_needs_human_source | 214 | human_checklist_evidence | not_queued_to_requested_lanes | not master truth |
| modern_parallel_exact_finish_needs_source | 167 | source_acquisition | parallel | not mutation authority |
| source_coverage_or_alias_gap | 110 | alias_governance | alias_resolution | not mutation authority |
| product_or_deck_set_source_only_candidate | 74 | second_source_evidence | not_queued_to_requested_lanes | not truth |
| subset_number_collision_generations_radiant_collection | 66 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| api_agreed_promo_family_needs_human_source | 54 | human_checklist_evidence | promo | not master truth |
| subset_number_collision_crown_zenith_galarian_gallery | 25 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| basic_energy_prefix_style | 16 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| legacy_orphan | 16 | alias_governance | alias_resolution | not mutation authority |
| subset_number_collision_call_of_legends_shiny | 15 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| lvx_suffix_style | 14 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| normal_variant_not_in_index_review | 13 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_legendary_treasures_radiant_collection | 11 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| diacritic_punctuation_only | 9 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| parenthetical_qualifier | 9 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_arceus_ar_subset | 9 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_celebrations_classic_collection | 8 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_rising_rivals_rotom | 7 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_dp_secret_shiny | 4 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_platinum_secret_shiny | 2 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| invalid_or_unknown_card_number_review | 1 | finish_disproof_or_overgeneration_review | not_queued_to_requested_lanes | not deletion authority |
| subset_number_collision_supreme_victors_secret_shiny | 1 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |

## Top Set Work

| lane | set | name | rows | readiness | score |
| --- | --- | --- | --- | --- | --- |
| alias_resolution | unknown |  | 5733 | blocked | 22 |
| promo | smp | SM Black Star Promos | 1194 | blocked | 41.67 |
| promo | xyp | XY Black Star Promos | 1045 | blocked | 41.62 |
| promo | swshp | SWSH Black Star Promos | 794 | blocked | 43.05 |
| promo | svp | Scarlet & Violet Black Star Promos | 614 | blocked | 56.14 |
| subset | swsh45sv | Shining Fates Shiny Vault | 488 | blocked | 18.5 |
| promo | bwp | BW Black Star Promos | 477 | blocked | 41.4 |
| promo | sma | Hidden Fates Shiny Vault | 470 | blocked | 41.8 |
| subset | pl3 | Supreme Victors | 414 | blocked | 44.83 |
| subset | bw11 | Legendary Treasures | 391 | blocked | 39.16 |
| alias_resolution | swsh45sv | Shining Fates Shiny Vault | 366 | blocked | 18.5 |
| legacy | ecard1 | Expedition Base Set | 330 | moderate_confidence | 72.31 |
| subset | g1 | Generations | 322 | blocked | 36.7 |
| subset | swsh12.5 |  | 317 | blocked | 48.65 |
| legacy | ecard2 | Aquapolis | 316 | moderate_confidence | 67.04 |
| legacy | ecard3 | Skyridge | 313 | moderate_confidence | 68.13 |
| subset | col1 | Call of Legends | 298 | blocked | 39.65 |
| legacy | dp6 | Legends Awakened | 294 | moderate_confidence | 71.48 |
| legacy | gym2 | Gym Challenge | 284 | source_limited | 59.07 |
| legacy | gym1 | Gym Heroes | 283 | source_limited | 59.08 |
| reverse_holo | sm12 | Cosmic Eclipse | 271 | blocked | 55.96 |
| holo | sm12 | Cosmic Eclipse | 271 | blocked | 55.96 |
| legacy | dp3 | Secret Wonders | 266 | blocked | 71.99 |
| parallel | sv10.5w |  | 263 | blocked | 55.15 |
| subset | pl2 | Rising Rivals | 262 | blocked | 47.27 |
| parallel | sv10.5b |  | 261 | blocked | 55.08 |
| legacy | dp1 | Diamond & Pearl | 259 | blocked | 70.76 |
| subset | pl1 | Platinum | 258 | blocked | 51.72 |
| reverse_holo | sm11 | Unified Minds | 258 | blocked | 56.16 |
| holo | sm11 | Unified Minds | 258 | blocked | 56.16 |
| legacy | dp2 | Mysterious Treasures | 244 | blocked | 70.91 |
| legacy | neo1 | Neo Genesis | 241 | source_limited | 59.03 |
| reverse_holo | sm8 | Lost Thunder | 236 | blocked | 56.11 |
| holo | sm8 | Lost Thunder | 236 | blocked | 56.11 |
| reverse_holo | sm10 | Unbroken Bonds | 234 | blocked | 56.2 |
| holo | sm10 | Unbroken Bonds | 234 | blocked | 56.2 |
| reverse_holo | swsh8 | Fusion Strike | 230 | moderate_confidence | 71.21 |
| subset | dp7 | Stormfront | 208 | blocked | 51.06 |
| reverse_holo | sm9 | Team Up | 196 | blocked | 56.12 |
| holo | sm9 | Team Up | 196 | blocked | 56.12 |
| subset | pl4 | Arceus | 195 | blocked | 51.13 |
| reverse_holo | sm7 | Celestial Storm | 183 | blocked | 56.21 |
| holo | sm7 | Celestial Storm | 183 | blocked | 56.21 |
| holo | sv4pt5 | Paldean Fates | 180 | moderate_confidence | 72.37 |
| reverse_holo | sv02 |  | 176 | blocked | 66.1 |
| reverse_holo | sv03 |  | 176 | moderate_confidence | 72.19 |
| reverse_holo | sm5 | Ultra Prism | 173 | blocked | 55.97 |
| holo | sm5 | Ultra Prism | 173 | blocked | 55.97 |
| holo | sm1 | Sun & Moon | 172 | blocked | 55.59 |
| holo | sm2 | Guardians Rising | 169 | blocked | 55.94 |
| parallel | sv8pt5 | Prismatic Evolutions | 167 | blocked | 59.73 |
| alias_resolution | g1 | Generations | 109 | blocked | 36.7 |
| alias_resolution | bw11 | Legendary Treasures | 85 | blocked | 39.16 |
| alias_resolution | col1 | Call of Legends | 74 | blocked | 39.65 |
| promo | basep | Wizards Black Star Promos | 58 | moderate_confidence | 70.24 |
| alias_resolution | dpp | DP Black Star Promos | 58 | blocked | 45.55 |
| alias_resolution | swsh12tg | Silver Tempest Trainer Gallery | 47 | blocked | 21.57 |
| alias_resolution | swsh9tg | Brilliant Stars Trainer Gallery | 46 | blocked | 21.68 |
| alias_resolution | swsh12.5 |  | 45 | blocked | 48.65 |
| alias_resolution | cel25 | Celebrations | 36 | blocked | 39.52 |

## Recommended Source Lanes

| lane | recommended_sources |
| --- | --- |
| reverse_holo | Official Pokemon card gallery or downloadable checklist when available; Bulbapedia set checklist with reverse-holo notes; TCGplayer or comparable checklist-style marketplace references; Collector checklist references with exact card-number finish labels |
| holo | Official Pokemon card gallery or downloadable checklist when available; Bulbapedia set checklist with rarity and holo treatment notes; TCGplayer or comparable checklist-style marketplace references; Collector checklist references with exact card-number finish labels |
| parallel | Official product or expansion parallel description; Checklist source with exact card-number parallel coverage; Marketplace checklist with parallel-specific listings; Manual review fixture only when the source URL and evidence label are retained |
| promo | Official promo gallery or product page; Bulbapedia promo-family checklist; Marketplace checklist for sealed/product-exclusive printings; Collector checklist references with promo number and finish label |
| subset | Official checklist showing subset numbering; Bulbapedia subset page or set section; Marketplace checklist with subset-specific numbering; Alias governance review for TG/GG/Shiny Vault/Classic Collection-style families |
| legacy | Official archived checklist when available; Bulbapedia set page with first edition/unlimited and reverse-holo notes; Marketplace checklist with exact legacy finish distinctions; Collector checklist references for first edition, shadowless, stamped, and e-Card-era variants |
| alias_resolution | Source set ID mapping between Grookai set_code and upstream set IDs; Official set names and product-family names; Bulbapedia set-family and subset pages; Manual alias fixture with source URL, evidence label, and non-destructive notes |

## Non-Authority Rules

- `unsupported_by_current_index` is not deletion authority.
- `missing_from_grookai` is not insertion authority.
- `candidate_unconfirmed` is not truth.
- `api_agreed` is not master truth.
- Queue priority is not repair approval.
