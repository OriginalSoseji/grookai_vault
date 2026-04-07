# SWSH10_MIXED_COLLAPSE_V1

## Context

`swsh10` remained on a mixed unresolved identity surface after the prior audit:

- `128` active null-`gv_id` parents under `card_print_identity.set_code_identity = 'swsh10'`
- `98` numeric rows that matched canonical `swsh10` by normalized digits plus normalized name
- `30` TG rows that matched canonical `swsh10tg` by exact `TG##` number plus exact normalized name

The goal of this phase was apply-only collapse:

- collapse numeric duplicate parents into canonical `swsh10`
- collapse TG duplicate parents into canonical `swsh10tg`
- preserve canonical lanes
- create no new `gv_id`
- perform no promotion and no namespace realignment

## Problem

The unresolved `swsh10` surface was still split across duplicate null-`gv_id` parents even though canonical base-lane and TG-lane parents already existed. The unresolved parents still owned live rows in:

- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`

`vault_items` and every other FK surface referencing `card_prints` were `0` for this collapse set.

## Decision

Apply a set-scoped mixed collapse with two deterministic maps:

- `numeric_map`: `98` rows from null-`gv_id` `swsh10` parents into canonical `swsh10`
- `tg_map`: `30` rows from null-`gv_id` `swsh10` parents into canonical `swsh10tg`

No target reuse was allowed. Every old parent had to map `1:1` to exactly one canonical parent, and every canonical target had to be used exactly once.

## Audit Proof

### Collapse map gates

- `total_unresolved = 128`
- `numeric_unresolved = 98`
- `tg_unresolved = 30`
- `tg_tgxx_count = 30`
- `numeric_map_count = 98`
- `numeric_distinct_old_count = 98`
- `numeric_distinct_new_count = 98`
- `tg_map_count = 30`
- `tg_distinct_old_count = 30`
- `tg_distinct_new_count = 30`
- `numeric_multiple_match_old_count = 0`
- `numeric_reused_new_count = 0`
- `numeric_unmatched_count = 0`
- `tg_multiple_match_old_count = 0`
- `tg_reused_new_count = 0`
- `tg_unmatched_count = 0`
- `combined_map_count = 128`
- `combined_distinct_old_count = 128`
- `combined_distinct_new_count = 128`

### FK inventory on old parents before apply

- `card_print_identity.card_print_id = 128`
- `card_print_traits.card_print_id = 128`
- `card_printings.card_print_id = 202`
- `external_mappings.card_print_id = 128`
- `vault_items.card_id = 0`

All other live FKs into `public.card_prints` were `0` for this surface.

### Collision audit

- `old_trait_row_count = 128`
- `trait_target_key_conflict_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `old_printing_row_count = 202`
- `printing_finish_conflict_count = 202`
- `printing_mergeable_metadata_only_count = 202`
- `printing_conflicting_non_identical_count = 0`
- `old_external_mapping_row_count = 128`
- `external_mapping_conflict_count = 0`
- `target_identity_row_count = 0`

Interpretation:

- traits were insert-safe onto the canonical parents
- every printing row was already represented canonically by `finish_key`
- the only printing differences were mergeable metadata fields (`provenance_source`, `provenance_ref`, `created_by`) where the canonical row was null and the old row carried tcgdex ingestion provenance
- there were no conflicting non-identical duplicates and no target identity occupancy

## Mapping Rules

### Numeric lane

- source surface: active `swsh10` identity rows whose `printed_number ~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh10'`
- join rule:
  - normalized digits from `printed_number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| numeric | `ecbd8715-aa66-4093-aeb7-a1bda4e8c670` | `dfb3467f-aed2-415a-a430-71b7fa5dc00f` | Beedrill V | Beedrill V | `001` | `1` | `swsh10` | `GV-PK-ASR-1` |

### TG lane

- source surface: active `swsh10` identity rows whose `printed_number !~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh10tg'`
- join rule:
  - exact `printed_number = number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tg | `912d1115-124a-4d90-8c96-2f69baa7cbc2` | `fa4caefd-b888-4960-b821-1aa79cb9e4ef` | Abomasnow | Abomasnow | `TG01` | `TG01` | `swsh10tg` | `GV-PK-ASR-TG01` |

## Risks

- The only non-trivial collision surface was `card_printings`, because all `202` old printing rows already had canonical target rows with the same `finish_key`.
- The apply did not overwrite conflicting printing metadata. It only filled null canonical provenance fields from the old row and then removed the redundant old printing rows.
- If any target printing had carried a non-null conflicting provenance value, the runner would have stopped before commit.

## Verification Results

### Batch execution

- `batch_size = 100`
- `batch_1` processed `100` parents
- `batch_2` processed `28` parents

### FK movement summary

- `updated_vault_items = 0`
- `inserted_traits = 128`
- `deleted_old_traits = 128`
- `merged_printing_metadata_rows = 202`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 202`
- `updated_external_mappings = 128`
- `updated_identity_rows = 128`
- `deleted_old_parent_rows = 128`

### Post-apply validation

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_numeric_target_count = 216`
- `canonical_tg_target_count = 30`
- `numeric_active_identity_rows_on_targets = 98`
- `tg_active_identity_rows_on_targets = 30`

No FK references to the `128` old parent ids remained after commit.

### Sample before/after rows

Numeric sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ecbd8715-aa66-4093-aeb7-a1bda4e8c670` | `false` | `dfb3467f-aed2-415a-a430-71b7fa5dc00f` | Beedrill V | `1` | `swsh10` | `GV-PK-ASR-1` | `1` |

TG sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `912d1115-124a-4d90-8c96-2f69baa7cbc2` | `false` | `fa4caefd-b888-4960-b821-1aa79cb9e4ef` | Abomasnow | `TG01` | `swsh10tg` | `GV-PK-ASR-TG01` | `1` |

## Result

Apply succeeded.

- `98` numeric duplicate parents removed
- `30` TG duplicate parents removed
- canonical `swsh10` and `swsh10tg` row counts preserved
- identity unified onto existing canonical parents
- no new `gv_id` created
- no FK references to the old parent ids remain
