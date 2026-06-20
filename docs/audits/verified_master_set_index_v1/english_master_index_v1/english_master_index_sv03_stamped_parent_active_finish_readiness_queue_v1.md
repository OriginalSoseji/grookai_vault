# English Master Index SV03 Stamped Parent Active Finish Readiness Queue V1

Generated: 2026-06-20T04:59:00.701Z

Audit-only readiness queue. No database writes, migrations, cleanup, quarantine, insertion, deletion, or canonical mutation were performed.

## Summary

| metric | value |
| --- | --- |
| target_rows | 23 |
| review_ready_rows | 10 |
| blocked_rows | 13 |
| conflict_rows | 1 |
| write_ready_now | 0 |
| fingerprint_sha256 | `c1ceb0441c1c0e19136f1ae4b51fe068964f9acdd2ccddf518f5cb6672f59eca` |

## Status Counts

| status | rows |
| --- | --- |
| blocked_active_finish_not_proven | 12 |
| review_ready_product_family_only | 7 |
| review_ready_same_row_source_only | 2 |
| blocked_conflicting_active_finish_candidates | 1 |
| review_ready_multi_lane_active_finish | 1 |

## Rows

| number | card | readiness | variant_keys | finish | blockers |
| --- | --- | --- | --- | --- | --- |
| 22 | Toedscruel ex | review_ready_product_family_only | play_pokemon_stamp | holo |  |
| 22 | Toedscruel ex | blocked_active_finish_not_proven | pokemon_tcg_gym_present_pack_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 40 | Larvesta | blocked_active_finish_not_proven | battle_academy_deck_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 41 | Volcarona | blocked_active_finish_not_proven | battle_academy_deck_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 42 | Eiscue ex | review_ready_product_family_only | snowflake_symbol | holo |  |
| 66 | Tyranitar ex | review_ready_product_family_only | play_pokemon_stamp | holo |  |
| 92 | Lunatone | blocked_active_finish_not_proven | play_pokemon_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 95 | Claydol | blocked_active_finish_not_proven | play_pokemon_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 125 | Charizard ex | review_ready_product_family_only | play_pokemon_stamp | holo |  |
| 131 | Houndour | review_ready_product_family_only | pikachu_jack_o_lantern_stamp | normal |  |
| 133 | Houndoom | review_ready_product_family_only | pikachu_jack_o_lantern_stamp | normal |  |
| 136 | Darkrai | blocked_conflicting_active_finish_candidates | pikachu_jack_o_lantern_stamp | cosmos, holo | conflicting_active_finish_candidates:cosmos,holo |
| 139 | Salandit | blocked_active_finish_not_proven | battle_academy_deck_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 140 | Salazzle | blocked_active_finish_not_proven | battle_academy_deck_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 141 | Scizor | blocked_active_finish_not_proven | pokemon_tcg_gym_present_pack_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 164 | Pidgeot ex | blocked_active_finish_not_proven | great_ball_league_promo |  | no_active_finish_evidence, no_proposed_active_finish |
| 164 | Pidgeot ex | review_ready_product_family_only | play_pokemon_stamp | holo |  |
| 164 | Pidgeot ex | blocked_active_finish_not_proven | pokemon_tcg_gym_present_pack_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 188 | Geeta | review_ready_same_row_source_only | regionals_2023_promo | reverse |  |
| 188 | Geeta | review_ready_same_row_source_only | regionals_2023_staff_promo | reverse |  |
| 189 | Letter of Encouragement | blocked_active_finish_not_proven | play_pokemon_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 189 | Letter of Encouragement | blocked_active_finish_not_proven | pokemon_tcg_gym_present_pack_stamp |  | no_active_finish_evidence, no_proposed_active_finish |
| 196 | Town Store | review_ready_multi_lane_active_finish | play_pokemon_stamp | cosmos |  |

## Rule

Rows in this queue are not apply authority. A DB package still requires fresh DB snapshot, collision checks, guarded rollback-only dry-run, SQL hash, dry-run proof, and explicit approval. Rows with conflicting active finish candidates, jumbo-only identity, generic stamped identity, or product-family-only evidence remain blocked from write execution.
