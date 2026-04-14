# PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_COLLISION_CONTRACT_AUDIT_V1

## Context

The prior two-row reuse assumption failed closed.

Live reality for the `Pikachu with Grey Felt Hat` promo family is a three-row same-identity cluster:

1. `50386954-ded6-4909-8d17-6b391aeb53e4`
   - `gv_id = GV-PK-PR-SV-085`
   - `number = NULL`
   - `number_plain = NULL`

2. `5557ba0d-6aa7-451f-8195-2a300235394e`
   - `gv_id = GV-PK-PR-SV-85`
   - `number = 85`
   - `number_plain = 85`

3. `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4`
   - `gv_id = GV-PK-SVP-85`
   - `number = 085`
   - `number_plain = 085`
   - `print_identity_key = svp:085:pikachu-with-grey-felt-hat`

This is not a simple duplicate pair. It is a mixed-correctness identity family.

## Identity Alignment

All three rows normalize to the same real-world promo identity:

- same effective set lane after `set_id` join: `svp`
- same normalized printed name: `pikachu-with-grey-felt-hat`
- same normalized promo number: `85`
- blank `variant_key`
- blank `printed_identity_modifier`

So the rows do not represent distinct variants. They represent one printed card.

## Classification

### TRUE_CANONICAL

- `50386954-ded6-4909-8d17-6b391aeb53e4`

Why:

- it is the only row with an active identity record
- that identity record already asserts:
  - `set_code_identity = svp`
  - `printed_number = 085`
  - normalized printed name matches
- it carries the authoritative active `tcgdex` mapping for `svp-085`
- its GV-ID is in the dominant live namespace family: `GV-PK-PR-SV-*`

This row is missing mirrored fields (`set_code`, `number`, `number_plain`, `print_identity_key`), but that is a completeness issue, not an identity error.

### SHADOW_ROW

- `5557ba0d-6aa7-451f-8195-2a300235394e`

Why:

- it represents the same promo identity
- it stays inside the dominant `GV-PK-PR-SV-*` namespace family
- it has no active identity row and no authoritative external mapping
- it looks like a partially materialized duplicate carrying local `number`/`number_plain` and downstream usage

This is best modeled as a shadow duplicate of the canonical row, not as a malformed identity lane.

### MALFORMED_ROW

- `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4`

Why:

- it represents the same promo identity
- but it uses the outlier legacy namespace `GV-PK-SVP-85`
- it is the only `svp` row already holding the derived `print_identity_key`
- it lacks an active identity row
- it carries JustTCG linkage on a row that is not the authoritative canonical parent

This is not a distinct identity. It is a malformed duplicate occupying canonical-looking surface incorrectly.

## Contract Rule

Formal rule for this family:

1. The row with active identity proof plus authoritative source mapping is canonical.
2. Same-identity duplicates in the dominant namespace family but without active identity proof are shadows.
3. Same-identity duplicates in an outlier namespace family or with prematurely assigned derived identity fields are malformed rows.

Applied here:

- `50386954...` = `TRUE_CANONICAL`
- `5557ba0d...` = `SHADOW_ROW`
- `a48b4ff3...` = `MALFORMED_ROW`

## Resolution Strategy

Future apply must:

1. keep `50386954-ded6-4909-8d17-6b391aeb53e4` as the canonical parent
2. repoint `5557ba0d-6aa7-451f-8195-2a300235394e` to the canonical row
3. repoint `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4` to the canonical row
4. delete both non-canonical rows
5. rerun promo `print_identity_key` backfill on the surviving canonical row

No `gv_id` rewrite is required in this audit step.

## Deterministic Output

- `conflict_group_size = 3`
- `classification_counts = { TRUE_CANONICAL: 1, SHADOW_ROW: 1, MALFORMED_ROW: 1 }`
- `canonical_row_id = 50386954-ded6-4909-8d17-6b391aeb53e4`
- `shadow_row_ids = [5557ba0d-6aa7-451f-8195-2a300235394e]`
- `malformed_row_ids = [a48b4ff3-64c4-4a63-8c6d-434cebbf32e4]`
- `next_execution_unit = PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1`
