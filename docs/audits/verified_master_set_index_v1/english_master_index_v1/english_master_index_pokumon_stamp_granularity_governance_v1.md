# Pokumon Stamp Granularity Governance V1

Generated: 2026-06-21T19:29:47.613Z

Audit-only governance report. No DB writes, no migrations, no apply.

## Summary

| metric | value |
| --- | --- |
| blocked_rows_reviewed | 33 |
| placement_split_source_rows | 29 |
| proposed_placement_split_rows | 64 |
| future_readiness_after_contract_rows | 19 |
| base_finish_blocked_rows | 10 |
| existing_variant_parent_review_rows | 1 |
| fingerprint_sha256 | `e095fb476ad132945ac0d31a8901dc848cf9298a80e3d1e7fd0759a130bd1902` |

## Governance Rule

Pokemon League placement cards must not be modeled as one generic `league_stamp` identity when source evidence explicitly says First Place, Second Place, Third Place, or Fourth Place. Those are placement-specific printed identity modifiers unless a future contract intentionally suppresses the placement distinction.

## Status Counts

| status | count |
| --- | --- |
| placement_variant_split_ready_for_readiness_after_contract | 19 |
| placement_variant_split_blocked_by_base_finish | 10 |
| finish_evidence_base_parent_blocked | 3 |
| existing_variant_parent_review | 1 |

## Future Readiness After Contract

| set | number | card | source variant | finish | proposed variants |
| --- | --- | --- | --- | --- | --- |
| bw11 | 97 | Deino | league_stamp | reverse | third_place_league_stamp |
| bw5 | 4 | Scyther | league_stamp | reverse | second_place_league_stamp, fourth_place_league_stamp |
| bw7 | 38 | Delibird | league_stamp | reverse | first_place_league_stamp, fourth_place_league_stamp |
| sm1 | 20 | Tsareena | league_stamp | reverse | first_place_league_stamp, second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| sm2 | 55 | Oricorio | league_stamp | reverse | first_place_league_stamp, second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| sm3 | 41 | Raichu | league_stamp | cosmos | fourth_place_league_stamp |
| sm3 | 41 | Raichu | league_stamp | reverse | first_place_league_stamp |
| sm5 | 83 | Magnezone | league_stamp | reverse | second_place_league_stamp |
| sm7 | 24 | Magcargo | league_stamp | reverse | first_place_league_stamp, second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| sm8 | 82 | Zebstrika | league_stamp | reverse | first_place_league_stamp, second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| xy1 | 56 | Pumpkaboo | league_stamp | reverse | first_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| xy1 | 64 | Solrock | league_stamp | reverse | third_place_league_stamp, fourth_place_league_stamp |
| xy10 | 63 | Lucario | league_stamp | reverse | first_place_league_stamp, fourth_place_league_stamp |
| xy11 | 15 | Volcarona | league_stamp | reverse | second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| xy12 | 53 | Mew | league_stamp | reverse | fourth_place_league_stamp |
| xy3 | 8 | Shelmet | league_stamp | reverse | second_place_league_stamp, fourth_place_league_stamp |
| xy4 | 66 | Klefki | league_stamp | reverse | first_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| xy8 | 78 | Marowak | league_stamp | reverse | first_place_league_stamp, second_place_league_stamp, third_place_league_stamp, fourth_place_league_stamp |
| xy9 | 40 | Greninja | league_stamp | reverse | first_place_league_stamp, fourth_place_league_stamp |

## Blocked Sample

| set | number | card | finish | status | reason |
| --- | --- | --- | --- | --- | --- |
| bw11 | 97 | Deino | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| bw5 | 4 | Scyther | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| bw7 | 38 | Delibird | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| dp1 | 52 | Luxio | normal | existing_variant_parent_review | Do not write. Compare existing variant parent against source label and finish before any package is built. |
| sm5 | 83 | Magnezone | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| sm8 | 59 | Suicune | cosmos | finish_evidence_base_parent_blocked | Do not write. Exact variant evidence exists, but the target finish cannot be inherited safely from the base parent yet. |
| xy1 | 56 | Pumpkaboo | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy1 | 64 | Solrock | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy10 | 94 | Chaos Tower | cosmos | finish_evidence_base_parent_blocked | Do not write. Exact variant evidence exists, but the target finish cannot be inherited safely from the base parent yet. |
| xy11 | 15 | Volcarona | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy12 | 53 | Mew | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy3 | 8 | Shelmet | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy4 | 66 | Klefki | cosmos | placement_variant_split_blocked_by_base_finish | Do not write yet. Source implies placement-specific League variants, but the base parent lacks the target child finish needed for safe parent inheritance. |
| xy8 | 145 | Parallel City | cosmos | finish_evidence_base_parent_blocked | Do not write. Exact variant evidence exists, but the target finish cannot be inherited safely from the base parent yet. |
