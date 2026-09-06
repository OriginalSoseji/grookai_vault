# MTG Sealed Image Pointer Rollback Canary V1

- Status: **FAILED SAFE, ZERO RESIDUE**
- Producer: `5629990277cc4f389790cd2804eb30e1253de047`
- Failed operation: `sealed_product_set_active_image_release_v1`
- PostgreSQL error: `column reference "game_key" is ambiguous`
- Transaction committed: `false`
- Independent pointer readback: `0` rows
- Frozen image release unchanged: `true`
- Rerun performed from failed producer: `false`

The deployed function returns an output column named `game_key` and used
`on conflict (game_key)`. PostgreSQL treated that identifier as ambiguous.
The repair must be a new forward-only migration using the named primary-key
constraint. No direct pointer insert or historical migration edit is allowed.
