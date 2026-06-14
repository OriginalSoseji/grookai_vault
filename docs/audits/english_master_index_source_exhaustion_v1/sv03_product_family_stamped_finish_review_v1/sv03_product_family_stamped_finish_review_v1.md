# SV03 Product-Family Stamped Finish Review V1

Generated: 2026-06-12T16:59:32.251Z

Audit-only review of remaining SV03 stamped product-family evidence. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Summary

| metric | value |
| --- | --- |
| target_rows | 16 |
| review_candidate_rows | 9 |
| blocked_rows | 7 |
| by_status | {"review_candidate_found":9,"blocked_no_product_family_active_finish_closure":7} |
| by_observation_status | {"blocked_battle_academy_identity_only_no_active_finish":4,"blocked_ex_regular_foil_pattern_requires_active_finish_mapping":4,"review_candidate_holo_from_ex_regular_holographic_card_page":4,"blocked_standard_set_no_foil_finish_claim":3,"review_candidate_normal_from_trick_or_trade_non_holo_rarity":2,"review_candidate_cosmos_from_prize_pack_rule":1,"review_candidate_holo_from_holiday_regular_holographic_card_page":1,"review_candidate_holo_from_trick_or_trade_holo_rarity":1} |
| fingerprint_sha256 | `f6165b7c6e97100a3e92b42f037cffe18a1a1de356bcf6e37fa94f7bded32ab9` |

## Results

| number | card | status | proposed_finish | observations |
| --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | review_candidate_found | holo | play_pokemon_prize_pack:blocked_ex_regular_foil_pattern_requires_active_finish_mapping; bulbapedia_ex_regular_card_page:review_candidate_holo_from_ex_regular_holographic_card_page |
| 40 | Larvesta | blocked_no_product_family_active_finish_closure |  | battle_academy_2024:blocked_battle_academy_identity_only_no_active_finish |
| 41 | Volcarona | blocked_no_product_family_active_finish_closure |  | battle_academy_2024:blocked_battle_academy_identity_only_no_active_finish |
| 42 | Eiscue ex | review_candidate_found | holo | holiday_calendar_2024:review_candidate_holo_from_holiday_regular_holographic_card_page |
| 66 | Tyranitar ex | review_candidate_found | holo | play_pokemon_prize_pack:blocked_ex_regular_foil_pattern_requires_active_finish_mapping; bulbapedia_ex_regular_card_page:review_candidate_holo_from_ex_regular_holographic_card_page |
| 92 | Lunatone | blocked_no_product_family_active_finish_closure |  | play_pokemon_prize_pack:blocked_standard_set_no_foil_finish_claim |
| 95 | Claydol | blocked_no_product_family_active_finish_closure |  | play_pokemon_prize_pack:blocked_standard_set_no_foil_finish_claim |
| 125 | Charizard ex | review_candidate_found | holo | play_pokemon_prize_pack:blocked_ex_regular_foil_pattern_requires_active_finish_mapping; bulbapedia_ex_regular_card_page:review_candidate_holo_from_ex_regular_holographic_card_page |
| 131 | Houndour | review_candidate_found | normal | trick_or_trade_2024:review_candidate_normal_from_trick_or_trade_non_holo_rarity |
| 133 | Houndoom | review_candidate_found | normal | trick_or_trade_2024:review_candidate_normal_from_trick_or_trade_non_holo_rarity |
| 136 | Darkrai | review_candidate_found | holo | trick_or_trade_2024:review_candidate_holo_from_trick_or_trade_holo_rarity |
| 139 | Salandit | blocked_no_product_family_active_finish_closure |  | battle_academy_2024:blocked_battle_academy_identity_only_no_active_finish |
| 140 | Salazzle | blocked_no_product_family_active_finish_closure |  | battle_academy_2024:blocked_battle_academy_identity_only_no_active_finish |
| 164 | Pidgeot ex | review_candidate_found | holo | play_pokemon_prize_pack:blocked_ex_regular_foil_pattern_requires_active_finish_mapping; bulbapedia_ex_regular_card_page:review_candidate_holo_from_ex_regular_holographic_card_page |
| 189 | Letter of Encouragement | blocked_no_product_family_active_finish_closure |  | play_pokemon_prize_pack:blocked_standard_set_no_foil_finish_claim |
| 196 | Town Store | review_candidate_found | cosmos | play_pokemon_prize_pack:review_candidate_cosmos_from_prize_pack_rule |

## Safety

Review candidates are not write authority. They require a separate fixture or readiness package, guarded dry-run, rollback proof, and explicit approval before any DB mutation.
