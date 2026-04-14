# XY9_BASE_VARIANT_COLLAPSE_V1

Status: Applied
Set: `xy9`
Execution Class: `BASE_VARIANT_COLLAPSE`

## Context
- `xy9` was selected as the next deterministic mixed-bucket target after `xy10` closure.
- Live audit confirmed `21` unresolved parents in `xy9`.
- `20` rows were lawful `NAME_NORMALIZE_V3 + TOKEN_NORMALIZE_V1` collapses.
- `1` row was an audited blocker and stayed fully excluded from the apply path.

## Normalization Proof
- `total_unresolved_count = 21`
- `apply_scope_count = 20`
- `blocked_scope_count = 1`
- `canonical_target_count = 125`
- `exact_match_count = 0`
- `same_token_different_name_count = 20`
- `exact_unmatched_count = 21`
- `normalized_map_count = 20`
- `normalized_name_count = 20`
- `suffix_variant_count = 0`
- `reused_target_count = 0`
- `fan_in_group_count = 0`
- `unclassified_count = 0`

## Blocked-Row Exclusion Proof
- Blocked row id: `a6d34131-d056-49ae-a8b7-21d808e351f6`
- Blocked row: `Delinquent / 98`
- Root cause: same normalized identity reaches two same-set canonical targets, `GV-PK-BKP-98A` and `GV-PK-BKP-98B`
- The runner hard-stops if that id leaves the blocked set or if any additional row enters blocked or unclassified scope.
- The blocked row FK surface was snapshotted before apply and rechecked after apply.

## Apply Summary
- `collapse_count = 20`
- `remaining_unresolved_rows = 1`
- `remaining_blocked_rows = 1`
- `updated_identity_rows = 20`
- `inserted_traits = 20`
- `deleted_old_traits = 20`
- `merged_printing_metadata_rows = 60`
- `moved_unique_printings = 0`
- `deleted_redundant_printings = 60`
- `updated_external_mappings = 20`
- `updated_vault_items = 0`

## Invariants Preserved
- only `xy9` rows were touched
- the blocked `Delinquent / 98` row remained unresolved and unchanged
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
