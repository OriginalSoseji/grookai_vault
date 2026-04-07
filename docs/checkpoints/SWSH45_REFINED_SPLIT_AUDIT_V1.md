# SWSH45_REFINED_SPLIT_AUDIT_V1

## Context

The global remaining-surface audit proved that `swsh4.5` is not uniformly
blocked. Its unresolved identity surface already separates into:

- a large `SV###` family subset that appears to belong on canonical `swsh45sv`
- a tiny numeric residual subset that collides on canonical `swsh4.5`

This refinement audit was run to prove that split precisely before any apply
runner is created.

## Why Refinement Was Needed

Blanket-blocking `swsh4.5` would hide an immediately executable family-lane
collapse. The live unresolved surface is not one problem:

- `122` rows are `SV###` family rows
- `2` rows are numeric blockers on the base lane

The lawful next phase depends on separating those subsets cleanly.

## Audited Counts

- `total_unresolved = 124`
- `numeric_unresolved = 2`
- `sv_family_unresolved = 122`
- `other_non_numeric_unresolved = 0`

These counts match the expected live truth exactly.

## Family Subset Findings

Canonical family lane:

- `set_code = swsh45sv`
- `canonical_swsh45sv_total_rows = 122`
- `canonical_swsh45sv_non_null_gvid_count = 122`

Sample canonical rows:

- `Rowlet / SV001 / GV-PK-SHF-SV001`
- `Dartrix / SV002 / GV-PK-SHF-SV002`
- `Decidueye / SV003 / GV-PK-SHF-SV003`

Strict family mapping proof for the unresolved `SV###` subset:

- `family_mapping_candidate_count = 122`
- `family_distinct_old_count = 122`
- `family_distinct_new_count = 122`
- `family_multiple_match_old_count = 0`
- `family_reused_new_count = 0`
- `family_unmatched_count = 0`
- `family_same_number_same_name_count = 122`
- `family_same_number_different_name_count = 0`

Conclusion:

- the full `SV###` subset is collapse-safe
- mapping requires no guessing
- every family row has exactly one canonical `swsh45sv` target

## Numeric Blocker Findings

The unresolved numeric residual is exactly two rows:

1. `5ee8ddf9-81b3-43e0-94b5-951ac0386eb8`
   `Boss's Orders (Lysandre)` / `58`
   Candidate canonical collision:
   `1adc8c40-9657-4152-b792-f2349c582981`
   `Boss's Orders` / `58` / `GV-PK-SHF-58`
   Collision type: `same_number_different_name`
   Lawful base targets: `0`
   Lawful family targets: `0`

2. `17cd3179-b844-47a8-a197-ae123ca4b583`
   `Professor's Research (Professor Juniper)` / `60`
   Candidate canonical collision:
   `1d04ea71-3ba1-430c-a926-34e5764dc0c4`
   `Professor's Research` / `60` / `GV-PK-SHF-60`
   Collision type: `same_number_different_name`
   Lawful base targets: `0`
   Lawful family targets: `0`

Conclusion:

- both numeric residual rows are true blocked conflicts
- neither row maps anywhere lawful under current canonical base or family lanes
- these two rows must stay out of any family-collapse apply scope

## FK Readiness Summary

The executable `SV###` family subset currently carries:

- `card_print_identity = 122`
- `card_print_traits = 122`
- `card_printings = 366`
- `external_mappings = 122`
- `vault_items = 0`

This is sufficient readiness evidence for the next set-scoped family-collapse
apply runner.

## Final Classification

`OUTCOME A — SPLIT_EXECUTION`

The live `swsh4.5` unresolved surface is now proven to be:

- executable family-collapse subset: `122` `SV###` rows -> canonical `swsh45sv`
- blocked residual subset: `2` numeric same-number different-name conflicts

## Exact Recommended Next Phase

`SWSH45SV_FAMILY_COLLAPSE_TO_SWSH45SV_WITH_2_NUMERIC_BLOCKERS_DEFERRED`

Exact action:

- create a scoped apply runner that collapses only the `122` `SV###` rows from
  unresolved `swsh4.5` onto canonical `swsh45sv`
- exclude numeric `58` and `60` entirely from apply scope
- defer those two numeric rows for dedicated base-lane identity resolution
