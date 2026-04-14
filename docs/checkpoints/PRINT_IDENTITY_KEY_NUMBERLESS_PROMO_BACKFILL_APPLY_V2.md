# PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V2

## Context

- `PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1` failed closed on one
  live promo collision in the `svp` lane.
- `PRINT_IDENTITY_KEY_PROMO_MULTI_ROW_REUSE_REALIGNMENT_V1` resolved that
  blocking family by keeping the lawful canonical promo row and removing the
  two non-canonical duplicates.
- This V2 artifact re-runs the bounded promo backfill from live state only. No
  stale V1 scope assumptions are reused without re-audit.

## Live Re-Audit

- bounded promo lane re-audited from current database state = `181` rows
- `target_row_count = 181`
- `excluded_rows_count = 0`
- `collision_count = 0`
- `ambiguity_count = 0`
- classification breakdown:
  - `PROMO_CANONICAL = 167`
  - `PROMO_VARIANT = 14`
  - `NON_CANONICAL = 0`

Representative live rows:

- `d34033e2-a8e8-4e72-b1e9-2033445e8f00` -> `2021swsh:1:bulbasaur`
- `35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb` -> `me01:001:bulbasaur`
- `0c500907-b532-4c45-9b35-5cbe4059c21c` -> `svp:050:alakazam-ex`

## Derivation Logic

Locked promo identity lane applied in code:

```text
if promo_number exists:
  print_identity_key =
    lower(concat_ws(':', effective_set_code, normalized_promo_number, normalized_name_token))

if promo_number is absent but modifier is lawful:
  print_identity_key =
    lower(concat_ws(':', effective_set_code, normalized_name_token, printed_identity_modifier))
```

Rules used in this apply:

- `effective_set_code` comes from the canonical joined promo set surface
- promo number comes from authoritative active TCGdex mapping
- zero-padding is preserved where the live promo identity requires it
- name token normalization matches the approved global derivation behavior

## Apply Result

- `rows_updated = 181`
- `collision_count_after = 0`
- `ambiguity_count_after = 0`
- all 181 target promo rows now have non-null `print_identity_key`
- `remaining_blocked_rows_before = 639`
- `remaining_blocked_rows_after = 458`

## Invariants Preserved

- canonical row count unchanged
- total row count unchanged
- `gv_id` unchanged
- no field other than `print_identity_key` changed on the updated rows
- no non-promo rows entered the apply scope
- no duplicate V3 identity groups were introduced

## Why It Matters

- the promo identity lane is now integrated after the collision cleanup pass
- this removes a major blocked family from the global `print_identity_key`
  rollout
- the remaining blocked surface is reduced to `458`
