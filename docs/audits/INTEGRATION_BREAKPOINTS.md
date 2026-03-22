# INTEGRATION_BREAKPOINTS

## Scope

Repository-grounded pressure test of where a JustTCG integration would break if inserted into the current pricing stack incorrectly.

Files inspected:

- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/pricing/getReferencePricing.ts`
- `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`

## A. Can variant data fit into `card_print_active_prices`?

### Verdict

UNSAFE

### Why

- `card_print_active_prices` is a one-row-per-`card_print_id` view
- it projects the eBay-shaped columns:
  - `nm_floor`
  - `nm_median`
  - `lp_floor`
  - `lp_median`
  - `listing_count`
  - `confidence`
- there is no `printing`, `language`, or generic variant key
- feeding multiple JustTCG variants into this view would require either:
  - flattening multiple variants into one row
  - or changing the row grain and breaking downstream views

## B. Can Grookai Value handle multiple prices per card?

### Verdict

UNSAFE

### Why

- `v_grookai_value_v1_1` reads directly from `card_print_active_prices`
- it computes one `grookai_value_nm` per `card_print_id`
- there is no variant partitioning input
- there is no logic for condition/printing selection inside the engine

If multiple JustTCG prices are pushed into that path, the engine has no deterministic rule for which one becomes truth.

## C. Can ingestion support bulk variant updates?

### Verdict

REQUIRES NEW LAYER

### Why

Transport is not the blocker:

- the repo already has a working JustTCG POST batch client
- deterministic match-back by `tcgplayerId` is already implemented

Storage and semantic fit are the blockers:

- current ingestion workers write listing observations or eBay-shaped summary rows
- JustTCG returns vendor aggregate card/variant payloads, not listing comps
- there is no existing JustTCG variant snapshot/cache table
- there is no active pricing layer that can absorb bulk variant rows without contaminating the truth lane

## Additional Breakpoint: `pricing_observations`

### Verdict

UNSAFE for JustTCG vendor aggregate data

### Why

- `pricing_observations` is a listing-level observation gate
- it requires:
  - `source`
  - `external_id`
  - `price`
  - `shipping`
  - `mapping_status`
  - `classification`
- accepted rows are meant to represent accepted mapped marketplace observations

JustTCG variant prices are aggregate vendor outputs, not Grookai-classified listing observations. Writing them into `pricing_observations` would misstate what that table means.

## Breakpoint Summary

```text
A. Variant data -> card_print_active_prices: UNSAFE
B. Multiple prices per card -> Grookai Value: UNSAFE
C. Bulk variant updates -> current ingestion lane: REQUIRES NEW LAYER
```

The repo can already map cards to JustTCG safely. It cannot safely absorb JustTCG variant pricing into the current truth lane without a separate isolated source domain.
