# REMAINING_IDENTITY_SURFACE_GLOBAL_AUDIT_V1

## 1. Context

This audit replaces the older April 5 backlog snapshot with a current read-only truth pass after the completed `sm1`, `lc`, and `sm7.5` executions.

Target surface:

- `public.card_print_identity`
- joined to `public.card_prints`
- `card_print_identity.is_active = true`
- parent `card_prints.gv_id is null`

No writes, promotions, collapses, deletes, or `gv_id` generation were performed.

## 2. Why A Global Audit Is Needed Now

The prior global inventory is stale. The remaining execution queue must now be driven from the live unresolved surface only.

Current invariants discovered:

- unresolved identity domain remains deterministic: `pokemon_eng_standard`
- resolved sets `sm1`, `lc`, `sm7.5`, `swsh9`, `swsh10`, and `swsh12` are no longer in the unresolved inventory
- no duplicate-collapse sets remain
- no clean mixed-execution sets remain
- only one clean family realignment remains: `swsh11 -> swsh11tg`
- nine numeric-only promotion sets remain immediately actionable

## 3. Current Unresolved Inventory

- total unresolved sets: `56`
- total unresolved rows: `1649`

Classification breakdown:

| Classification | Set Count | Row Count |
| --- | ---: | ---: |
| `DUPLICATE_COLLAPSE` | 0 | 0 |
| `NUMERIC_PROMOTION` | 9 | 121 |
| `FAMILY_REALIGNMENT` | 1 | 30 |
| `MIXED_EXECUTION` | 0 | 0 |
| `BLOCKED_METADATA` | 41 | 1283 |
| `BLOCKED_UNSUPPORTED_FAMILY` | 2 | 26 |
| `BLOCKED_SYMBOLIC` | 3 | 189 |

## 4. Per-Set Classification Table

