# English Master Index Source Acquisition V1

Generated: 2026-06-08T18:49:11.873Z

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
| alias_resolution | 6851 | 21 | legacy_orphan:16, missing_set_code:5733, source_coverage_or_alias_gap:87, subset_or_numbering_alias_review:1015 |
| holo | 4274 | 67 | holo_overgeneration_candidate:4274 |
| promo | 2862 | 7 | promo_family_source_coverage_gap:2862 |
| reverse_holo | 1253 | 50 | reverse_holo_overgeneration_candidate:1253 |
| subset | 1015 | 13 | subset_or_numbering_alias_review:1015 |
| parallel | 694 | 3 | modern_parallel_exact_finish_needs_source:167, modern_parallel_set_review:527 |
| legacy | 0 | 0 |  |

## Category Summary

| category | rows | work_type | lanes | mutation_warning |
| --- | --- | --- | --- | --- |
| master_verified_missing | 7313 | source_acquisition | not_queued_to_requested_lanes | not insertion authority |
| missing_set_code | 5733 | alias_governance | alias_resolution | not mutation authority |
| out_of_scope_pocket | 5427 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| holo_overgeneration_candidate | 4274 | finish_disproof_or_overgeneration_review | holo | not deletion authority |
| promo_family_source_coverage_gap | 2862 | source_acquisition | promo | not mutation authority |
| reverse_holo_overgeneration_candidate | 1253 | finish_disproof_or_overgeneration_review | reverse_holo | not deletion authority |
| product_or_deck_set_source_coverage_gap | 1045 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_or_numbering_alias_review | 1015 | alias_governance | alias_resolution, subset | not mutation authority |
| normal_variant_not_in_index_review | 744 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| modern_parallel_set_review | 527 | source_acquisition | parallel | not mutation authority |
| modern_parallel_exact_finish_needs_source | 167 | source_acquisition | parallel | not mutation authority |
| source_coverage_or_alias_gap | 87 | alias_governance | alias_resolution | not mutation authority |
| subset_number_collision_generations_radiant_collection | 52 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_crown_zenith_galarian_gallery | 25 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| legacy_orphan | 16 | alias_governance | alias_resolution | not mutation authority |
| subset_number_collision_call_of_legends_shiny | 12 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_legendary_treasures_radiant_collection | 10 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_arceus_ar_subset | 9 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| parenthetical_qualifier | 8 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_rising_rivals_rotom | 7 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| lvx_suffix_style | 6 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| human_source_verified_missing | 4 | source_acquisition | not_queued_to_requested_lanes | not insertion authority |
| subset_number_collision_dp_secret_shiny | 4 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| diacritic_punctuation_only | 3 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| subset_number_collision_platinum_secret_shiny | 2 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |
| invalid_or_unknown_card_number_review | 1 | finish_disproof_or_overgeneration_review | not_queued_to_requested_lanes | not deletion authority |
| subset_number_collision_supreme_victors_secret_shiny | 1 | source_acquisition | not_queued_to_requested_lanes | not mutation authority |

## Top Set Work

| lane | set | name | rows | readiness | score |
| --- | --- | --- | --- | --- | --- |
| alias_resolution | unknown |  | 5733 | blocked | 22 |
| promo | smp | SM Black Star Promos | 736 | blocked | 39.61 |
| promo | xyp | XY Black Star Promos | 642 | blocked | 38.8 |
| promo | swshp | SWSH Black Star Promos | 505 | blocked | 42.11 |
| promo | svp | Scarlet & Violet Black Star Promos | 390 | blocked | 66.69 |
| subset | swsh45sv | Shining Fates Shiny Vault | 366 | blocked | 23.5 |
| alias_resolution | swsh45sv | Shining Fates Shiny Vault | 366 | blocked | 23.5 |
| promo | bwp | BW Black Star Promos | 303 | blocked | 39.35 |
| promo | sma | Hidden Fates Shiny Vault | 282 | blocked | 41.8 |
| parallel | sv10.5w | White Flare | 264 | blocked | 72.4 |
| parallel | sv10.5b | Black Bolt | 263 | blocked | 72.26 |
| holo | sm11 | Unified Minds | 174 | blocked | 81.77 |
| holo | sm12 | Cosmic Eclipse | 171 | blocked | 81.81 |
| parallel | sv8pt5 |  | 167 | blocked | 79.79 |
| holo | sm8 | Lost Thunder | 153 | blocked | 80.36 |
| holo | sm10 | Unbroken Bonds | 151 | blocked | 82.17 |
| subset | g1 | Generations | 143 | blocked | 62.66 |
| alias_resolution | g1 | Generations | 143 | blocked | 62.66 |
| holo | sm9 | Team Up | 123 | blocked | 81.63 |
| holo | xy8 | BREAKthrough | 122 | blocked | 79.79 |
| holo | sm1 | Sun & Moon | 119 | blocked | 79.2 |
| holo | sm7 | Celestial Storm | 119 | blocked | 81.03 |
| holo | xy1 | XY | 116 | blocked | 78.97 |
| holo | xy5 | Primal Clash | 114 | blocked | 80.58 |
| subset | bw11 | Legendary Treasures | 108 | blocked | 75.33 |
| alias_resolution | bw11 | Legendary Treasures | 108 | blocked | 75.33 |
| subset | col1 | Call of Legends | 90 | blocked | 73.59 |
| alias_resolution | col1 | Call of Legends | 90 | blocked | 73.59 |
| subset | pl3 | Supreme Victors | 86 | blocked | 71.08 |
| alias_resolution | pl3 | Supreme Victors | 86 | blocked | 71.08 |
| reverse_holo | sm12 | Cosmic Eclipse | 78 | blocked | 81.81 |
| reverse_holo | sm11 | Unified Minds | 62 | blocked | 81.77 |
| reverse_holo | sm8 | Lost Thunder | 62 | blocked | 80.36 |
| alias_resolution | dpp | DP Black Star Promos | 58 | blocked | 45.62 |
| reverse_holo | sm10 | Unbroken Bonds | 58 | blocked | 82.17 |
| reverse_holo | sm3 | Burning Shadows | 53 | blocked | 81.89 |
| reverse_holo | sm9 | Team Up | 53 | blocked | 81.63 |
| reverse_holo | sm2 | Guardians Rising | 51 | blocked | 81.46 |
| reverse_holo | sm5 | Ultra Prism | 48 | blocked | 80.49 |
| subset | swsh12tg | Silver Tempest Trainer Gallery | 47 | blocked | 29.36 |
| alias_resolution | swsh12tg | Silver Tempest Trainer Gallery | 47 | blocked | 29.36 |
| reverse_holo | sm1 | Sun & Moon | 46 | blocked | 79.2 |
| reverse_holo | sm7 | Celestial Storm | 46 | blocked | 81.03 |
| subset | swsh9tg | Brilliant Stars Trainer Gallery | 46 | blocked | 29.58 |
| alias_resolution | swsh9tg | Brilliant Stars Trainer Gallery | 46 | blocked | 29.58 |
| subset | swsh12.5 | Crown Zenith | 45 | blocked | 80.5 |
| alias_resolution | swsh12.5 | Crown Zenith | 45 | blocked | 80.5 |
| subset | swsh10tg | Astral Radiance Trainer Gallery | 30 | blocked | 34 |
| subset | swsh11tg | Lost Origin Trainer Gallery | 30 | blocked | 34 |
| promo | basep | Wizards Black Star Promos | 4 | high_confidence | 91.26 |

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
