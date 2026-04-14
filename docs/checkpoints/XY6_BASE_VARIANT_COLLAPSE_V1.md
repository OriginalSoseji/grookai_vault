# XY6_BASE_VARIANT_COLLAPSE_V1

Status: Applied
Set: `xy6`
Execution Class: `BASE_VARIANT_COLLAPSE`

## Context
- `xy6` was selected as the next deterministic mixed-bucket target after the post-`xy9` audit cycle.
- Live audit confirmed `20` unresolved parents in `xy6`.
- `19` rows were lawful `NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1` collapses.
- `1` row was an audited blocker and stayed fully excluded from the apply path.

## Normalization Proof
- `total_unresolved_count = 20`
- `apply_scope_count = 19`
- `blocked_scope_count = 1`
- `canonical_target_count = 112`
- `exact_match_count = 0`
- `same_token_different_name_count = 19`
- `exact_unmatched_count = 20`
- `normalized_map_count = 19`
- `normalized_name_count = 19`
- `suffix_variant_count = 0`
- `reused_target_count = 0`
- `fan_in_group_count = 0`
- `unclassified_count = 0`

## Blocked-Row Exclusion Proof
- Blocked row id: `dc8c3dce-bede-47d2-ac8a-095bb633a3ba`
- Blocked row: `Shaymin EX / 77`
- Root cause: same normalized identity reaches two same-set canonical targets, `GV-PK-ROS-77` (`Shaymin-EX / 77`) and `GV-PK-ROS-77A` (`Shaymin EX / 77a`)
- The runner hard-stops if that id leaves the blocked set or if any additional row enters blocked or unclassified scope.
- The blocked row FK surface is snapshotted before apply and rechecked after apply.

## Apply Summary
- `collapse_count = 19`
- `remaining_unresolved_rows = 1`
- `remaining_blocked_rows = 1`
- `updated_identity_rows = 19`
- `inserted_traits = 19`
- `deleted_old_traits = 19`
- `merged_printing_metadata_rows = 57`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 57`
- `updated_external_mappings = 19`
- `updated_vault_items = 0`

## Sample Apply Rows
- `Rayquaza EX / 75` -> `Rayquaza-EX / GV-PK-ROS-75`
- `M Rayquaza EX / 105` -> `M Rayquaza-EX / GV-PK-ROS-105`
- `M Latios EX / 59` -> `M Latios-EX / GV-PK-ROS-59`

## Invariants Preserved
- only `xy6` rows were touched
- the blocked `Shaymin EX / 77` row remained unresolved and unchanged
- no fan-in groups entered scope
- no cross-set mapping occurred
- canonical namespace remained unchanged
- `gv_id` values were not mutated
- old FK references for apply-scope rows were reduced to `0`

## Risks Checked
- blocked row entering apply path
- unexpected target reuse
- hidden fan-in
- unsupported FK references
- non-deterministic trait or printing merges
- blocked row mutation during apply