| Set | Total | Numeric | Non-Numeric | Classification | Exact Next Mode | Block Reason |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `sv08.5` | 180 | 180 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SV08_5` | printed_set_abbrev missing |
| `swsh4.5` | 124 | 2 | 122 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SWSH4_5` | base exact-number different-name overlap |
| `A3a` | 103 | 103 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_A3A` | printed_set_abbrev missing |
| `P-A` | 100 | 100 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_P_A` | printed_set_abbrev missing |
| `smp` | 84 | 0 | 84 | `BLOCKED_SYMBOLIC` | `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_SMP` | symbolic or promo-style prefixes require dedicated contract: SM |
| `sm12` | 58 | 58 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM12` | base exact-number different-name overlap |
| `xyp` | 58 | 0 | 58 | `BLOCKED_SYMBOLIC` | `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_XYP` | symbolic or promo-style prefixes require dedicated contract: XY |
| `sm10` | 56 | 56 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM10` | base exact-number different-name overlap |
| `cel25` | 47 | 25 | 22 | `BLOCKED_SYMBOLIC` | `SYMBOLIC_IDENTITY_CONTRACT_REQUIRED_FOR_CEL25` | symbolic or promo-style prefixes require dedicated contract: SYMBOLIC |
| `sm2` | 43 | 43 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM2` | base exact-number different-name overlap |
| `sm3` | 43 | 43 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM3` | base exact-number different-name overlap |
| `sm8` | 41 | 41 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM8` | base exact-number different-name overlap |
| `pl2` | 37 | 34 | 3 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_PL2` | base exact-number different-name overlap |
| `sm7` | 35 | 35 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM7` | base exact-number different-name overlap |
| `ecard2` | 34 | 17 | 17 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_ECARD2` | family exact-number different-name overlap; gv_id collision target set_code is null |
| `sm5` | 31 | 31 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM5` | base exact-number different-name overlap |
| `swsh11` | 30 | 0 | 30 | `FAMILY_REALIGNMENT` | `FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH11TG` | - |
| `g1` | 29 | 7 | 22 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_G1` | base exact-number different-name overlap |
| `exu` | 27 | 0 | 27 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_EXU` | printed_set_abbrev missing |
| `sm6` | 27 | 27 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM6` | base exact-number different-name overlap |
| `xy7` | 26 | 25 | 1 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY7` | base exact-number different-name overlap |
| `2021swsh` | 25 | 25 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2021SWSH` | - |
| `bw11` | 25 | 5 | 20 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_BW11` | gv_id collision target set_code is null |
| `hgssp` | 25 | 0 | 25 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_HGSSP` | printed_set_abbrev missing |
| `sm4` | 25 | 24 | 1 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM4` | base exact-number different-name overlap |
| `xy10` | 25 | 23 | 2 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY10` | base exact-number different-name overlap |
| `xy9` | 21 | 21 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY9` | numeric multiple-match ambiguity; base exact-number different-name overlap |
| `pl4` | 20 | 12 | 8 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_PL4` | base exact-number different-name overlap |
| `xy6` | 20 | 20 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY6` | base exact-number different-name overlap |
| `xy8` | 19 | 19 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY8` | base exact-number different-name overlap |
| `xy2` | 16 | 16 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY2` | base exact-number different-name overlap |
| `xy4` | 16 | 15 | 1 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY4` | base exact-number different-name overlap |
| `ecard3` | 15 | 4 | 11 | `BLOCKED_UNSUPPORTED_FAMILY` | `NEW_FAMILY_CONTRACT_REQUIRED_FOR_ECARD3` | unsupported family prefixes without proven family lane: H |
| `xy3` | 13 | 13 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_XY3` | base exact-number different-name overlap |
| `2011bw` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2011BW` | - |
| `2012bw` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2012BW` | - |
| `2014xy` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2014XY` | - |
| `2015xy` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2015XY` | - |
| `2016xy` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2016XY` | - |
| `2017sm` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2017SM` | - |
| `2018sm` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2018SM` | - |
| `2019sm` | 12 | 12 | 0 | `NUMERIC_PROMOTION` | `NUMERIC_PROMOTION_FOR_2019SM` | - |
| `sm11` | 12 | 12 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SM11` | base exact-number different-name overlap |
| `col1` | 11 | 5 | 6 | `BLOCKED_UNSUPPORTED_FAMILY` | `NEW_FAMILY_CONTRACT_REQUIRED_FOR_COL1` | unsupported family prefixes without proven family lane: SL |
| `mep` | 10 | 10 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_MEP` | gv_id collision target set_code is null |
| `pl1` | 9 | 7 | 2 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_PL1` | base exact-number different-name overlap |
| `pl3` | 9 | 7 | 2 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_PL3` | base exact-number different-name overlap |
| `dp7` | 8 | 7 | 1 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_DP7` | base exact-number different-name overlap |
| `fut2020` | 5 | 5 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_FUT2020` | printed_set_abbrev missing |
| `ex10` | 3 | 3 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_EX10` | base exact-number different-name overlap |
| `bw9` | 2 | 2 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_BW9` | base exact-number different-name overlap |
| `dc1` | 2 | 2 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_DC1` | base exact-number different-name overlap |
| `pop2` | 1 | 1 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_POP2` | base exact-number different-name overlap |
| `pop5` | 1 | 1 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_POP5` | base exact-number different-name overlap |
| `pop8` | 1 | 1 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_POP8` | base exact-number different-name overlap |
| `swsh2` | 1 | 1 | 0 | `BLOCKED_METADATA` | `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SWSH2` | base exact-number different-name overlap |

## 5. Blocker Summary

Dominant blocker reasons:

- `base exact-number different-name overlap`: `31` sets
- `printed_set_abbrev missing`: `6` sets
- `gv_id collision target set_code is null`: `2` sets
- `family exact-number different-name overlap; gv_id collision target set_code is null`: `1` set
- `numeric multiple-match ambiguity; base exact-number different-name overlap`: `1` set
- symbolic contract blockers:
  - `smp`: `SM`
  - `xyp`: `XY`
  - `cel25`: `SYMBOLIC`
