# MEE_05C_PRICECHARTING_PROMO_PREFIX_MATCHING_V1

## Status

Implemented as a deterministic local matching improvement for the PriceCharting CSV reference lane.

No provider calls, source page fetches, database writes, pricing rollups, public price publication, or migrations are performed by this checkpoint.

## Purpose

Recover valid reference-evidence candidates that were missed because Grookai stores some promo printed numbers without their source prefix while PriceCharting stores the prefix in the product number.

Examples:

- Grookai `bwp` number `04` can match source number `BW004`.
- Grookai `smp` number `04` can match source number `SM04`.
- Grookai `dpp` number `16` can match source number `DP16`.

## Boundary

The matcher may:

- apply known promo number prefixes only for governed promo set codes
- match PriceCharting `Pokemon Promo` as a set alias only for governed promo set codes
- preserve every candidate as review-gated reference evidence

The matcher must not:

- treat every numeric suffix as equivalent
- match unrelated prefixes such as `TG05` for a `BW05` promo
- fetch provider pages
- insert rows
- update rows
- apply migrations
- compute Grookai value
- publish a price

## Rerun Proof

After this pass:

- MEE-04D candidate evidence increased from `19,359` to `20,918`.
- MEE-05A no-match targets dropped from `847` to `420`.
- MEE-05B prefix-number gaps dropped from `371` to `8`.
- Direct-publishable candidates remained `0`.

## Next Step

Use the remaining `420` no-match targets to decide whether to improve set aliases for specific expansion families or move to a schema-only reference-evidence warehouse draft.
