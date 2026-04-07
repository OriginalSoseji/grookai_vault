# REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V2

## Context

This audit replaces the previous global snapshot after multiple execution waves completed across mixed collapse, family realignment, numeric promotion, alias collapse, and namespace migration work.

## Why V1 Is Stale

- `swsh9`, `swsh10`, `swsh11`, and `swsh12` changed materially
- MCD yearly alias lanes were collapsed
- `smp`, `ecard3`, and `col1` were reclassified and executed under new contracts
- `swsh4.5` lost its `SV###` family subset and now only retains numeric blockers

## Current Unresolved Set Inventory

| Set | Total | Numeric | Non-numeric |
| --- | ---: | ---: | ---: |
| sv08.5 | 180 | 180 | 0 |
| A3a | 103 | 103 | 0 |
| P-A | 100 | 100 | 0 |
| sm12 | 58 | 58 | 0 |
| xyp | 58 | 0 | 58 |
| sm10 | 56 | 56 | 0 |
| cel25 | 47 | 25 | 22 |
| sm2 | 43 | 43 | 0 |
| sm3 | 43 | 43 | 0 |
| sm8 | 41 | 41 | 0 |
| pl2 | 37 | 34 | 3 |
| sm7 | 35 | 35 | 0 |
| ecard2 | 34 | 17 | 17 |
| sm5 | 31 | 31 | 0 |
| g1 | 29 | 7 | 22 |
| exu | 27 | 0 | 27 |
| sm6 | 27 | 27 | 0 |
| xy7 | 26 | 25 | 1 |
| bw11 | 25 | 5 | 20 |
| hgssp | 25 | 0 | 25 |
| sm4 | 25 | 24 | 1 |
| xy10 | 25 | 23 | 2 |
| xy9 | 21 | 21 | 0 |
| pl4 | 20 | 12 | 8 |
| xy6 | 20 | 20 | 0 |
| xy8 | 19 | 19 | 0 |
| xy2 | 16 | 16 | 0 |
| xy4 | 16 | 15 | 1 |
| xy3 | 13 | 13 | 0 |
| sm11 | 12 | 12 | 0 |
| mep | 10 | 10 | 0 |
| pl1 | 9 | 7 | 2 |
| pl3 | 9 | 7 | 2 |
| dp7 | 8 | 7 | 1 |
| fut2020 | 5 | 5 | 0 |
| ex10 | 3 | 3 | 0 |
| bw9 | 2 | 2 | 0 |
| dc1 | 2 | 2 | 0 |
| swsh4.5 | 2 | 2 | 0 |
| pop2 | 1 | 1 | 0 |
| pop5 | 1 | 1 | 0 |
| pop8 | 1 | 1 | 0 |
| swsh2 | 1 | 1 | 0 |

## Per-Set Classification Table

