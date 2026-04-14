# PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1

## Context

This execution applies the contract defined by `PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_CONTRACT_AUDIT_V1`.

Locked audit result:

- `number_recoverable_count = 1125`
- `number_not_present_count = 0`
- selected strategy = `AUTHORITATIVE_TCGDEX_NUMBER_RECOVERY_THEN_STANDARD_DERIVATION`

Implication:

- numbers must not be guessed
- hybrid name-only identity is forbidden for this family
- `number_plain` must be restored from authoritative `tcgdex` evidence first

## Extraction Logic

Bounded apply surface:

- canonical rows only
- `print_identity_key IS NULL`
- `set_code` absent locally but joinable through `set_id`
- `number` absent locally
- modern main-set family only:
  - `sv02`
  - `sv04`
  - `sv04.5`
  - `sv06`
  - `sv06.5`
  - `sv07`
  - `sv08`
  - `sv09`
  - `sv10`
  - `swsh10.5`

Recovery rule:

1. require exactly one active `tcgdex` mapping per row
2. require exactly one joinable `tcgdex` raw import per mapping
3. validate:
   - `external_id` prefix matches canonical set code
   - `payload.card.localId` is numeric
   - `external_id` numeric suffix and `localId` agree
   - raw card name matches canonical name
   - raw set id matches canonical set code
4. derive `number_plain` from the numeric token with modern-canon formatting:
   - strip leading zero padding
   - preserve the numeric value only

Examples:

- `sv02-011` -> `raw localId = 011` -> `number_plain = 11`
- `sv10-082` -> `raw localId = 082` -> `number_plain = 82`

## Live Execution Result

Dry-run completed and failed closed before any mutation.

Live result:

- `target_row_count = 1125`
- `successful_extractions = 1125`
- `ambiguity_count = 0`
- `collision_count = 693`
- `rows_updated = 0`
- `apply_status = failed_closed`

Observed collision shape:

- all 693 collision groups are perfect `1 target row : 1 existing numbered canonical row`
- target collision rows = 693
- existing numbered collision rows = 693

Representative examples:

- `sv02 / Abomasnow / recovered number_plain = 11` collides with an existing `sv02 / Abomasnow / 11`
- `sv02 / Bramblin / recovered number_plain = 22` collides with an existing `sv02 / Bramblin / 22`
- `sv02 / Meowscarada ex / recovered number_plain = 15` collides with an existing `sv02 / Meowscarada ex / 15`

Interpretation:

- authoritative number recovery itself is valid
- but the 1125-row family is not a pure missing-number surface
- at least 693 rows are duplicate shadow rows relative to already-numbered canon
- this execution unit correctly stopped before writing invalid duplicate identities

## Invariants Preserved

- `gv_id` unchanged
- canonical row count unchanged
- no canonical identity relationships rewritten
- no external mapping structure changed
- non-target rows untouched

## Risks Checked

- missing or duplicated active `tcgdex` mapping
- raw-import mismatch
- divergent `external_id` vs `localId`
- duplicate identity groups after recovery
- accidental expansion outside the 1125-row family

## Outcome

This artifact did not apply any updates.

The stop condition was triggered because collision risk was present at live dry-run time. The correct next move is no longer blind number recovery for all 1125 rows. The surface must be decomposed into:

- rows that collide with existing numbered canon and likely require collapse/reuse handling
- rows that remain recoverable without introducing duplicate identities
