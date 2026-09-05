# MTG Sealed Image Pointer Function Repair V1

## Purpose

Repair the deployed `sealed_product_set_active_image_release_v1` function
without activating an image release or changing any data authority.

The original function returns a column named `game_key` and used the
unqualified conflict target `on conflict (game_key)`. PostgreSQL therefore
resolved `game_key` ambiguously between the output variable and table column
when the function was invoked.

## Repair

Replace only the conflict clause with:

```sql
on conflict on constraint sealed_product_image_release_pointer_pkey
```

The function signature, security-definer setting, search path, compare-and-swap
logic, release checks, price-release binding, result shape, and service-only
grant remain unchanged.

## Apply Boundary

The durable gate may write exactly one migration-ledger row and replace exactly
one function. It may not write an image pointer, image evidence, Storage,
pricing, visibility, Vault, client, cross-game, update, delete, or cleanup row.

The apply must prove before commit and through an independent read-only
connection that the pointer remains absent and every protected row count and
release/visibility authority remains unchanged.

## Next Gate

After the migration is applied and read back, rerun the rollback-only pointer
canary from a new clean producer commit. Durable pointer activation remains a
separate exact-authority gate.