| Set | Classification | Next Mode | Notes |
| --- | --- | --- | --- |
| sv08.5 | NUMERIC_PROMOTION | NUMERIC_PROMOTION_FOR_SV08_5 |  |
| A3a | NUMERIC_PROMOTION | NUMERIC_PROMOTION_FOR_A3A |  |
| P-A | NUMERIC_PROMOTION | NUMERIC_PROMOTION_FOR_P_A |  |
| sm12 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM12 |  |
| xyp | BLOCKED_SYMBOLIC | SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_XYP | symbolic tokens require dedicated contract or token review: XY |
| sm10 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM10 |  |
| cel25 | MIXED_EXECUTION | CEL25_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| sm2 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM2 |  |
| sm3 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM3 |  |
| sm8 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM8 |  |
| pl2 | MIXED_EXECUTION | PL2_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| sm7 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM7 |  |
| ecard2 | MIXED_EXECUTION | ECARD2_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| sm5 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM5 |  |
| g1 | MIXED_EXECUTION | G1_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| exu | ALIAS_COLLAPSE | EXU_ALIAS_COLLAPSE_TO_EX10 |  |
| sm6 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM6 |  |
| xy7 | MIXED_EXECUTION | XY7_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| bw11 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_BW11 | exact-number different-name conflict; promotion same-token conflict |
| hgssp | ALIAS_COLLAPSE | HGSSP_ALIAS_COLLAPSE_TO_HSP |  |
| sm4 | MIXED_EXECUTION | SM4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| xy10 | MIXED_EXECUTION | XY10_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| xy9 | MIXED_EXECUTION | MIXED_EXECUTION_FOR_XY9 |  |
| pl4 | MIXED_EXECUTION | PL4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| xy6 | MIXED_EXECUTION | MIXED_EXECUTION_FOR_XY6 |  |
| xy8 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_XY8 |  |
| xy2 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_XY2 |  |
| xy4 | MIXED_EXECUTION | XY4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW |  |
| xy3 | MIXED_EXECUTION | MIXED_EXECUTION_FOR_XY3 |  |
| sm11 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_SM11 |  |
| mep | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_MEP | live gv_id collision |
| pl1 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_PL1 | exact-number different-name conflict; promotion same-token conflict |
| pl3 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_PL3 | exact-number different-name conflict; promotion same-token conflict |
| dp7 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_DP7 | exact-number different-name conflict; promotion same-token conflict |
| fut2020 | NUMERIC_PROMOTION | NUMERIC_PROMOTION_FOR_FUT2020 |  |
| ex10 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_EX10 | exact-number different-name conflict; promotion same-token conflict |
| bw9 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_BW9 | exact-number different-name conflict; promotion same-token conflict |
| dc1 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_DC1 |  |
| swsh4.5 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_SWSH4_5 | exact-number different-name conflict; promotion same-token conflict |
| pop2 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_POP2 |  |
| pop5 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_POP5 |  |
| pop8 | DUPLICATE_COLLAPSE | DUPLICATE_COLLAPSE_TO_CANONICAL_POP8 |  |
| swsh2 | BLOCKED_CONFLICT | CONFLICT_RESOLUTION_AUDIT_FOR_SWSH2 | exact-number different-name conflict; promotion same-token conflict |

## Blocker Summary

- `xyp` -> `BLOCKED_SYMBOLIC`: symbolic tokens require dedicated contract or token review: XY
- `bw11` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `mep` -> `BLOCKED_CONFLICT`: live gv_id collision
- `pl1` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `pl3` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `dp7` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `ex10` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `bw9` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `swsh4.5` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict
- `swsh2` -> `BLOCKED_CONFLICT`: exact-number different-name conflict; promotion same-token conflict

## Recommended Execution Order

