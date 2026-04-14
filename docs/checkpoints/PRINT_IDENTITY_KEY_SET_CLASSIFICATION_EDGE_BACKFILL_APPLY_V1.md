# PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1

## Context

This apply lane executes the bounded follow-up to
`PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_CONTRACT_AUDIT_V1`.

Locked live facts before apply:

- target family size = `238`
- every target row has a valid canonical `set_id`
- authoritative `set_code` is already present in `public.sets`
- active `tcgdex` mapping exists on every target row
- numeric `tcgdex.localId` exists on every target row
- simulated collision count after correction = `0`

The prompt frames this as a set-classification fix. Live state is slightly
narrower and more concrete:

- `card_prints.set_code` is missing on this lane
- `number` is null on this lane
- `number_plain` is a generated column in the live schema and is therefore not
  directly writable
- lawful `print_identity_key` derivation therefore requires both mirrors before
  the key can be populated under the V3 identity surface

## Apply Surface

Bounded target conditions:

- canonical row only: `gv_id is not null`
- `print_identity_key is null`
- `set_id` joins cleanly to canonical `sets.code`
- target rows belong to the audited `SET_CODE_DERIVABLE_FROM_SET_ID` family
- numeric `tcgdex.localId` is available
- no same-name ambiguity inside the target set

Bounded updates:

1. `set_code = sets.code`
2. `number = tcgdex.localId`
3. generated `number_plain` follows from live schema
4. `print_identity_key = lower(concat_ws(':', set_code, number_plain, normalized_name_token, printed_identity_modifier_if_present))`

No other column is allowed to change.

## Proof

Dry-run requirements for this lane:

- `target_row_count = 238`
- `collision_count = 0`
- `ambiguity_count = 0`

Post-apply requirements:

- `rows_updated = 238`
- all target rows have corrected `set_code`
- all target rows have non-null `number`
- all target rows have non-null `number_plain`
- all target rows have non-null `print_identity_key`
- no duplicate V3 identity groups exist
- canonical row count remains unchanged
- `gv_id` checksum remains unchanged

## Invariants Preserved

- canonical identities unchanged
- `gv_id` unchanged
- no FK-bearing tables touched
- no non-target rows touched
- V3 uniqueness remains collision-free

## Observed Result

- `rows_updated = 238`
- `remaining_blocked_rows_before = 458`
- `remaining_blocked_rows_after = 220`
- `collision_count_after = 0`
- `canonical_rows_before = 21086`
- `canonical_rows_after = 21086`
- `gv_id checksum unchanged = bd630751c9159cbbb5b7c3035ab35673`

## Why This Matters

This lane removes the dominant post-promo classification blocker without
touching identity ownership. It converts a stale mirror surface into a lawful
stored identity surface so those rows actually participate in the
`print_identity_key` system rather than merely appearing resolved.
