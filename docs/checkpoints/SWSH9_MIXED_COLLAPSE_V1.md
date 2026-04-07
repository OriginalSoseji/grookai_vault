# SWSH9_MIXED_COLLAPSE_V1

## Context

`swsh9` remained on a mixed unresolved identity surface after the prior audit:

- `120` active null-`gv_id` parents under `card_print_identity.set_code_identity = 'swsh9'`
- `90` numeric rows that matched canonical `swsh9` by normalized digits plus normalized name
- `30` TG rows that matched canonical `swsh9tg` by exact `TG##` number plus exact normalized name

The goal of this phase was apply-only collapse:

- collapse numeric duplicate parents into canonical `swsh9`
- collapse TG duplicate parents into canonical `swsh9tg`
- preserve canonical lanes
- create no new `gv_id`
- perform no promotion and no namespace realignment

## Problem

The unresolved `swsh9` surface was still split across duplicate null-`gv_id` parents even though canonical base-lane and TG-lane parents already existed. The unresolved parents still owned live rows in:

- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`

`vault_items` and every other FK surface referencing `card_prints` were `0` for this collapse set.

## Decision

Apply a set-scoped mixed collapse with two deterministic maps:

- `numeric_map`: `90` rows from null-`gv_id` `swsh9` parents into canonical `swsh9`
- `tg_map`: `30` rows from null-`gv_id` `swsh9` parents into canonical `swsh9tg`

No target reuse was allowed. Every old parent had to map `1:1` to exactly one canonical parent, and every canonical target had to be used exactly once.

## Audit Proof

### Collapse map gates

- `total_unresolved = 120`
- `numeric_unresolved = 90`
- `tg_unresolved = 30`
- `tg_tgxx_count = 30`
- `numeric_map_count = 90`
- `numeric_distinct_old_count = 90`
- `numeric_distinct_new_count = 90`
- `tg_map_count = 30`
- `tg_distinct_old_count = 30`
- `tg_distinct_new_count = 30`
- `numeric_multiple_match_old_count = 0`
- `numeric_reused_new_count = 0`
- `numeric_unmatched_count = 0`
- `tg_multiple_match_old_count = 0`
- `tg_reused_new_count = 0`
- `tg_unmatched_count = 0`
- `combined_map_count = 120`
- `combined_distinct_old_count = 120`
- `combined_distinct_new_count = 120`

### FK inventory on old parents before apply

- `card_print_identity.card_print_id = 120`
- `card_print_traits.card_print_id = 120`
- `card_printings.card_print_id = 190`
- `external_mappings.card_print_id = 120`
- `vault_items.card_id = 0`

All other live FKs into `public.card_prints` were `0` for this surface.

### Collision audit

- `old_trait_row_count = 120`
- `trait_target_key_conflict_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `old_printing_row_count = 190`
- `printing_finish_conflict_count = 174`
- `printing_mergeable_metadata_only_count = 174`
- `printing_conflicting_non_identical_count = 0`
- `old_external_mapping_row_count = 120`
- `external_mapping_conflict_count = 0`
- `target_identity_row_count = 0`

Interpretation:

- traits were insert-safe onto the canonical parents
- `174` printing rows were already represented canonically by `finish_key`
- `16` printing rows were unique to the old parents and were moved onto the canonical targets
- the only printing differences on the redundant subset were mergeable metadata fields (`provenance_source`, `provenance_ref`, `created_by`) where the canonical row was null and the old row carried source provenance
- there were no conflicting non-identical duplicates and no target identity occupancy

## Mapping Rules

### Numeric lane

- source surface: active `swsh9` identity rows whose `printed_number ~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh9'`
- join rule:
  - normalized digits from `printed_number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| numeric | `5fe238fb-6bc9-4cb7-87b9-b8119ac85cf0` | `2b4c5fdd-8d44-48e0-976c-7dff17f77882` | Exeggcute | Exeggcute | `001` | `1` | `swsh9` | `GV-PK-BRS-1` |

### TG lane

- source surface: active `swsh9` identity rows whose `printed_number !~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh9tg'`
- join rule:
  - exact `printed_number = number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tg | `0a447ced-740d-4731-b39d-33e98a9d3baa` | `d163f11d-57a4-4be6-a859-627db7a72fee` | Flareon | Flareon | `TG01` | `TG01` | `swsh9tg` | `GV-PK-BRS-TG01` |

## Risks

- The only non-trivial collision surface was `card_printings`, because `174` old printing rows already had canonical target rows with the same `finish_key`.
- The apply did not overwrite conflicting printing metadata. It only filled null canonical provenance fields from the old row and then removed the redundant old printing rows.
- If any target printing had carried a non-null conflicting provenance value, the runner would have stopped before commit.

## Verification Results

### Batch execution

- `batch_size = 100`
- `batch_1` processed `100` parents
- `batch_2` processed `20` parents

### FK movement summary

- `updated_vault_items = 0`
- `inserted_traits = 120`
- `deleted_old_traits = 120`
- `merged_printing_metadata_rows = 174`
- `moved_unique_printings = 16`
- `deleted_redundant_printings = 174`
- `updated_external_mappings = 120`
- `updated_identity_rows = 120`
- `deleted_old_parent_rows = 120`

### Post-apply validation

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_numeric_target_count = 186`
- `canonical_tg_target_count = 30`
- `numeric_active_identity_rows_on_targets = 90`
- `tg_active_identity_rows_on_targets = 30`

No FK references to the `120` old parent ids remained after commit.

### Sample before/after rows

Numeric sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `5fe238fb-6bc9-4cb7-87b9-b8119ac85cf0` | `false` | `2b4c5fdd-8d44-48e0-976c-7dff17f77882` | Exeggcute | `1` | `swsh9` | `GV-PK-BRS-1` | `1` |

TG sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0a447ced-740d-4731-b39d-33e98a9d3baa` | `false` | `d163f11d-57a4-4be6-a859-627db7a72fee` | Flareon | `TG01` | `swsh9tg` | `GV-PK-BRS-TG01` | `1` |

## Result

Apply succeeded.

- `90` numeric duplicate parents removed
- `30` TG duplicate parents removed
- canonical `swsh9` and `swsh9tg` row counts preserved
- identity unified onto existing canonical parents
- no new `gv_id` created
- no FK references to the old parent ids remain
