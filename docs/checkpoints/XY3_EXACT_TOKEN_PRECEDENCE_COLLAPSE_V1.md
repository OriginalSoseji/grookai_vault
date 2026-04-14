# XY3_EXACT_TOKEN_PRECEDENCE_COLLAPSE_V1

Status: Applied
Set: `xy3`
Execution Class: `EXACT_TOKEN_PRECEDENCE_COLLAPSE`

## Context
- `xy3` base-variant collapse reduced the set to one blocked row:
  - `696cf830-c004-4fcf-9284-00e4e39eaf25 / M Lucario EX / 55`
- Blocked audit proved the blocker was not promotion, model extension, or suffix ownership.
- The remaining ambiguity came from two same-set canonical targets on the same normalized surface:
  - exact-token target: `GV-PK-FFI-55`
  - suffix target: `GV-PK-FFI-55A`

## Candidate Targets
- exact-token candidate:
  - `2bc6a250-d786-4719-8a7f-9063489e5d73 / M Lucario-EX / 55 / GV-PK-FFI-55`
- suffix candidate:
  - `5862d23e-8526-4055-baf2-cc478ce02ea9 / M Lucario EX / 55a / GV-PK-FFI-55A`

## Precedence Rule
- bounded rule:
  - when one candidate preserves the exact printed token and another requires suffix escalation, exact-token ownership wins
- source evidence remained unsuffixed:
  - printed token = `55`
  - source external id = `xy3-55`

## Frozen Map
- `696cf830-c004-4fcf-9284-00e4e39eaf25 / M Lucario EX / 55`
  -> `2bc6a250-d786-4719-8a7f-9063489e5d73 / M Lucario-EX / GV-PK-FFI-55`

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

## Invariants
- canonical namespace unchanged
- no `gv_id` mutation
- no broader suffix normalization introduced
- no other `xy3` rows touched
- `GV-PK-FFI-55A` must remain untouched

## Apply Outcome
- `collapse_count = 1`
- `chosen_target_gv_id = GV-PK-FFI-55`
- `updated_identity_rows = 1`
- `inserted_traits = 1`
- `deleted_old_traits = 1`
- `merged_printing_metadata_rows = 3`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 3`
- `updated_external_mappings = 1`
- `updated_vault_items = 0`
- `deleted_old_parent_rows = 1`

## Risks Checked
- accidental suffix precedence
- unexpected third target
- fan-in entering scope
- unsupported FK references
- scope creep beyond this audited conflict type

## Post-Apply Truth
- `remaining_unresolved_rows = 0`
- canonical `xy3` count unchanged: `114`
- exact target identity rows after apply: `1`
- exact target active identity rows after apply: `1`
- exact target inactive identity rows after apply: `0`
- exact target external rows after apply: `5`
- zero old-parent FK references remain
- `GV-PK-FFI-55A` snapshot remained unchanged before vs after apply
