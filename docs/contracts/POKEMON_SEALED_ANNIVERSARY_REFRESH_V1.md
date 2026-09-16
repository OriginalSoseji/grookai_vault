# Pokemon Sealed Anniversary Refresh V1

Date: 2026-09-16

This bounded continuation of Pokemon sealed production admits no new identities.
The nine anniversary identities and their image evidence were already applied
and independently verified under `POKEMON_SEALED_ADDITIVE_CATALOG_V1`.

## Frozen Population

The explicit `anniversary-20260916` baseline joins all 1,721 original verified
image members with the nine newly verified members. It does not use the active
published subset as its population, so previously withheld products can recover.
The two immutable release manifests, exact counts, and 27 reviewed source
transitions are pinned in `pokemon_sealed_anniversary_baseline_v1.json` with hash
`b9ed0241889fb882cc9b191c29d43b018eaa934577e4d4c5ed80bd68bec6aea5`.

The 27 transitions are 26 UPC-only additions and one timestamp-only change.
Each receipt binds the old and current payload hashes, source category/group/
product, mapping, variant, and prior comparison proof. Qualification preserves
that receipt. Existing mappings and canonical UPC fields are not rewritten.
Any subsequent source hash change is withheld pending its own review.

## Unchanged Safety Rules

The existing positive USD Normal price, seven-day price age, two-day source-sync
age, price-ratio, five-percent maximum exclusion, image-integrity, paired atomic
publication, protected-game, rollback, readback, and idempotency rules remain.
Original Storage objects and acquisition timestamps are reused. This release
does not change Vault, visibility, signer permissions, cards, sets, or any other
game. The standalone nine-product releases must never replace the full catalog.

## Rollout

1. Test both the original default and opt-in expanded baseline; replay production
   evidence and prove preservation of all previously qualified products.
2. Freeze the producer, run managed shipcheck, and merge the tested source.
3. Select `POKEMON_SEALED_REFRESH_BASELINE=anniversary-20260916` for the daily
   workflow. Both publication and health use the same explicit selector.
4. Freeze a fresh plan, prove transaction rollback, atomically apply paired
   releases, and independently reconcile published identities and images.
5. Preserve before/after pointers, exclusions, hashes, and execution receipts.

Rollback is not selecting the old 1,721 baseline after expansion. That would
silently omit the nine products. A rollback must preserve the expanded identity
population and use a reviewed paired-release recovery or a corrected producer.
