# PKG-40A Residual Unsupported Source Adjudication V1

Audit-only classification of the current residual unsupported rows after PKG-39A.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- real_apply_performed: false

## Summary

| metric | value |
| --- | --- |
| package_id | PKG-40A-RESIDUAL-UNSUPPORTED-SOURCE-ADJUDICATION |
| fingerprint_sha256 | c65d52df10351b16dc340c3fbd4c884daf10d1d47325ded5b849cee2c9fb8cd7 |
| input_unsupported_rows | 19 |
| adjudicated_rows | 19 |
| unmatched_rows | 0 |
| source_evidence_rows | 38 |

## Status Buckets

| status | count |
| --- | --- |
| stamped_active_finish_route_and_identity_backfill_ready | 8 |
| delete_candidate_no_reverse_evidence_after_holo_suffix_verified | 1 |
| delete_candidate_no_reverse_evidence_holo_normal_preserved | 1 |
| active_finish_conflict_replace_with_reverse_review_ready | 1 |
| active_finish_conflict_replace_with_holo_review_ready | 1 |
| master_index_delta_and_identity_backfill_ready | 1 |
| stamped_active_finish_route_ready | 1 |
| stamped_active_finish_route_and_identity_backfill_needs_finish_confirmation | 1 |
| master_index_delta_needs_finish_confirmation | 1 |
| master_index_delta_needs_second_exact_source | 1 |
| delete_candidate_suffix_normalization_duplicate | 1 |
| delete_candidate_no_reverse_evidence_suffix_normalization_duplicate | 1 |

## Recommended Next Packages

| next package | count |
| --- | --- |
| PKG-40B stamped route evidence + parent identity backfill dry-run | 8 |
| PKG-40E dependency-zero child delete dry-run | 4 |
| PKG-40C reverse stamped replacement dry-run after route proof | 1 |
| PKG-40C holo stamped replacement dry-run after Master Index delta | 1 |
| PKG-40D Battle Academy Master Index delta + identity backfill dry-run | 1 |
| PKG-40B stamped route evidence dry-run | 1 |
| manual finish confirmation before dry-run | 2 |
| source acquisition before dry-run | 1 |

## Rows

| set | number | card | current_finish | variant | status | next package |
| --- | --- | --- | --- | --- | --- | --- |
| col1 | 33 | Snorlax | holo | staff_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| g1 | 14 | Ponyta | holo | stamped | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| g1 | 28 | Jolteon-EX | reverse | a | delete_candidate_no_reverse_evidence_after_holo_suffix_verified | PKG-40E dependency-zero child delete dry-run |
| np | 25 | Flygon | holo | winner_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| np | 35 | Pikachu δ | reverse |  | delete_candidate_no_reverse_evidence_holo_normal_preserved | PKG-40E dependency-zero child delete dry-run |
| pl1 | 112 | PlusPower | holo | player_rewards_crosshatch_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| pl2 | 102 | Upper Energy | holo | player_rewards_crosshatch_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| pl2 | 33 | Snorlax | holo | league_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| pl2 | 92 | Lucian's Assignment | holo | player_rewards_crosshatch_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| pl2 | 97 | Underground Expedition | holo | player_rewards_crosshatch_stamp | stamped_active_finish_route_and_identity_backfill_ready | PKG-40B stamped route evidence + parent identity backfill dry-run |
| pl3 | 106 | Gible | holo | staff_stamp | active_finish_conflict_replace_with_reverse_review_ready | PKG-40C reverse stamped replacement dry-run after route proof |
| smp | 198 | Bulbasaur | normal | pikachu_stamp | active_finish_conflict_replace_with_holo_review_ready | PKG-40C holo stamped replacement dry-run after Master Index delta |
| smp | 65 | Alolan Raichu | normal | battle_academy_deck_mark | master_index_delta_and_identity_backfill_ready | PKG-40D Battle Academy Master Index delta + identity backfill dry-run |
| sv03 | 196 | Town Store | cosmos | play_pokemon_stamp | stamped_active_finish_route_ready | PKG-40B stamped route evidence dry-run |
| svp | 224 | Paradise Resort | normal | world_championships_2025_staff_stamp | stamped_active_finish_route_and_identity_backfill_needs_finish_confirmation | manual finish confirmation before dry-run |
| svp | 224 | Paradise Resort | normal |  | master_index_delta_needs_finish_confirmation | manual finish confirmation before dry-run |
| svp | 500 | Terapagos & Friends | normal |  | master_index_delta_needs_second_exact_source | source acquisition before dry-run |
| xyp | 177 | Karen | holo | XY | delete_candidate_suffix_normalization_duplicate | PKG-40E dependency-zero child delete dry-run |
| xyp | 177 | Karen | reverse | XY | delete_candidate_no_reverse_evidence_suffix_normalization_duplicate | PKG-40E dependency-zero child delete dry-run |

## Guardrail

This report is not a delete/apply authority by itself. Rows marked ready still require a dedicated dry-run package, dependency proof, fingerprint, and explicit real-apply approval before any DB write.
