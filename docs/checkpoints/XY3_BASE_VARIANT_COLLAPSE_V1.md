# XY3_BASE_VARIANT_COLLAPSE_V1

Status: Applied
Set: `xy3`
Execution Class: `BASE_VARIANT_COLLAPSE`

## Context
- `xy3` was selected as the next deterministic mixed-bucket target after `xy6` closure.
- Live audit confirmed `13` unresolved parents in `xy3`.
- `12` rows were lawful `NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1` collapses.
- `1` row was an audited blocker and stayed fully excluded from the apply path.

## Normalization Proof
- `total_unresolved_count = 13`
- `apply_scope_count = 12`
- `blocked_scope_count = 1`
- `canonical_target_count = 114`
- `exact_match_count = 0`
- `same_token_different_name_count = 12`
- `exact_unmatched_count = 13`
- `normalized_map_count = 12`
- `normalized_name_count = 12`
- `suffix_variant_count = 0`
- `reused_target_count = 0`
- `fan_in_group_count = 0`
- `unclassified_count = 0`

## Blocked-Row Exclusion Proof
- Blocked row id: `696cf830-c004-4fcf-9284-00e4e39eaf25`
- Blocked row: `M Lucario EX / 55`
- Root cause surface: shared normalized identity reaches both `GV-PK-FFI-55` and `GV-PK-FFI-55A`
- The runner hard-stops if that id leaves the blocked set or if any additional row enters blocked or unclassified scope.
- The blocked row FK surface was snapshotted before apply and rechecked after apply.

## Apply Summary
- `collapse_count = 12`
- `remaining_unresolved_rows = 1`
- `remaining_blocked_rows = 1`
- `updated_identity_rows = 12`
- `inserted_traits = 12`
- `deleted_old_traits = 12`
- `merged_printing_metadata_rows = 36`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 36`
- `updated_external_mappings = 12`
- `updated_vault_items = 0`

## Invariants Preserved
- only `xy3` rows were touched
- the blocked `M Lucario EX / 55` row remained unresolved and unchanged
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
