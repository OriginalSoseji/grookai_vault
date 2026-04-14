# G1_POST_NORMALIZATION_DRIFT_REPAIR_V2

Status: Applied
Set: `g1`
Type: Canonical Drift Repair

## Context
- `g1` identity resolution completed through base-variant collapse plus RC-prefix promotion.
- final verification still failed on `normalization_drift_count = 6`
- debug audit proved the failure was an execution gap:
  - no `g1`-specific bounded drift-repair artifact existed
  - all six drift rows share the same single failure type: `EX_NOT_CONVERTED`

## Repair Strategy
- compute full case-preserving `NAME_NORMALIZE_V3` display output in code for all canonical `g1` rows
- update only rows where `expected_normalized_name <> current_name`
- fail closed unless:
  - `drift_row_count = 6`
  - `collision_count_after_normalization = 0`
  - only `name` would change

## Audited Repair Surface
- `095e74cb-e9fd-46c8-8ffb-15f165195672`:
  - `Venusaur EX` -> `Venusaur-EX`
- `dddd1e45-be0c-4c57-95c8-4538d224f98e`:
  - `Leafeon EX` -> `Leafeon-EX`
- `2b0e08a7-d030-452d-bd69-2f4ead71f7d2`:
  - `Charizard EX` -> `Charizard-EX`
- `e41576b3-63ad-4d3f-b54b-74659ee56475`:
  - `Vaporeon EX` -> `Vaporeon-EX`
- `ff741f35-d525-4725-bb8e-9878d2a12856`:
  - `Jolteon EX` -> `Jolteon-EX`
- `8498f4ed-a36c-5463-85d6-f4f697136385`:
  - `Gardevoir EX` -> `Gardevoir-EX`

## Proof
- `drift_row_count = 6`
- all six failures classify as `EX_NOT_CONVERTED`
- `collision_count_after_normalization = 0`
- `gv_id_change_required = 0`

## Invariants Preserved
- canonical identities unchanged
- `gv_id` unchanged
- `number`, `number_plain`, and `variant_key` unchanged
- RC-prefix lane unchanged
- FK-bearing tables untouched

## Risks
- over-updating beyond the computed diff
- inconsistency between repair normalizer and verification logic
- accidental canonical name collision

## Repair Outcome
- `drift_rows_detected_before = 6`
- `rows_updated = 6`
- `normalization_drift_count_after = 0`
- `canonical_count` unchanged: `116`
- duplicate canonical rows after apply: `0`
- FK orphan counts after apply:
  - `card_print_identity = 0`
  - `card_print_traits = 0`
  - `card_printings = 0`
  - `external_mappings = 0`
  - `vault_items = 0`

## Sample Repaired Rows
- `095e74cb-e9fd-46c8-8ffb-15f165195672`:
  - `Venusaur EX` -> `Venusaur-EX`
- `dddd1e45-be0c-4c57-95c8-4538d224f98e`:
  - `Leafeon EX` -> `Leafeon-EX`
- `2b0e08a7-d030-452d-bd69-2f4ead71f7d2`:
  - `Charizard EX` -> `Charizard-EX`
- `8498f4ed-a36c-5463-85d6-f4f697136385`:
  - `Gardevoir EX` -> `Gardevoir-EX`

## Invariants Preserved After Apply
- only `name` changed on the six audited rows
- `gv_id` values remained unchanged for all six rows
- `number`, `number_plain`, and `variant_key` remained unchanged
- RC-prefix identity ownership remained unchanged
- no FK-bearing tables were modified
