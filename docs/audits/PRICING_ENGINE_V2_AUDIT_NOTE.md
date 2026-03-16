# PRICING_ENGINE_V2_AUDIT_NOTE

## Purpose

Create a parallel Grookai pricing engine view, `public.v_grookai_value_v2`, that stays deterministic and bounded while becoming more conservative in wide-spread markets.

## Formula Summary

V2 remains sourced only from `public.card_print_active_prices`.

It:

- keeps the V1.1 effective floor guard
- computes `spread_ratio = nm_median / nm_floor` when safe
- keeps a monotonic liquidity weight from listing count
- adds a spread trust weight that reduces reliance on median when spread is wide
- blends between `effective_floor_nm` and `nm_median`
- applies confidence as downward-only tempering
- reclamps the final value to `[least(nm_floor, nm_median), greatest(nm_floor, nm_median)]`

## Contract Checks To Run

Run:

- `docs/audits/sql/verify_grookai_value_v2.sql`

Core checks:

- bounds proof
- null integrity
- effective floor sanity
- weight sanity
- V1 vs V2 distribution comparison
- wide-spread sample inspection
- tight-market sample inspection

## Promotion Status

No consumer promotion in this change.

Existing consumers remain on `public.v_grookai_value_v1`.

## Expected Behavior

- wide-spread markets become more conservative
- tight-spread markets stay closer to median
- null handling and bounds behavior remain unchanged
