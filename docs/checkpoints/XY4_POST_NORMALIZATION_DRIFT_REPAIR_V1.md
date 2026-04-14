# XY4_POST_NORMALIZATION_DRIFT_REPAIR_V1

Status: Applied
Set: `xy4`
Type: Canonical Drift Repair

## Context
- `xy4` had no unresolved identity surface left.
- Final set verification still failed on one canonical punctuation-drift row:
  - `f0a82330-0795-40cf-9994-0b77c9494ba8 / M Manectric EX / 24a / GV-PK-PHF-24A`
- Identity ownership is already correct. The only remaining issue is canonical display-name formatting under `NAME_NORMALIZE_V3`.

## Drift Cause
- The row still stores terminal `EX` with a space separator instead of canonical `-EX`.
- This is canonical-name drift only:
  - no `gv_id` change required
  - no FK movement required
  - no identity reassignment required

## Repair Action
- compute the full case-preserving `NAME_NORMALIZE_V3` display output in code
- validate the normalized form:
  - `M Manectric EX` -> `M Manectric-EX`
- verify no canonical collision exists on the row's live identity key:
  - `number_plain = 24`
  - `variant_key = a`
- update only the target row name

## Repair Outcome
- `drift_rows_detected = 1`
- `rows_updated = 1`
- repaired row:
  - `f0a82330-0795-40cf-9994-0b77c9494ba8`
  - `M Manectric EX` -> `M Manectric-EX`
  - `gv_id = GV-PK-PHF-24A`
- `normalization_drift_count_after = 0`

## Scope Lock
- target row only:
  - `f0a82330-0795-40cf-9994-0b77c9494ba8`
- excluded:
  - all other `xy4` rows
  - `gv_id`
  - `variant_key`
  - `printed_identity_modifier`
  - all relationship tables

## Invariants To Preserve
- `gv_id` remains `GV-PK-PHF-24A`
- canonical row count remains `123`
- FK orphan counts remain zero

## Post-Apply Verification
- `card_print_identity_orphans = 0`
- `card_print_traits_orphans = 0`
- `card_printings_orphans = 0`
- `external_mappings_orphans = 0`
- `vault_items_orphans = 0`
- canonical row count unchanged: `123`
- no other `xy4` rows were modified
