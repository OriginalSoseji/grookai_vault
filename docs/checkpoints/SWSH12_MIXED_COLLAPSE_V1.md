# SWSH12_MIXED_COLLAPSE_V1

## Context

`swsh12` matched the same exact mixed-collapse pattern already proven for `swsh9` and `swsh10`:

- `115` active null-`gv_id` parents under `card_print_identity.set_code_identity = 'swsh12'`
- `85` numeric rows that matched canonical `swsh12` by normalized digits plus normalized name
- `30` TG rows that matched canonical `swsh12tg` by exact `TG##` number plus exact normalized name

The audit gate passed with no anomalies, so this phase auto-applied:

- numeric duplicate collapse into canonical `swsh12`
- TG duplicate collapse into canonical `swsh12tg`
- no `gv_id` generation
- no promotion
- no namespace rewrite

## Problem

The unresolved `swsh12` surface was still split across duplicate null-`gv_id` parents even though canonical base-lane and TG-lane parents already existed. The unresolved parents still owned live rows in:

- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`

`vault_items` and every other FK surface referencing `card_prints` were `0` for this collapse set.

## Decision

Auto-apply was lawful because the frozen audit proved an exact pattern match to the prior `swsh9` / `swsh10` mixed-collapse execution:

- `numeric_map = 85`
- `tg_map = 30`
- every old parent mapped `1:1`
- every canonical target was used exactly once
- no canonical-match-different-name anomalies
- no multiple matches
- family target lane already existed and was identity-empty

## Frozen Audit Proof

### Collapse-map gates

- `total_unresolved = 115`
- `numeric_unresolved = 85`
- `tg_unresolved = 30`
- `tg_tgxx_count = 30`
- `numeric_map_count = 85`
- `numeric_distinct_old_count = 85`
- `numeric_distinct_new_count = 85`
- `tg_map_count = 30`
- `tg_distinct_old_count = 30`
- `tg_distinct_new_count = 30`
- `numeric_multiple_match_old_count = 0`
- `numeric_reused_new_count = 0`
- `numeric_unmatched_count = 0`
- `tg_multiple_match_old_count = 0`
- `tg_reused_new_count = 0`
- `tg_unmatched_count = 0`
- `combined_map_count = 115`
- `combined_distinct_old_count = 115`
- `combined_distinct_new_count = 115`

### FK inventory on old parents before apply

- `card_print_identity.card_print_id = 115`
- `card_print_traits.card_print_id = 115`
- `card_printings.card_print_id = 186`
- `external_mappings.card_print_id = 115`
- `vault_items.card_id = 0`

All other live FKs into `public.card_prints` were `0` for this surface.

### Collision audit

- `old_trait_row_count = 115`
- `trait_target_key_conflict_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `old_printing_row_count = 186`
- `printing_finish_conflict_count = 169`
- `printing_mergeable_metadata_only_count = 169`
- `printing_conflicting_non_identical_count = 0`
- `old_external_mapping_row_count = 115`
- `external_mapping_conflict_count = 0`
- `target_identity_row_count = 0`

Interpretation:

- traits were insert-safe onto the canonical parents
- `169` printing rows were already represented canonically by `finish_key`
- `17` printing rows were unique to the old parents and were moved onto the canonical targets
- the redundant printing subset only required safe metadata merge onto null canonical provenance fields

## Mapping Rules

### Numeric lane

- source surface: active `swsh12` identity rows whose `printed_number ~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh12'`
- join rule:
  - normalized digits from `printed_number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| numeric | `e5c28b64-00d9-45a6-bd82-0f9927c683fb` | `32dd8072-a690-4cd9-ad6c-cd824eea4407` | Venomoth | Venomoth | `002` | `2` | `swsh12` | `GV-PK-SIT-2` |

### TG lane

- source surface: active `swsh12` identity rows whose `printed_number !~ '^[0-9]+$'`
- target surface: canonical `card_prints.set_code = 'swsh12tg'`
- join rule:
  - exact `printed_number = number`
  - exact normalized name

Example:

| lane | old_id | new_id | old_name | new_name | old_number | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tg | `5f6107a8-83ae-4224-98cf-2a22af96f5ab` | `08649ce2-4cfe-47a2-a7a6-a57f9f80bfeb` | Braixen | Braixen | `TG01` | `TG01` | `swsh12tg` | `GV-PK-SIT-TG01` |

## Risks

- The only non-trivial collision surface was `card_printings`, because `169` old printing rows already had canonical target rows with the same `finish_key`.
- The apply did not overwrite conflicting printing metadata. It only filled null canonical provenance fields from the old row and then removed the redundant old printing rows.
- If any target printing had carried a non-null conflicting provenance value, the runner would have stopped before commit.

## Verification Results

### Batch execution

- `batch_size = 100`
- `batch_1` processed `100` parents
- `batch_2` processed `15` parents

### FK movement summary

- `updated_vault_items = 0`
- `inserted_traits = 115`
- `deleted_old_traits = 115`
- `merged_printing_metadata_rows = 169`
- `moved_unique_printings = 17`
- `deleted_redundant_printings = 169`
- `updated_external_mappings = 115`
- `updated_identity_rows = 115`
- `deleted_old_parent_rows = 115`

### Post-apply validation

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows = 0`
- `canonical_numeric_target_count = 215`
- `canonical_tg_target_count = 30`
- `numeric_active_identity_rows_on_targets = 85`
- `tg_active_identity_rows_on_targets = 30`

No FK references to the `115` old parent ids remained after commit.

### Sample before/after rows

Numeric sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `e5c28b64-00d9-45a6-bd82-0f9927c683fb` | `false` | `32dd8072-a690-4cd9-ad6c-cd824eea4407` | Venomoth | `2` | `swsh12` | `GV-PK-SIT-2` | `1` |

TG sample after apply:

| old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `5f6107a8-83ae-4224-98cf-2a22af96f5ab` | `false` | `08649ce2-4cfe-47a2-a7a6-a57f9f80bfeb` | Braixen | `TG01` | `swsh12tg` | `GV-PK-SIT-TG01` | `1` |

## Result

Apply succeeded.

- `85` numeric duplicate parents removed
- `30` TG duplicate parents removed
- canonical `swsh12` and `swsh12tg` row counts preserved
- identity unified onto existing canonical parents
- no new `gv_id` created
- no FK references to the old parent ids remain
