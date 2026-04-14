# XY7_BASE_VARIANT_COLLAPSE_V1

## Context

`xy7` was selected as the next deterministic mixed-bucket execution unit because the live audit showed:

- `unresolved_parent_count = 26`
- `execution_class = BASE_VARIANT_COLLAPSE`
- `fan_in_group_count = 0`
- `blocked_conflict_count = 0`
- `promotion_candidate_count = 0`

This checkpoint covers only the same-set `xy7` normalization lane.

## Normalization Proof

- `set_code_identity = xy7` only
- `source_count = 26`
- `canonical_target_count = 100`
- `exact_match_count = 0`
- `same_token_different_name_count = 25`
- `exact_unmatched_count = 26`
- `normalized_map_count = 26`
- `normalized_ambiguous_count = 0`
- `normalized_invalid_count = 0`
- `base_reused_target_count = 0`
- `distinct_old_count = 26`
- `distinct_new_count = 26`
- `normalized_name_count = 25`
- `suffix_variant_count = 1`
- `fan_in_group_count = 0`

All 26 in-scope rows route deterministically by same-set `TOKEN_NORMALIZE_V1` plus exact `NAME_NORMALIZE_V3` equality to a unique canonical `xy7` target.

## Active Identity Preservation

There were no source-side fan-in groups, but one canonical target already carried an active identity row:

- `Hex Maniac / 75a -> Hex Maniac / GV-PK-AOR-75`

To preserve `uq_card_print_identity_active_card_print_id`, the incoming old identity row was archived before repoint:

- `archived_identity_rows = 1`

Post-apply target identity state:

- `target_any_identity_rows = 27`
- `target_active_identity_rows = 26`
- `target_inactive_identity_rows = 1`

## FK Readiness

- `card_print_identity = 26`
- `card_print_traits = 26`
- `card_printings = 78`
- `external_mappings = 26`
- `vault_items = 0`

Collision audit:

- `trait_target_key_conflict_count = 1`
- `trait_mergeable_metadata_only_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `printing_finish_conflict_count = 78`
- `printing_mergeable_metadata_only_count = 78`
- `printing_conflicting_non_identical_count = 0`
- `external_mapping_conflict_count = 0`

The one overlapping trait row was identical on the target. All printing overlaps were safely mergeable by filling canonical metadata before deleting redundant old printing rows.

## Apply Outcome

- `collapse_count = 26`
- `updated_identity_rows = 26`
- `inserted_traits = 25`
- `deleted_old_traits = 26`
- `merged_trait_metadata_rows = 0`
- `merged_printing_metadata_rows = 78`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 78`
- `updated_external_mappings = 26`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 26`

## Post-Apply Truth

- `remaining_unresolved_rows = 0`
- canonical `xy7` row count unchanged: `100`
- `remaining_old_parent_rows = 0`
- all supported old-parent FK references dropped to `0`
- `route_resolvable_target_count = 26`
- `target_gvid_drift_count = 0`
- `target_active_identity_conflict_count = 0`

## Risks Checked

- fan-in accidentally entering the lane
- ambiguous normalization or multi-target routing
- cross-set leakage
- active-identity uniqueness breakage on canonical targets
- unresolved trait or printing collision
- canonical `gv_id` drift

## Sample Rows

- `0c32b81b-42d0-4b45-b5e7-c6708cb1522c / Sceptile EX / 7 -> 3c0f3fc8-dfee-4141-b1bc-9b15ccba4280 / GV-PK-AOR-7`
- `387ffc57-49a3-428f-b180-84b10f0b0efc / Sceptile EX / 84 -> e66d9505-842e-4807-9560-d6642579f3b7 / GV-PK-AOR-84`
- `2c56e111-03d7-4975-ac24-5dc9e14b1e12 / M Rayquaza EX / 98 -> f5aca623-bc3f-49e6-8e09-2fb579d4816d / GV-PK-AOR-98`

## Result

`xy7` is fully normalized and collapsed. The set no longer has unresolved null-`gv_id` parents, and the one target-side identity uniqueness wrinkle was preserved as inactive history without widening execution scope beyond this deterministic lane.
