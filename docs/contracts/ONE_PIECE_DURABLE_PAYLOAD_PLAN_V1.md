# One Piece Durable Payload Plan V1

## Purpose

This contract converts the already reviewed Starter Deck 1 rollback-canary
packet into one bounded durable staging plan. It does not fetch, regenerate, or
reclassify source data and it authorizes no canonical or public behavior.

## Frozen Inputs

- Full 7,261-row source manifest logical SHA-256:
  `e55e334b828db7b3a45e4b09cb34a51c81731cf309f3959c08052edb5cf4abf9`
- Passed rollback-canary plan fingerprint:
  `174be939b52f300dc9bab110d1a5fed59a85fc5e676a1ef24379da0bc3639a90`
- Applied schema-plan fingerprint:
  `ee4b70bbfbda797cede83706cccc5234dc9dba619fc23053d02cff6aaad09e58`
- Applied schema-proof SHA-256:
  `dff4e23d0d33773787f9829f847ae26f666a10cdd80b99f0929abf1600def8e9`
- Applied migration SHA-256:
  `7bef0427bcdf9bc4bcf9814c1a29b409ea3c8f6815f66f0b17bd5faf56ff829a`

## Exact Payload

- Batch rows: `1`
- Staging rows: `21`
- Source group: `3189`, Starter Deck 1: Straw Hat Crew
- Exact single-card candidates: `18`
- Numbered cards: `17`
- DON!! cards: `1`
- Sealed-product candidates: `3`
- Quarantine rows: `0`

Every row preserves its deterministic UUID, source product ID, source payload,
payload hash, classification, language evidence, release state, image reference,
and price-lane evidence from the previously passed packet.

## Boundaries

The payload may be written only to the two private immutable One Piece staging
tables. It grants no canonical identity, card printing, sealed identity, source
mapping, pricing publication, app visibility, Storage, Vault, or MTG authority.

The planner is offline-only. A passing plan permits only a fresh production
source/schema preflight and a separately guarded 1-batch/21-row staging writer.
