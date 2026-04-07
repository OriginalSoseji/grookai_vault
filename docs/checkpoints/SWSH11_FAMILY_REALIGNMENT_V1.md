# SWSH11_FAMILY_REALIGNMENT_V1

## Context

`swsh11` was the only remaining family realignment surface in the Sword and Shield TG pattern after the earlier `swsh9`, `swsh10`, and `swsh12` mixed collapses.

Live pre-apply truth:

- unresolved `swsh11` parents = `30`
- numeric unresolved rows = `0`
- TG unresolved rows = `30`
- canonical `swsh11` base lane already existed with `229` live canonical rows
- canonical `swsh11tg` family lane already existed with `30` live canonical rows

These unresolved rows were TG-family rows only. They did not belong on canonical base `swsh11`, and they did not require new `gv_id` minting.

## Problem

Active `card_print_identity.set_code_identity = 'swsh11'` rows still pointed at `30` null-`gv_id` parent `card_prints` rows even though the lawful canonical TG lane already existed at `swsh11tg`.

The unresolved surface still owned rows in:

- `card_print_identity`
- `card_print_traits`
- `card_printings`
- `external_mappings`

`vault_items` and every other live FK surface into `public.card_prints` were `0` for this set.

## Decision

Collapse the unresolved `swsh11` TG-family parents into canonical `swsh11tg` parents by:

- exact `printed_number = TG##`
- exact normalized name

No new `gv_id` is created.
No canonical `swsh11` base rows are modified.
Canonical `swsh11tg` remains the owner of `GV-PK-LOR-TG##`.

## Proof

### Hard-gate proof

- `total_unresolved = 30`
- `numeric_unresolved = 0`
- `tg_unresolved = 30`
- `non_tg_row_count = 0`
- `canonical_target_count = 30`
- `map_count = 30`
- `distinct_old_count = 30`
- `distinct_new_count = 30`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 0`
- `different_name_overlap_count = 0`
- `target_any_identity_rows = 0`
- `target_active_identity_rows = 0`

### Representative mapping proof

| position | old_id | old_name | old_number | new_id | new_name | new_number | new_set_code | new_gv_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| first | `41ea80bf-b700-49dd-b023-ee1096714686` | Parasect | `TG01` | `eed66685-9b88-49d3-8d73-07dc647c3a8b` | Parasect | `TG01` | `swsh11tg` | `GV-PK-LOR-TG01` |
| middle | `b10ce5c5-5acc-41d2-94f1-de5f0c058487` | Centiskorch VMAX | `TG15` | `8f251b0f-b21c-477a-a403-fac1ec404e89` | Centiskorch VMAX | `TG15` | `swsh11tg` | `GV-PK-LOR-TG15` |
| last | `19363cbd-7282-444f-95cb-1fafd92203f0` | Mew VMAX | `TG30` | `b39a2bdc-a4c7-46b0-83ce-dc9ffa406631` | Mew VMAX | `TG30` | `swsh11tg` | `GV-PK-LOR-TG30` |

### FK inventory on old parents before apply

- `card_print_identity.card_print_id = 30`
- `card_print_traits.card_print_id = 30`
- `card_printings.card_print_id = 30`
- `external_mappings.card_print_id = 30`
- `vault_items.card_id = 0`

No out-of-scope FK table had any live rows pointing at the `30` old parent ids.

### Collision audit

- `old_trait_row_count = 30`
- `trait_target_key_conflict_count = 0`
- `trait_conflicting_non_identical_count = 0`
- `old_printing_row_count = 30`
- `printing_finish_conflict_count = 30`
- `printing_mergeable_metadata_only_count = 30`
- `printing_conflicting_non_identical_count = 0`
- `old_external_mapping_row_count = 30`
- `external_mapping_conflict_count = 0`
- `target_identity_row_count = 0`

Interpretation:

- traits were insert-safe onto the canonical TG targets
- all `30` old printing rows already had canonical target rows with the same `finish_key`
- the only printing differences were mergeable metadata fields
- there were no conflicting non-identical duplicates

## Risks

- stale apply surface drift away from the audited `30` TG rows
- incorrect family-lane mapping if any target row were reused
- FK collisions in `card_printings`
- leaving old parent references behind in live child tables

Controls used:

- hard stop on any non-TG row, multiple match, unmatched row, different-name overlap, or target identity occupancy
- pre-apply schema and data backups written before row movement
- batch-level zero-reference proof before deleting parent rows
- post-apply validation across all discovered FK surfaces referencing `card_prints`

## Verification Plan

Execution order:

1. Build frozen `old_id -> new_id` TG-family collapse map.
2. Write pre-apply schema and data backups.
3. Repoint `card_print_identity`.
4. Move `card_print_traits`.
5. Merge redundant `card_printings` by `finish_key`.
6. Repoint `external_mappings`.
7. Verify zero old references remain.
8. Delete old parent rows.
9. Verify post-apply counts and sample rows.

## Post-Apply Truth

Backups written:

- [swsh11_family_realignment_preapply_schema.sql](/C:/grookai_vault/backups/swsh11_family_realignment_preapply_schema.sql)
- [swsh11_family_realignment_preapply_data.sql](/C:/grookai_vault/backups/swsh11_family_realignment_preapply_data.sql)

Apply executed in `1` batch of `30`.

### FK movement summary

- `updated_identity_rows = 30`
- `inserted_traits = 30`
- `deleted_old_traits = 30`
- `merged_printing_metadata_rows = 30`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 30`
- `updated_external_mappings = 30`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 30`

### Post-apply validation

- `remaining_old_parent_rows = 0`
- `remaining_unresolved_null_gvid_rows_for_swsh11 = 0`
- `canonical_base_target_count = 229`
- `canonical_tg_target_count = 30`
- `target_active_identity_rows = 30`
- `route_resolvable_target_rows = 30`
- `active_identity_total_before = 10613`
- `active_identity_total_after = 10613`

No FK references to the `30` old parent ids remained after commit.

### Sample before/after rows

| position | old_id | old_parent_still_exists | new_id | new_name | new_number | new_set_code | new_gv_id | active_identity_row_count_on_new_parent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| first | `41ea80bf-b700-49dd-b023-ee1096714686` | `false` | `eed66685-9b88-49d3-8d73-07dc647c3a8b` | Parasect | `TG01` | `swsh11tg` | `GV-PK-LOR-TG01` | `1` |
| middle | `b10ce5c5-5acc-41d2-94f1-de5f0c058487` | `false` | `8f251b0f-b21c-477a-a403-fac1ec404e89` | Centiskorch VMAX | `TG15` | `swsh11tg` | `GV-PK-LOR-TG15` | `1` |
| last | `19363cbd-7282-444f-95cb-1fafd92203f0` | `false` | `b39a2bdc-a4c7-46b0-83ce-dc9ffa406631` | Mew VMAX | `TG30` | `swsh11tg` | `GV-PK-LOR-TG30` | `1` |

## Status

APPLY COMPLETE
