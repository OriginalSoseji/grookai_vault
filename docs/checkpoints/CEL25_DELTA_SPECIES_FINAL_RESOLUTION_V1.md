# CEL25_DELTA_SPECIES_FINAL_RESOLUTION_V1

## Context

`cel25` had one unresolved row left after numeric duplicate collapse, base-variant collapse, and the bounded `Star -> ★` equivalence:

- `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`

The delta-species identity model is now live, so the remaining row can be collapsed into its lawful canonical target without changing `gv_id` or touching any other `cel25` rows.

## Delta Species Model Usage

Target canonical row:

- `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`
- `set_code = cel25`
- `number_plain = 93`
- `variant_key = cc`
- `printed_identity_modifier = delta_species`

Hard gates proven:

- `total_unresolved_count = 1`
- `source_count = 1`
- `target_count = 1`
- `same_token_canonical_count = 1`
- `unmatched_count = 0`
- `ambiguous_target_count = 0`
- `reused_target_count = 0`

Frozen map:

- `f7c22698-daa3-4412-84ef-436fb1fe130f / Gardevoir ex / 93A`
  -> `b4a42612-945d-419f-a4f4-c64ae5c26d6b / Gardevoir ex δ / GV-PK-CEL-93CC`

## FK Readiness

- `card_print_identity = 1`
- `card_print_traits = 1`
- `card_printings = 1`
- `external_mappings = 1`
- `vault_items = 0`

Collision audit:

- `target_identity_rows_before = 0`
- `target_trait_row_count = 1`
- `target_printing_row_count = 1`
- `target_external_mapping_row_count = 1`
- `trait_target_key_conflict_count = 0`
- `printing_finish_conflict_count = 0`
- `external_mapping_conflict_count = 0`

## Apply Outcome

- `collapse_count = 1`
- `updated_identity_rows = 1`
- `merged_trait_metadata_rows = 0`
- `inserted_traits = 1`
- `deleted_old_traits = 1`
- `merged_printing_metadata_rows = 0`
- `moved_unique_printings = 1`
- `deleted_redundant_printings = 0`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 1`

## Final cel25 Closure

- `remaining_unresolved_total_rows = 0`
- canonical `cel25` row count unchanged: `47`
- target `printed_identity_modifier` preserved: `delta_species`
- target identity rows after apply: `1`
- target active identity rows after apply: `1`
- target inactive identity rows after apply: `0`
- zero old-parent FK references remain
- zero target `gv_id` drift

## Invariants

- only the single delta-species row entered scope
- no other `cel25` rows were touched
- no cross-set routing occurred
- canonical namespace stayed unchanged
- `printed_identity_modifier = delta_species` remained on the canonical target
- `cel25` is now fully resolved
