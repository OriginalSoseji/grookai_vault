# XY6_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1

Status: Applied
Set: `xy6`
Execution Class: `EXACT_TOKEN_PRECEDENCE_COLLAPSE`

## Context
- `xy6` base-variant collapse reduced the set to one blocked row:
  - `dc8c3dce-bede-47d2-ac8a-095bb633a3ba / Shaymin EX / 77`
- Audit proved the blocker was not a model gap or promotion case.
- The remaining ambiguity came from two same-set canonical targets on the same normalized surface:
  - exact-token target: `GV-PK-ROS-77`
  - suffix target: `GV-PK-ROS-77A`

## Proof
- `source_count = 1`
- `candidate_count = 2`
- exact-token candidate:
  - `8ad97482-9c74-4ae2-b08f-ea15fa92077e / Shaymin-EX / 77 / GV-PK-ROS-77`
- suffix candidate:
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin EX / 77a / GV-PK-ROS-77A`
- source evidence remained unsuffixed:
  - printed token = `77`
  - source external id = `xy6-77`
- bounded rule applied:
  - when one candidate preserves the exact printed token and another requires suffix escalation, exact-token ownership wins

## Frozen Map
- `dc8c3dce-bede-47d2-ac8a-095bb633a3ba / Shaymin EX / 77`
  -> `8ad97482-9c74-4ae2-b08f-ea15fa92077e / Shaymin-EX / GV-PK-ROS-77`

## FK Readiness
- `card_print_identity = 1`
- `card_print_traits = 1`
- `card_printings = 3`
- `external_mappings = 1`
- `vault_items = 0`

Collision audit:
- `trait_target_key_conflict_count = 0`
- `printing_finish_conflict_count = 3`
- `printing_mergeable_metadata_only_count = 3`
- `printing_conflicting_non_identical_count = 0`
- `external_mapping_conflict_count = 0`

## Apply Outcome
- `collapse_count = 1`
- `chosen_target_gv_id = GV-PK-ROS-77`
- `updated_identity_rows = 1`
- `inserted_traits = 1`
- `deleted_old_traits = 1`
- `merged_printing_metadata_rows = 3`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 3`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 1`

## Invariants Preserved
- canonical namespace unchanged
- no `gv_id` mutation
- no broader suffix normalization introduced
- no other `xy6` rows touched
- `GV-PK-ROS-77A` remained untouched

## Risks Checked
- accidental suffix precedence
- unexpected third target
- fan-in entering scope
- unsupported FK references
- scope creep beyond this audited conflict type

## Post-Apply Truth
- `remaining_unresolved_rows = 0`
- canonical `xy6` count unchanged: `112`
- exact target identity rows after apply: `1`
- exact target active identity rows after apply: `1`
- exact target inactive identity rows after apply: `0`
- zero old-parent FK references remain
- `GV-PK-ROS-77A` snapshot remained unchanged before vs after apply
