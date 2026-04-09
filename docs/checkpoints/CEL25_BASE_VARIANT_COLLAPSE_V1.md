# CEL25_BASE_VARIANT_COLLAPSE_V1

## Context

`cel25` mixed-execution audit decomposed the unresolved surface into:

- `DUPLICATE_COLLAPSE = 25`
- `BASE_VARIANT_COLLAPSE = 20`
- `BLOCKED_CONFLICT = 2`

The numeric duplicate lane is already complete. This checkpoint covers only the remaining 20-row same-set base-variant lane and leaves the two blocked conflict rows untouched.

## Normalization Proof

- `set_code = cel25` only
- `source_count = 20`
- `blocked_count = 2`
- `canonical_target_count = 47`
- `exact_match_count = 0`
- `same_token_different_name_count = 0`
- `exact_unmatched_count = 20`
- `normalized_map_count = 20`
- `normalized_ambiguous_count = 0`
- `normalized_invalid_count = 0`
- `base_reused_target_count = 0`
- `distinct_old_count = 20`
- `distinct_new_count = 20`
- `suffix_variant_count = 20`
- `fan_in_group_count = 0`

All 20 in-scope rows route deterministically by `TOKEN_NORMALIZE_V1` suffix stripping plus exact `NAME_NORMALIZE_V3` equality to a unique canonical `cel25` target.

## FK Readiness

- `card_print_identity = 20`
- `card_print_traits = 20`
- `card_printings = 20`
- `external_mappings = 20`
- `vault_items = 0`

Collision audit:

- `trait_target_key_conflict_count = 0`
- `trait_mergeable_metadata_only_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `printing_finish_conflict_count = 3`
- `printing_mergeable_metadata_only_count = 3`
- `printing_conflicting_non_identical_count = 0`
- `external_mapping_conflict_count = 0`

## Apply Outcome

- `collapsed_count = 20`
- `archived_identity_rows = 0`
- `updated_identity_rows = 20`
- `inserted_traits = 20`
- `deleted_old_traits = 20`
- `merged_printing_metadata_rows = 3`
- `moved_unique_printings = 17`
- `deleted_redundant_printings = 3`
- `updated_external_mappings = 20`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 20`

## Post-Apply Truth

- `remaining_unresolved_total_rows = 2`
- `remaining_base_variant_rows = 0`
- `remaining_blocked_rows = 2`
- `remaining_unclassified_rows = 0`
- blocked rows remain exactly:
  - `c2bdbb6f-10de-4a93-abcf-ed3b8837908b`
  - `f7c22698-daa3-4412-84ef-436fb1fe130f`
- canonical `cel25` row count unchanged: `47`
- target identity rows after apply: `20`
- target active identity rows after apply: `20`
- target inactive identity rows after apply: `0`
- `route_resolvable_target_count = 20`
- `target_gvid_drift_count = 0`
- `target_active_identity_conflict_count = 0`
- all supported old-parent FK references dropped to `0`

## Risks Checked

- blocked conflict rows accidentally entering the collapse map
- ambiguous normalization or multi-target routing
- cross-set leakage
- unresolved FK collisions
- canonical `gv_id` drift

## Sample Rows

- `229bfaf2-22e7-470d-981e-d41c762e030b / Blastoise / 2A -> bdbf4197-537b-4fa7-9cac-304006b170aa / GV-PK-CEL-2CC`
- `0e3d9fe1-2ceb-44d4-8ead-139eae869d77 / Shining Magikarp / 66A -> 912437b0-a767-43ec-bb1c-a1fc59a2d26f / GV-PK-CEL-66CC`
- `b2e94fda-91d4-4f7c-b987-151f478740a2 / Garchomp C LV.X / 145A -> 01c5da32-bee4-47a8-9fa4-2b11b967c2d4 / GV-PK-CEL-145CC`

## Result

The `cel25` base-variant surface is fully resolved. Only the audited `BLOCKED_CONFLICT` residue remains for future decomposition.
