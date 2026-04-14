# PRINT_IDENTITY_KEY_BLOCKED_SURFACE_AUDIT_V1

## Context

The bounded `print_identity_key` backfill is complete for the only derivable subset of the prior blocker surface:

- prior derivation-input-gap surface = 1363 rows
- bounded derivable subset already resolved = 31 rows
- remaining blocked surface = 1332 rows

This checkpoint covers only that residual 1332-row blocked lane. It is not a broad audit of every canonical row where `print_identity_key` is null.

## Blocker Breakdown

Live re-audit confirms that the remaining 1332 rows are internally consistent:

- `number_surface_class = NO_NUMBER_FIELD` for all 1332 rows
- `set_code_class = SET_CODE_NULL_BUT_SET_ID_VALID` for all 1332 rows
- `name_quality_class = NAME_VALID` for all 1332 rows
- `variant_modifier_class = CLEAN_VARIANT` for all 1332 rows
- `UNCLASSIFIED = 0`

Operationally this means:

- name normalization is not the blocker
- variant or modifier cleanup is not the blocker
- set-code mirroring is mechanical and universal
- the actual blocker is absence of a printed number surface

## Family Definitions

The blocked lane decomposes cleanly into three deterministic, non-overlapping families:

### FAMILY_1_NUMBERLESS_MODERN_MAINSET_BATCH

- row_count = 1125
- pct_of_total = 84.46
- complexity_level = medium
- set breakdown:
  - `sv04.5` = 245
  - `sv02` = 99
  - `sv04` = 99
  - `sv06` = 99
  - `sv06.5` = 99
  - `sv07` = 99
  - `sv08` = 99
  - `sv09` = 99
  - `sv10` = 99
  - `swsh10.5` = 88
- contract meaning:
  - modern mainset/miniset rows exist canonically with names and set ownership, but without any printed-number surface
  - deterministic derivation requires authoritative number recovery before backfill
- sample rows:
  - `sv02 / Abomasnow / number = null / number_plain = null`
  - `sv02 / Arctibax / number = null / number_plain = null`
  - `sv02 / Azumarill / number = null / number_plain = null`

### FAMILY_2_NUMBERLESS_PROMO_BATCH

- row_count = 181
- pct_of_total = 13.59
- complexity_level = medium
- set breakdown:
  - `me01` = 83
  - `svp` = 73
  - `2021swsh` = 25
- contract meaning:
  - promo rows are also missing number surfaces, but promo numbering rules differ from mainset numbering and need a separate contract audit
- sample rows:
  - `2021swsh / Bulbasaur / number = null / number_plain = null`
  - `2021swsh / Charmander / number = null / number_plain = null`
  - `2021swsh / Chespin / number = null / number_plain = null`

### FAMILY_3_NUMBERLESS_LEGACY_BATCH

- row_count = 26
- pct_of_total = 1.95
- complexity_level = high
- set breakdown:
  - `ecard3` = 15
  - `col1` = 11
- contract meaning:
  - legacy rows are missing number surfaces and require historical numbering recovery rather than simple local derivation
- sample rows:
  - `col1 / Clefable / number = null / number_plain = null`
  - `col1 / Dialga / number = null / number_plain = null`
  - `col1 / Entei / number = null / number_plain = null`

## Distribution

- dominant_family = `FAMILY_1_NUMBERLESS_MODERN_MAINSET_BATCH`
- modern mainset family share = 84.46%
- promo family share = 13.59%
- legacy family share = 1.95%

The family split is complete and non-overlapping. There is no residual normalization or variant sub-lane hiding inside this surface.

## Execution Roadmap

Recommended codex sequence:

1. `PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1`
2. `PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_CONTRACT_AUDIT_V1`
3. `PRINT_IDENTITY_KEY_NUMBERLESS_LEGACY_CONTRACT_AUDIT_V1`

Why this order:

- the modern mainset family is both the largest and the most internally uniform
- resolving the dominant family first removes 84.46% of the blocked lane
- promo and legacy families are smaller but require distinct numbering contracts, so they should remain isolated

## Next Execution Recommendation

- next_execution_unit = `PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1`

This is the safest deterministic next step because it targets the dominant family without mixing promo or legacy numbering semantics. The missing-number problem is contractual, not syntactic, so the correct next move is contract audit before any new backfill or normalization work.

## System Implications

- future work should be organized by numberless family, not by name cleanup or variant normalization
- set-code mirroring can be handled mechanically inside later family-specific execution units
- no schema change is required for this blocked lane
- no existing `gv_id` or canonical identity needs mutation during this audit phase
