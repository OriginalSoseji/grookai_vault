# XY6_POST_NORMALIZATION_DRIFT_REPAIR_V2

Status: Applied
Set: `xy6`
Type: Canonical Drift Repair

## Context
- `xy6` unresolved identity work was complete, including the final exact-token precedence collapse.
- Final set verification still failed on one canonical punctuation-drift row:
  - `420248aa-0279-4af7-889f-825602d0ae87 / Shaymin EX / 77a / GV-PK-ROS-77A`
- The repair had to use full `NAME_NORMALIZE_V3` semantics, not a partial substring replace.

## Root Cause
- The remaining canonical row carried `EX` with a space separator instead of canonical `-EX`.
- A partial `' EX' -> '-EX'` style fix is not sufficient governance because it does not audit the full punctuation surface or prove idempotence.
- This repair therefore computed the full case-preserving V3 normalization output in code for all canonical `xy6` rows and updated only rows where the proposed canonical display name differed from the stored name.

## Full Normalization Rules Applied
- unicode apostrophes normalized to ASCII `'`
- em/en dash separators normalized to space
- terminal `GX` suffix normalized to `-GX`
- terminal `EX` suffix normalized to `-EX`
- whitespace collapsed
- names trimmed

Lowercasing remained comparison-only and was not written back to stored card names.

## Repair Outcome
- `drift_rows_detected = 1`
- `rows_updated = 1`
- repaired row:
  - `420248aa-0279-4af7-889f-825602d0ae87`
  - `Shaymin EX` -> `Shaymin-EX`
  - `gv_id = GV-PK-ROS-77A`

## Proof Of Safety
- `semantic_key_drift_count = 0`
- `collision_count_if_applied = 0`
- `gv_id` values unchanged
- `variant_key` values unchanged
- `printed_identity_modifier` untouched
- no relationship tables were modified
- canonical row count unchanged: `112`

## Post-Apply Verification
- `normalization_drift_count_after = 0`
- duplicate canonical rows after apply: `0`
- FK orphan counts after apply:
  - `card_print_identity = 0`
  - `card_print_traits = 0`
  - `card_printings = 0`
  - `external_mappings = 0`
  - `vault_items = 0`

## Invariants Preserved
- repair stayed inside canonical `xy6` rows only
- full `NAME_NORMALIZE_V3` semantics were enforced deterministically
- the operation is idempotent: rerunning after repair finds `0` drift rows
- no canonical identity keys changed
- no cross-set mutation occurred
