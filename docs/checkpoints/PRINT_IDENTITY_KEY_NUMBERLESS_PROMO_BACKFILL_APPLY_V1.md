# PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1

## Context

- Promo contract audit is complete and locked:
  - `promo_row_count = 181`
  - `PROMO_CANONICAL = 167`
  - `PROMO_VARIANT = 14`
  - `NON_CANONICAL = 0`
  - `collision_count = 0`
  - `safe_to_derive_promos = yes`
- This execution unit applies only the bounded promo family:
  - `2021swsh = 25`
  - `me01 = 83`
  - `svp = 73`

## Derivation Logic

All 181 in-scope rows have authoritative promo numbers from active TCGdex
mapping.

Applied rule:

```text
print_identity_key =
lower(concat_ws(':',
  set_code,
  promo_number,
  normalized_name
))
```

Live examples:

- `2021swsh:25:pikachu`
- `me01:001:bulbasaur`
- `svp:050:alakazam-ex`

Fallback branch for missing promo numbers remains defined by contract, but it
was not exercised in this batch.

## Dry-Run Result

The bounded dry-run did not proceed to apply.

- `rows_updated = 0`
- `rows_needing_update_before_apply = 181`
- `rows_already_applied_before_apply = 0`
- `remaining_blocked_rows_before = 639`
- `remaining_blocked_rows_after = 639`
- `collision_count = 1`

Blocking conflict:

- target row:
  - `50386954-ded6-4909-8d17-6b391aeb53e4`
  - `svp / Pikachu with Grey Felt Hat`
  - derived key = `svp:085:pikachu-with-grey-felt-hat`
  - `gv_id = GV-PK-PR-SV-085`
- conflicting existing row:
  - `a48b4ff3-64c4-4a63-8c6d-434cebbf32e4`
  - `svp / Pikachu with Grey Felt Hat`
  - `number = 085`
  - `number_plain = 085`
  - `print_identity_key = svp:085:pikachu-with-grey-felt-hat`
  - `gv_id = GV-PK-SVP-85`

Representative non-conflicting samples from the dry-run surface:

- `d34033e2-a8e8-4e72-b1e9-2033445e8f00 / 2021swsh / Bulbasaur / 1 / 2021swsh:1:bulbasaur`
- `35ec8ca0-6bc7-4b2a-9077-94bf42c4fecb / me01 / Bulbasaur / 001 / me01:001:bulbasaur`
- `0c500907-b532-4c45-9b35-5cbe4059c21c / svp / Alakazam ex / 050 / svp:050:alakazam-ex`

## Invariants Preserved

Because the runner failed closed before mutation:

- canonical row count unchanged
- total row count unchanged
- `gv_id` unchanged
- no schema mutation
- no external mapping mutation
- no promo row was updated
- no non-promo row entered the apply scope
- no duplicate V3 identity groups were introduced

## Classification Breakdown

- `PROMO_CANONICAL = 167`
- `PROMO_VARIANT = 14`
- `NON_CANONICAL = 0`

Interpretation:

- the 14 variant rows remain lawful promo canon
- they differ by promo number inside the same promo set and are therefore
  distinguished cleanly by the promo identity lane

## Final State

- `PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1` failed closed
- promo identity lane logic remains valid for 180 rows, but the 181-row batch is
  not safely applicable as a single bounded unit
- blocked derivation surface remains `639`
- the newly exposed blocker is a live preexisting identity collision inside `svp`

Recommended follow-up:

- isolate the conflicting `Pikachu with Grey Felt Hat` pair into a dedicated
  contract audit before attempting any promo backfill apply