- unsupported family contract blockers:
  - `ecard3`: `H`
  - `col1`: `SL`

Important partial-proof surface:

- `swsh4.5` is not executable yet, but it is no longer a blind surface.
  - `122` `SV###` rows map cleanly to canonical `swsh45sv`
  - `2` numeric rows collide against canonical `swsh4.5` with exact-number different-name overlap
  - exact next mode remains `IDENTITY_METADATA_REPAIR_REQUIRED_FOR_SWSH4_5`

## 6. Recommended Execution Order

Highest-confidence actionable order:

1. `2021swsh` -> `NUMERIC_PROMOTION_FOR_2021SWSH`
2. `2011bw` -> `NUMERIC_PROMOTION_FOR_2011BW`
3. `2012bw` -> `NUMERIC_PROMOTION_FOR_2012BW`
4. `2014xy` -> `NUMERIC_PROMOTION_FOR_2014XY`
5. `2015xy` -> `NUMERIC_PROMOTION_FOR_2015XY`
6. `2016xy` -> `NUMERIC_PROMOTION_FOR_2016XY`
7. `2017sm` -> `NUMERIC_PROMOTION_FOR_2017SM`
8. `2018sm` -> `NUMERIC_PROMOTION_FOR_2018SM`
9. `2019sm` -> `NUMERIC_PROMOTION_FOR_2019SM`
10. `swsh11` -> `FAMILY_REALIGNMENT_COLLAPSE_TO_SWSH11TG`
11. `ecard3` -> `NEW_FAMILY_CONTRACT_REQUIRED_FOR_ECARD3`
12. `col1` -> `NEW_FAMILY_CONTRACT_REQUIRED_FOR_COL1`

Blocked sets remain last. Within the blocked queue, work should prioritize:

- missing `printed_set_abbrev` repairs first: `sv08.5`, `A3a`, `P-A`, `exu`, `hgssp`, `fut2020`
- then high-row-count metadata collisions: `swsh4.5`, `sm12`, `sm10`, `sm2`, `sm3`, `sm8`
- symbolic-contract surfaces after metadata repair queue: `smp`, `xyp`, `cel25`

## 7. Exact Next Recommended Set And Mode

- next recommended set: `2021swsh`
- next recommended mode: `NUMERIC_PROMOTION_FOR_2021SWSH`

Why:

- `25` unresolved rows
- numeric-only surface
- no canonical base lane overlap
- stable `printed_set_abbrev`
- zero live `gv_id` collisions

## 8. Current Truths / Invariants

- current remaining unresolved set list:
  `sv08.5`, `swsh4.5`, `A3a`, `P-A`, `smp`, `sm12`, `xyp`, `sm10`, `cel25`, `sm2`, `sm3`, `sm8`, `pl2`, `sm7`, `ecard2`, `sm5`, `swsh11`, `g1`, `exu`, `sm6`, `xy7`, `2021swsh`, `bw11`, `hgssp`, `sm4`, `xy10`, `xy9`, `pl4`, `xy6`, `xy8`, `xy2`, `xy4`, `ecard3`, `xy3`, `2011bw`, `2012bw`, `2014xy`, `2015xy`, `2016xy`, `2017sm`, `2018sm`, `2019sm`, `sm11`, `col1`, `mep`, `pl1`, `pl3`, `dp7`, `fut2020`, `ex10`, `bw9`, `dc1`, `pop2`, `pop5`, `pop8`, `swsh2`
- only `swsh11` currently fits a clean family realignment contract
- no remaining set fits duplicate collapse
- no remaining set fits mixed execution under already-proven contracts
- numeric promotions account for only `121` of `1649` remaining rows
- blocked metadata remains the dominant backlog surface: `1283` rows across `41` sets
