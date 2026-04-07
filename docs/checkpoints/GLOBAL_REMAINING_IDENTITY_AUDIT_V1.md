# GLOBAL_REMAINING_IDENTITY_AUDIT_V1

## 1. Context

After the completed duplicate-collapse, numeric-promotion, PAF realignment, and mixed-collapse executions for `swsh9`, `swsh10`, and `swsh12`, the remaining null-`gv_id` backlog needed a single deterministic classification pass.

This audit covers the full remaining active unresolved identity surface:

- `public.card_print_identity`
- joined to `public.card_prints`
- `card_print_identity.is_active = true`
- parent `card_prints.gv_id is null`

Artifacts created for this phase:

- `backend/identity/global_remaining_identity_audit_v1.mjs`
- `docs/sql/global_remaining_identity_audit_v1.sql`
- `docs/checkpoints/global_remaining_identity_audit_v1.json`

## 2. Global Scope Summary

The unresolved surface grouped deterministically.

- active unresolved identity domain count: `1`
- target identity domain: `pokemon_eng_standard`
- total unresolved sets: `59`
- total remaining unresolved rows: `1838`

## 3. Classification Breakdown

| Classification | Set Count | Row Count | % Of Remaining Rows |
| --- | ---: | ---: | ---: |
| `CLASS A — DUPLICATE COLLAPSE` | 1 | 1 | 0.05 |
| `CLASS B — NUMERIC PROMOTION` | 9 | 121 | 6.58 |
| `CLASS C — FAMILY REALIGNMENT` | 3 | 218 | 11.86 |
| `CLASS D — MIXED COLLAPSE` | 0 | 0 | 0 |
| `CLASS E — PROMO / PREFIX SYSTEM` | 2 | 58 | 3.16 |
| `CLASS F — BLOCKED` | 44 | 1440 | 78.35 |

Immediate executable work under existing contracts totals `340` rows:

- `CLASS A`: `1`
- `CLASS B`: `121`
- `CLASS C`: `218`

No remaining set matched the already-proven `CLASS D — MIXED COLLAPSE` contract.

## 4. Per-Class Execution Plan

### `CLASS A — DUPLICATE COLLAPSE`

Recommended action: `collapse`

Sets:

- `sm1` (`1` row)

Interpretation:

- one numeric-only set remains where all unresolved rows are deterministic duplicate-collapse candidates under the current base-lane rules

### `CLASS B — NUMERIC PROMOTION`

Recommended action: `promote`

Sets:

- `2021swsh` (`25` rows)
- `2011bw` (`12` rows)
- `2012bw` (`12` rows)
- `2014xy` (`12` rows)
- `2015xy` (`12` rows)
- `2016xy` (`12` rows)
- `2017sm` (`12` rows)
- `2018sm` (`12` rows)
- `2019sm` (`12` rows)

Interpretation:

- these are numeric-only surfaces with no canonical base overlap, no collapse-ready duplicates, and no live `gv_id` collisions under the current derivation contract

### `CLASS C — FAMILY REALIGNMENT`

Recommended action: `realign`

Sets:

- `lc` (`110` rows)
- `sm7.5` (`78` rows)
- `swsh11` (`30` rows)

Interpretation:

- `lc` is an alias-collision realignment case: no canonical `lc` base lane exists, and every proposed derived `gv_id` collides one-to-one with canonical `base6`
- `sm7.5` is the same alias-collision pattern onto canonical `sm75`
- `swsh11` is a clean non-numeric family-lane case: all `30` unresolved TG rows map one-to-one to canonical `swsh11tg` and none remain unmatched

### `CLASS D — MIXED COLLAPSE`

Recommended action: `split + collapse`

Sets:

- none

Interpretation:

- after `swsh9`, `swsh10`, and `swsh12`, no remaining unresolved set still fits the proven base-plus-family mixed-collapse pattern

### `CLASS E — PROMO / PREFIX SYSTEM`

Recommended action: `new pattern contract needed`

Sets:

- `cel25` (`47` rows)
- `col1` (`11` rows)

Interpretation:

- `cel25` contains `25` numeric rows and `22` non-numeric symbolic rows with no detected canonical family lane
- `col1` contains `5` numeric rows and `6` `SL`-prefixed rows with no detected canonical family lane
- both sets remain structurally coherent enough to avoid `CLASS F`, but they need a new contract for mixed prefix handling before execution

### `CLASS F — BLOCKED`

Recommended action: `fix identity first`

Sets: `44`

Interpretation:

- this is the dominant backlog surface
- most blocked sets are not missing mechanics; they are blocked by identity ambiguity, missing printed-set metadata, or structurally unsafe `gv_id` collision targets

## 5. Risk Summary By Class

Dominant blocker patterns across `CLASS F`:

- `base exact-number different-name overlap`: `34` sets
- `printed_set_abbrev missing`: `6` sets
- `family exact-number different-name overlap`: `4` sets
- `gv_id collision target set_code is null`: `3` sets
- `numeric collapse multiple-match ambiguity`: `1` set

Representative blocked surfaces:

- `swsh4.5`: blocked by base exact-number different-name overlap even though its `SV###` subset cleanly maps to `swsh45sv`
- `sv08.5`, `A3a`, `P-A`, `exu`, `hgssp`, `fut2020`: blocked by missing `printed_set_abbrev`
- `ecard2`, `bw11`, `mep`: blocked by live `gv_id` collisions whose canonical target `set_code` is `null`
- `xy9`: blocked by both numeric multiple-match ambiguity and base exact-number different-name overlap

