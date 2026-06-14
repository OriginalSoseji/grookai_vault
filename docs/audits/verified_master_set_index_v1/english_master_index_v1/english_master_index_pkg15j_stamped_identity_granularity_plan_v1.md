# PKG-15J Stamped Identity Granularity Plan V1

Audit-only control plan for the remaining stamped Master Index reconciliation lane. This report intentionally separates parent identity, active child finish, and source exhaustion.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- stamped_blocker_rows: 588
- active_finish_routing_required_rows: 331
- single_base_finish_write_candidates: 0
- same_finish_ambiguous_rows: 21
- exact_routable_rows: 0
- finish_multi_source_review_ready_rows: 0
- finish_multi_source_applied_rows: 17
- fingerprint_sha256: `c721da56359c901e64005606c470838f11b79044d407ce26fbb79482392137a0`

## Buckets

| bucket | rows | write_ready_now | next_action |
| --- | --- | --- | --- |
| active_finish_required | 327 | 0 | Acquire exact active finish evidence or build a source-specific adjudication rule. |
| stamp_identity_label_needed | 187 | 0 | Acquire exact stamp identity label; generic stamped evidence is not enough. |
| base_parent_missing | 45 | 0 | Resolve missing base parent first; do not create stamped child of a missing base identity. |
| base_parent_ambiguous | 14 | 0 | Resolve same-number parent ambiguity first. |
| existing_stamped_parent_collision_review | 11 | 0 | Compare existing stamped parent against Master Index evidence before inserting or merging anything. |
| active_finish_required_with_dependency_awareness | 4 | 0 | Resolve active finish first; any later write must include dependency-aware guard checks. |

## Remaining Source Families

| source_family | rows |
| --- | --- |
| other_specific_stamp_finish | 245 |
| battle_academy_decklist_finish | 58 |
| staff_prerelease_product_finish | 19 |
| elitefourum_event_stamp_finish | 13 |
| league_play_pokemon_finish | 4 |

## Identity Expansion Candidates

| expansion_status | rows |
| --- | --- |
| candidate_missing_more_specific_identity_single_source | 11 |
| candidate_missing_more_specific_identity_multi_source_finish_single_source | 8 |
| current_master_identity_multi_source_finish_multi_source_review_ready | 8 |
| current_master_identity_multi_source_finish_single_source | 6 |
| candidate_missing_more_specific_identity_multi_source_finish_multi_source_review_ready | 3 |
| current_master_identity_single_source_finish_supported | 2 |

## Same-Finish Ambiguous Rows

| set | number | name | variant | finish | recommendation |
| --- | --- | --- | --- | --- | --- |
| bw3 | 80 | Escavalier | national_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| bw5 | 25 | Vaporeon | championship_staff_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| bw5 | 37 | Jolteon | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| bw5 | 84 | Eevee | city_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| dp1 | 52 | Luxio | staff_stamp | normal | Potentially routable only if Grookai governance intentionally treats Staff Prerelease and Staff States Championship labels as one generic staff-stamp parent. |
| dp1 | 98 | Shinx | city_championships_stamp | normal | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| me02 | 26 | Suicune | eb_games_stamp | holo | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm1 | 128 | Professor Kukui | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm1 | 135 | Ultra Ball | championship_staff_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm4 | 95 | Gladion | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm5 | 119 | Cynthia | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm6 | 102 | Beast Ring | league_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| sm6 | 105 | Diantha | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| swsh10 | 150 | Roxanne | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| swsh6 | 23 | Larvesta | battle_academy_deck_mark | normal | Routable: individual Battle Academy deck numbers are display metadata for this parent identity because every exact source product supports the same Non-Holo active finish. |
| swsh6 | 24 | Volcarona | battle_academy_deck_mark | normal | Routable: individual Battle Academy deck numbers are display metadata for this parent identity because every exact source product supports the same Non-Holo active finish. |
| xy1 | 83 | Honedge | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| xy1 | 84 | Doublade | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| xy1 | 85 | Aegislash | regional_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| xy10 | 94 | Chaos Tower | national_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |
| xy8 | 145 | Parallel City | city_championships_stamp | reverse | Do not write. Resolve whether source variant labels require distinct parent identities before routing the active finish. |

## Governance Rule

Stamped is a parent identity modifier, not an active child finish. No row can write until both are true:

1. The stamped parent identity is explicit enough for a stable `variant_key`.
2. The active child finish is proven as `normal`, `holo`, `reverse`, `cosmos`, or another active finish key.

Rows with multiple source variant labels that share the same finish remain blocked until Grookai decides whether those labels collapse into one parent identity or split into separate parent identities.
