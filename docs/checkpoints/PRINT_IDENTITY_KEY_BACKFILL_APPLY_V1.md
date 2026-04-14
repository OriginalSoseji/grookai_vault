# PRINT_IDENTITY_KEY_BACKFILL_APPLY_V1

## Context

The `print_identity_key` backfill split produced two lawful lanes:

- `SAFE_BACKFILL_LANE = 31`
- `BLOCKED_LANE = 1332`

This artifact applies only the safe lane. The blocked lane remains excluded and untouched.

## Derivation Logic

Applied code-level derivation:

```text
print_identity_key =
lower(concat_ws(':',
  effective_set_code,
  effective_number_plain,
  normalized_printed_name_token,
  printed_identity_modifier_if_present
))
```

Bounded rule extensions used:

- `set_code` fallback from `sets.code` via `set_id`
- legacy symbolic `variant_key` allowance only for canonical `ex10 / Unown` rows where `variant_key = number_plain`
- no guessed fallback for numberless rows

Excluded from this apply:

- all `1332` blocked rows
- all `gv_id` values
- all canonical row structure outside `print_identity_key`
- all external mapping surfaces

## Apply Result

Live execution result:

- `rows_updated = 31`
- `remaining_blocked_rows = 1332`
- `collision_count = 0`
- `canonical_total_rows_before = 25343`
- `canonical_total_rows_after = 25343`
- `canonical_row_count_before = 21781`
- `canonical_row_count_after = 21781`
- `gvid_checksum_before = 3a9927165dfbf2c69a7ce987b24c1655`
- `gvid_checksum_after = 3a9927165dfbf2c69a7ce987b24c1655`
- `status = apply_passed`

Target-lane outcome:

- the 29 joinable `set_code` gap rows now have non-null `print_identity_key`
- the 2 legacy symbolic `ex10 / Unown` rows now have non-null `print_identity_key`

Representative sample rows:

- `bw11 / Charmander / 17 / "" -> bw11:17:charmander`
- `ecard2 / Espeon / 11 / "" -> ecard2:11:espeon`
- `ex10 / Unown / ! / ! -> ex10:!:unown`

## Invariants Preserved

Verified after apply:

- canonical row count unchanged
- `gv_id` unchanged
- V3 composite duplicate groups = `0`
- blocked rows touched = `0`

Bounded-scope proof:

- only rows in the computed 31-row safe lane were updated
- no blocked row received a non-null `print_identity_key`

## Blocked Surface Untouched

The blocked lane remains isolated:

- `1332` rows still blocked
- dominant reason remains missing printed-number surface

Those rows require a separate contract-first audit before any additional backfill can proceed.

## Result

The partial backfill completed safely and moved the system forward without weakening canonical invariants.
