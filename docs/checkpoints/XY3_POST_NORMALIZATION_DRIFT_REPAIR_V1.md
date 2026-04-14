# XY3_POST_NORMALIZATION_DRIFT_REPAIR_V1

Status: Applied
Set: `xy3`
Type: Canonical Drift Repair

## Context
- `xy3` identity resolution completed, including the final exact-token precedence collapse.
- Final set verification still failed on one canonical punctuation-drift row:
  - `5862d23e-8526-4055-baf2-cc478ce02ea9 / M Lucario EX / 55a / GV-PK-FFI-55A`
- Identity ownership is already correct. The remaining issue is canonical display-name formatting under `NAME_NORMALIZE_V3`.

## Drift Cause
- The row still stores terminal `EX` with a space separator instead of canonical `-EX`.
- This is canonical-name drift only:
  - no `gv_id` change required
  - no FK movement required
  - no identity reassignment required

## Repair Action
- compute the full case-preserving `NAME_NORMALIZE_V3` display output in code
- validate the normalized form:
  - `M Lucario EX` -> `M Lucario-EX`
- verify no canonical collision exists on the row's identity key
- update only the target row name

## Repair Outcome
- `drift_rows_detected = 1`
- `rows_updated = 1`
- repaired row:
  - `5862d23e-8526-4055-baf2-cc478ce02ea9`
  - `M Lucario EX` -> `M Lucario-EX`
  - `gv_id = GV-PK-FFI-55A`
- `normalization_drift_count_after = 0`

## Scope Lock
- target row only:
  - `5862d23e-8526-4055-baf2-cc478ce02ea9`
- excluded:
  - all other `xy3` rows
  - `gv_id`
  - `variant_key`
  - `printed_identity_modifier`
  - all relationship tables

## Invariants To Preserve
- `gv_id` remains `GV-PK-FFI-55A`
- exact-token precedence result remains unchanged:
  - `GV-PK-FFI-55` stays distinct from `GV-PK-FFI-55A`
- canonical row count remains `114`
- FK orphan counts remain zero

## Post-Apply Verification
- `card_print_identity_orphans = 0`
- `card_print_traits_orphans = 0`
- `card_printings_orphans = 0`
- `external_mappings_orphans = 0`
- `vault_items_orphans = 0`
- canonical row count unchanged: `114`
- no other `xy3` rows were modified
