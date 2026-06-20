# PKG-18 Stamped Completion Governance Plan V1

Audit-only rule and lane plan for completing the remaining stamped reconciliation work in the fewest safe bulk steps.

## Safety

- audit_only: true
- db_writes_performed: false
- durable_db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

| metric | value |
| --- | --- |
| remaining_queue_rows | 567 |
| governance_rules | 13 |
| bulk_lanes | 7 |
| deterministic_no_source_rows | 301 |
| source_required_rows | 263 |
| manual_conflict_rows | 3 |
| fingerprint_sha256 | `191a91b8ff55542fd8147c458df8387229cade0eaeb36bf897d321d5ff6dfa99` |

## Bulk Lanes

| order | lane | rows | write now | next artifact | top variants |
| --- | --- | --- | --- | --- | --- |
| 1 | lane_a_governance_suppression_no_write | 180 | false | PKG-18A generic-stamped suppression report; remove these from write queues until exact label evidence exists. | unknown=178, stamped=2 |
| 2 | lane_b_display_metadata_strategy_no_printing_write | 62 | false | PKG-18B Battle Academy display metadata contract; no card_printing writes. | battle_academy_deck_mark=62 |
| 3 | lane_c_base_parent_resolution | 59 | false | PKG-18C base parent canonical selection/readiness; split insert vs ambiguity readback. | unknown=18, prize_pack_stamp=12, professor_program_stamp=8, wotc_stamp=6, battle_academy_deck_mark=5, pikachu_jack_o_lantern_stamp=3, prerelease_stamp=3, e3_stamp=1, eb_games_stamp=1, pokemon_center_stamp=1 |
| 4 | lane_d_prize_pack_finish_mapping | 51 | false | PKG-18D Prize Pack finish label mapping adjudication; then bulk readiness if conflicts close. | prize_pack_stamp=51 |
| 5 | lane_e_variant_family_finish_acquisition | 194 | false | PKG-18E variant-family source acquisition in bulk; produce large guarded packages only for exact two-source rows. | league_stamp=83, prerelease_stamp=12, professor_program_stamp=12, regional_championships_stamp=10, league_cup_staff_stamp=8, staff_stamp=7, pikachu_jack_o_lantern_stamp=6, play_pok_mon_thank_you_stamp=5, dragon_vault_stamp=4, player_rewards_crosshatch_stamp=4 |
| 6 | lane_f_second_source_acquisition | 18 | false | PKG-18F second-source acquisition for existing single-source rows. | regional_championships_staff_stamp=5, city_championships_staff_stamp=3, national_championships_staff_stamp=2, states_championships_staff_stamp=2, eb_games_stamp=1, europe_championships_staff_stamp=1, league_staff_stamp=1, national_championships_stamp=1, regional_championships_stamp=1, staff_prerelease_stamp=1 |
| 7 | lane_g_conflict_adjudication | 3 | false | PKG-18G manual conflict adjudication report; no writes until resolved. | gamestop_stamp=1, regional_championships_staff_stamp=1, regional_championships_stamp=1 |

## Governance Rules

| rule | rows | determinism | reduce without source | write effect | description |
| --- | --- | --- | --- | --- | --- |
| generic_stamped_suppression_rule | 180 | deterministic_blocking_rule | true | none | Generic stamped claims are not canonical identity. They remain blocked until exact stamp label is known. |
| league_crosshatch_finish_alias_rule | 96 | bounded_alias_rule | false | can_unlock_bulk_readiness_when exact sources exist | For League/Player Rewards contexts, Crosshatch Holo is a governed source label that may map to the active reverse lane only when exact set/card/stamp evidence exists. |
| battle_academy_display_metadata_rule | 62 | deterministic_display_metadata_rule | true | defer_card_printing_writes | Battle Academy deck marks are display/deck metadata unless exact separate physical printing evidence proves otherwise. Never create child finish_key=stamped. |
| prize_pack_finish_label_mapping_rule | 51 | needs_governed_mapping | false | blocked_until_standard_set_vs_foil_mapping | Prize Pack source labels must map Standard Set, Standard Set Foil, H, and Reverse Holo to active finishes at card level before promotion. |
| base_parent_required_before_stamped_identity_rule | 45 | deterministic_ordering_rule | true | requires_base_parent_package_first | Stamped identity may only attach to an existing canonical unstamped base parent. |
| event_staff_stamp_hierarchy_rule | 36 | variant_normalization_rule | false | can_unlock_bulk_identity_after second source | Event and staff stamps normalize into controlled hierarchy: event stamp, staff event stamp, league staff stamp, finalist placement. |
| small_custom_stamp_source_rule | 32 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |
| second_source_rule_preserved | 18 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |
| canonical_base_parent_selection_rule | 14 | deterministic_resolution_rule_after_readback | true | readiness_or_dependency_transfer_only | When multiple base parents exist, select the canonical unstamped base parent by set, number, name, empty variant, active identity, and matching base finish lane. |
| prerelease_stamp_identity_rule | 12 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |
| professor_program_stamp_identity_rule | 12 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |
| halloween_stamp_display_identity_rule | 6 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |
| manual_conflict_adjudication_rule | 3 | source_required_rule | false | no_write_without_exact_sources | Keep source-law requirements active; use rule only for classification and package routing. |

## Least-Step Completion Path

1. Adopt PKG-18A/18B suppression and display metadata rules to remove non-printing-truth rows from write queues.
2. Run PKG-18C base-parent readiness once for all parent blockers.
3. Run PKG-18D Prize Pack adjudication once; only exact mapped rows move forward.
4. Run PKG-18E/18F bulk source acquisition across all variant families, then create large guarded dry-run buckets from exact two-source rows.
5. Leave PKG-18G conflicts blocked until manual adjudication.

## Hard Rules

- No child `finish_key=stamped`.
- No generic stamped identity writes.
- No family-wide finish inference without exact evidence.
- No real apply is authorized by this plan.