## 6. Sets Executable Immediately

- `sm1`: `CLASS A — DUPLICATE COLLAPSE` -> `collapse` (`1` row)
- `lc`: `CLASS C — FAMILY REALIGNMENT` -> `realign` (`110` rows)
- `sm7.5`: `CLASS C — FAMILY REALIGNMENT` -> `realign` (`78` rows)
- `swsh11`: `CLASS C — FAMILY REALIGNMENT` -> `realign` (`30` rows)
- `2021swsh`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`25` rows)
- `2011bw`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2012bw`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2014xy`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2015xy`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2016xy`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2017sm`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2018sm`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)
- `2019sm`: `CLASS B — NUMERIC PROMOTION` -> `promote` (`12` rows)

## 7. Sets Requiring New Contracts

- `cel25`
- `col1`

These are the only remaining sets that clearly need a new execution contract rather than identity repair.

## 8. Next Execution Order

1. `sm1` -> duplicate collapse
2. `lc` -> family realignment
3. `sm7.5` -> family realignment
4. `swsh11` -> family realignment
5. `2021swsh` -> numeric promotion
6. `2011bw` -> numeric promotion
7. `2012bw` -> numeric promotion
8. `2014xy` -> numeric promotion
9. `2015xy` -> numeric promotion
10. `2016xy` -> numeric promotion
11. `2017sm` -> numeric promotion
12. `2018sm` -> numeric promotion
13. `2019sm` -> numeric promotion
14. `cel25` -> new mixed prefix contract
15. `col1` -> new mixed prefix contract
16. all `CLASS F` sets -> identity repair before any execution attempt

## 9. Per-Set Classification Table

| Set | Total | Numeric | Non-Numeric | Classification | Recommended Action | Blocked Reason |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `sv08.5` | 180 | 180 | 0 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `swsh4.5` | 124 | 2 | 122 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `lc` | 110 | 110 | 0 | CLASS C — FAMILY REALIGNMENT | `realign` | - |
| `A3a` | 103 | 103 | 0 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `P-A` | 100 | 100 | 0 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `smp` | 84 | 0 | 84 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm7.5` | 78 | 78 | 0 | CLASS C — FAMILY REALIGNMENT | `realign` | - |
| `sm12` | 58 | 58 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xyp` | 58 | 0 | 58 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm10` | 56 | 56 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `cel25` | 47 | 25 | 22 | CLASS E — PROMO / PREFIX SYSTEM | `new pattern contract needed` | - |
| `sm2` | 43 | 43 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm3` | 43 | 43 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm8` | 41 | 41 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `pl2` | 37 | 34 | 3 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm7` | 35 | 35 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `ecard2` | 34 | 17 | 17 | CLASS F — BLOCKED | `fix identity first` | family exact-number different-name overlap; gv_id collision target set_code is null |
| `sm5` | 31 | 31 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `swsh11` | 30 | 0 | 30 | CLASS C — FAMILY REALIGNMENT | `realign` | - |
| `g1` | 29 | 7 | 22 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap; family exact-number different-name overlap |
| `exu` | 27 | 0 | 27 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `sm6` | 27 | 27 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy7` | 26 | 25 | 1 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `2021swsh` | 25 | 25 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `bw11` | 25 | 5 | 20 | CLASS F — BLOCKED | `fix identity first` | family exact-number different-name overlap; gv_id collision target set_code is null |
| `hgssp` | 25 | 0 | 25 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `sm4` | 25 | 24 | 1 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy10` | 25 | 23 | 2 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy9` | 21 | 21 | 0 | CLASS F — BLOCKED | `fix identity first` | numeric collapse multiple-match ambiguity; base exact-number different-name overlap |
| `pl4` | 20 | 12 | 8 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy6` | 20 | 20 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy8` | 19 | 19 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy2` | 16 | 16 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `xy4` | 16 | 15 | 1 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `ecard3` | 15 | 4 | 11 | CLASS F — BLOCKED | `fix identity first` | family exact-number different-name overlap |
| `xy3` | 13 | 13 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `2011bw` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2012bw` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2014xy` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2015xy` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2016xy` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2017sm` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2018sm` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `2019sm` | 12 | 12 | 0 | CLASS B — NUMERIC PROMOTION | `promote` | - |
| `sm11` | 12 | 12 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `col1` | 11 | 5 | 6 | CLASS E — PROMO / PREFIX SYSTEM | `new pattern contract needed` | - |
| `mep` | 10 | 10 | 0 | CLASS F — BLOCKED | `fix identity first` | gv_id collision target set_code is null |
| `pl1` | 9 | 7 | 2 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `pl3` | 9 | 7 | 2 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `dp7` | 8 | 7 | 1 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `fut2020` | 5 | 5 | 0 | CLASS F — BLOCKED | `fix identity first` | printed_set_abbrev missing |
| `ex10` | 3 | 3 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `bw9` | 2 | 2 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `dc1` | 2 | 2 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `pop2` | 1 | 1 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `pop5` | 1 | 1 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `pop8` | 1 | 1 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |
| `sm1` | 1 | 1 | 0 | CLASS A — DUPLICATE COLLAPSE | `collapse` | - |
| `swsh2` | 1 | 1 | 0 | CLASS F — BLOCKED | `fix identity first` | base exact-number different-name overlap |

## Status

AUDIT COMPLETE