1. `exu` -> `EXU_ALIAS_COLLAPSE_TO_EX10`: 27 rows map 1:1 to canonical lane ex10
1. `hgssp` -> `HGSSP_ALIAS_COLLAPSE_TO_HSP`: 25 rows map 1:1 to canonical lane hsp
1. `sm12` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM12`: 58 rows already exist canonically in the base lane
1. `sm10` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM10`: 56 rows already exist canonically in the base lane
1. `sm2` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM2`: 43 rows already exist canonically in the base lane
1. `sm3` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM3`: 43 rows already exist canonically in the base lane
1. `sm8` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM8`: 41 rows already exist canonically in the base lane
1. `sm7` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM7`: 35 rows already exist canonically in the base lane
1. `sm5` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM5`: 31 rows already exist canonically in the base lane
1. `sm6` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM6`: 27 rows already exist canonically in the base lane
1. `xy8` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_XY8`: 19 rows already exist canonically in the base lane
1. `xy2` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_XY2`: 16 rows already exist canonically in the base lane
1. `sm11` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_SM11`: 12 rows already exist canonically in the base lane
1. `dc1` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_DC1`: 2 rows already exist canonically in the base lane
1. `pop2` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_POP2`: 1 rows already exist canonically in the base lane
1. `pop5` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_POP5`: 1 rows already exist canonically in the base lane
1. `pop8` -> `DUPLICATE_COLLAPSE_TO_CANONICAL_POP8`: 1 rows already exist canonically in the base lane
1. `sv08.5` -> `NUMERIC_PROMOTION_FOR_SV08_5`: 180 numeric rows are deterministic and collision-free under the live builder
1. `A3a` -> `NUMERIC_PROMOTION_FOR_A3A`: 103 numeric rows are deterministic and collision-free under the live builder
1. `P-A` -> `NUMERIC_PROMOTION_FOR_P_A`: 100 numeric rows are deterministic and collision-free under the live builder
1. `fut2020` -> `NUMERIC_PROMOTION_FOR_FUT2020`: 5 numeric rows are deterministic and collision-free under the live builder
1. `cel25` -> `CEL25_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 25 numeric rows are executable now; residual subset remains blocked
1. `pl2` -> `PL2_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 20 numeric rows are executable now; residual subset remains blocked
1. `ecard2` -> `ECARD2_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 3 numeric rows are executable now; residual subset remains blocked
1. `g1` -> `G1_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 7 numeric rows are executable now; residual subset remains blocked
1. `xy7` -> `XY7_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 25 numeric rows are executable now; residual subset remains blocked
1. `sm4` -> `SM4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 24 numeric rows are executable now; residual subset remains blocked
1. `xy10` -> `XY10_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 23 numeric rows are executable now; residual subset remains blocked
1. `xy9` -> `MIXED_EXECUTION_FOR_XY9`: 20 numeric rows are executable now; residual subset remains blocked
1. `pl4` -> `PL4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 7 numeric rows are executable now; residual subset remains blocked
1. `xy6` -> `MIXED_EXECUTION_FOR_XY6`: 19 numeric rows are executable now; residual subset remains blocked
1. `xy4` -> `XY4_NUMERIC_COLLAPSE_PLUS_NON_NUMERIC_REVIEW`: 14 numeric rows are executable now; residual subset remains blocked
1. `xy3` -> `MIXED_EXECUTION_FOR_XY3`: 12 numeric rows are executable now; residual subset remains blocked
1. `bw11` -> `CONFLICT_RESOLUTION_AUDIT_FOR_BW11`: exact-number different-name conflict; promotion same-token conflict
1. `mep` -> `CONFLICT_RESOLUTION_AUDIT_FOR_MEP`: live gv_id collision
1. `pl1` -> `CONFLICT_RESOLUTION_AUDIT_FOR_PL1`: exact-number different-name conflict; promotion same-token conflict
1. `pl3` -> `CONFLICT_RESOLUTION_AUDIT_FOR_PL3`: exact-number different-name conflict; promotion same-token conflict
1. `dp7` -> `CONFLICT_RESOLUTION_AUDIT_FOR_DP7`: exact-number different-name conflict; promotion same-token conflict
1. `ex10` -> `CONFLICT_RESOLUTION_AUDIT_FOR_EX10`: exact-number different-name conflict; promotion same-token conflict
1. `bw9` -> `CONFLICT_RESOLUTION_AUDIT_FOR_BW9`: exact-number different-name conflict; promotion same-token conflict
1. `swsh4.5` -> `CONFLICT_RESOLUTION_AUDIT_FOR_SWSH4_5`: exact-number different-name conflict; promotion same-token conflict
1. `swsh2` -> `CONFLICT_RESOLUTION_AUDIT_FOR_SWSH2`: exact-number different-name conflict; promotion same-token conflict
1. `xyp` -> `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_XYP`: symbolic tokens require dedicated contract or token review: XY

## Exact Next Recommended Set And Mode

- Set: `exu`
- Mode: `EXU_ALIAS_COLLAPSE_TO_EX10`

## Current Truths / Invariants Discovered

- identity_domain=pokemon_eng_standard
- remaining_sets=43
- remaining_rows=1266
- alias_collapse_sets=2
- duplicate_collapse_sets=15
- numeric_promotion_sets=4
- exact_token_promotion_sets=0
- mixed_execution_sets=12
- blocked_conflict_sets=9
