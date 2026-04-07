# SWSH45SV_FAMILY_COLLAPSE_V1

## Context

`swsh4.5` was previously refined into two lawful subsets:

- `122` unresolved `SV###` family rows that map `1:1` onto canonical `swsh45sv`
- `2` numeric blockers on canonical `swsh4.5` that remain unresolved because
  they collide as same-number different-name rows

This apply phase collapsed only the proven `SV###` family subset and kept the
numeric blockers fully out of scope.

## Scope Applied

Source scope:

- `card_print_identity.set_code_identity = 'swsh4.5'`
- parent `card_prints.gv_id is null`
- `printed_number ~ '^SV[0-9]+$'`

Canonical target scope:

- `card_prints.set_code = 'swsh45sv'`
- `card_prints.gv_id is not null`

Explicitly excluded:

- `58` `Boss's Orders (Lysandre)`
- `60` `Professor's Research (Professor Juniper)`

## Dry-Run Proof

Preconditions passed exactly:

- `total_unresolved = 124`
- `numeric_unresolved = 2`
- `sv_family_unresolved = 122`
- `other_non_numeric_unresolved = 0`
- `canonical_target_count = 122`
- `map_count = 122`
- `distinct_old_count = 122`
- `distinct_new_count = 122`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `same_number_same_name_count = 122`
- `same_number_different_name_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`

This proved the entire `SV###` subset was collapse-safe.

## Numeric Residuals Deferred

The two numeric rows stayed blocked and untouched:

1. `5ee8ddf9-81b3-43e0-94b5-951ac0386eb8`
   `Boss's Orders (Lysandre)` / `58`
   canonical collision:
   `1adc8c40-9657-4152-b792-f2349c582981`
   `Boss's Orders` / `58` / `GV-PK-SHF-58`
   collision type: `same_number_different_name`

2. `17cd3179-b844-47a8-a197-ae123ca4b583`
   `Professor's Research (Professor Juniper)` / `60`
   canonical collision:
   `1d04ea71-3ba1-430c-a926-34e5764dc0c4`
   `Professor's Research` / `60` / `GV-PK-SHF-60`
   collision type: `same_number_different_name`

Neither row had a lawful base target. They remained unresolved by design.

## FK Inventory and Collision Audit

Family subset FK inventory before apply:

- `card_print_identity = 122`
- `card_print_traits = 122`
- `card_printings = 366`
- `external_mappings = 122`
- `vault_items = 0`

Collision audit passed:

- trait key conflicts = `0`
- trait conflicting non-identical = `0`
- printing finish conflicts = `366`
- printing mergeable metadata only = `366`
- printing conflicting non-identical = `0`
- external mapping conflict = `0`
- target identity occupancy before apply = `0`

All printing collisions were deterministic metadata-only merges.

## Execution

The apply updated only the proven family subset:

1. repointed `card_print_identity`
2. inserted / deduplicated `card_print_traits`
3. merged metadata and removed redundant `card_printings`
4. repointed `external_mappings`
5. checked `vault_items`
6. verified zero old references remained
7. deleted the old family-lane parents

No new `gv_id` was created.
No canonical `swsh45sv` `gv_id` changed.
No numeric blocker row was touched.

## FK Movement Summary

- `updated_identity_rows = 122`
- `inserted_traits = 122`
- `deleted_old_traits = 122`
- `merged_printing_metadata_rows = 366`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 366`
- `updated_external_mappings = 122`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 122`

## Post-Apply Truth

Post-validation passed:

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows_for_swsh45 = 2`
- `remaining_family_unresolved_null_gvid_rows_for_swsh45 = 0`
- `canonical_target_count = 122`
- `target_gv_id_drift_count = 0`
- `target_any_identity_rows = 122`
- `target_active_identity_rows = 122`
- `route_resolvable_target_rows = 122`
- `active_identity_total_before = 10613`
- `active_identity_total_after = 10613`

This leaves only the two audited numeric blockers unresolved in `swsh4.5`.

## Sample Before / After Rows

- first: `Rowlet / SV001`
  `645dffbd-d204-4045-948d-e9e821b5f2fd`
  -> `100fa20d-e065-45b6-ba50-736e58ccb722`
  / `GV-PK-SHF-SV001`

- middle: `Dragapult / SV062`
  `3bc16474-7ffb-4f13-8e8f-344877df8fa1`
  -> `872a67cb-646a-41d9-9b3b-f36d3036e288`
  / `GV-PK-SHF-SV062`

- last: `Eternatus VMAX / SV122`
  `d43a9604-6f5f-474a-99f7-f691ef1a2610`
  -> `95e30a1d-19a5-460c-a752-2e027bf6d270`
  / `GV-PK-SHF-SV122`

For all three sample rows:

- `old_parent_still_exists = false`
- `active_identity_row_count_on_new_parent = 1`
