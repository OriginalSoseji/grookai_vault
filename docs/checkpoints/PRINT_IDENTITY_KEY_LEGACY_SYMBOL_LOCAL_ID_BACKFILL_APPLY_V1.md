# PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1

## Context

This apply lane closes the final `print_identity_key` blocker surface after:

- shadow-row reuse realignment
- promo backfill
- set-classification edge backfill
- same-name multi-variant number mirroring

Locked live pre-state:

- remaining blocked rows = `26`
- all remaining rows were audited as `LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE`
- live families were fully contained in `col1` and `ecard3`

The prompt framed this as a legacy symbol / punctuation normalization step.
Live state was narrower:

- no row required a new modifier lane
- no row required a new variant key
- no row required schema change
- every row already had a lawful canonical `gv_id`
- every row already had authoritative `tcgdex.localId`

So the bounded lawful move was to preserve the exact legacy localId token in
`print_identity_key` and update that column only.

## Normalization Rules

Applied normalization behavior:

1. standard printed-name normalization:
   - apostrophe normalization
   - delta / star normalization
   - `EX` / `GX` suffix handling
   - whitespace and punctuation collapse to canonical token form

2. legacy localId normalization:
   - trim whitespace
   - normalize to uppercase exact token form
   - preserve semantic token identity

Important live nuance:

- `ecard3` holo tokens such as `H13` stay exact
- `col1` shiny-legend tokens such as `SL2` stay exact
- no digit-only collapse was allowed for the `SL#` lane

Final derivation used:

```text
print_identity_key =
lower(concat_ws(':',
  effective_set_code,
  normalized_legacy_local_id_token,
  normalized_name_token
))
```

## Rows Updated

Observed result:

- `target_row_count = 26`
- `rows_updated = 26`
- `remaining_blocked_rows = 0`
- `collision_count_after = 0`

Sample identities:

- `col1:sl2:dialga`
- `col1:sl4:groudon`
- `ecard3:h16:magcargo`
- `ecard3:h31:vaporeon`

## Invariants Preserved

- only `print_identity_key` changed
- canonical row count unchanged
- `gv_id` unchanged
- no external mappings touched
- no non-target rows touched
- no collisions introduced

Observed invariant checks:

- canonical row count unchanged = `21086`
- `gv_id` checksum unchanged = `bd630751c9159cbbb5b7c3035ab35673`

## Completion Status

This apply resolves the final blocked `print_identity_key` surface.

Final state:

- `remaining_blocked_rows = 0`
- full `print_identity_key` coverage achieved
- identity system remains deterministic
