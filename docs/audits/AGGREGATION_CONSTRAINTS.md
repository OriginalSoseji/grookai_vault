# AGGREGATION_CONSTRAINTS

## Scope

Repository-grounded audit of the aggregation assumptions inside the active Grookai pricing engine and read surfaces.

Files inspected:

- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260218093000_create_v_grookai_value_v1.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260315223000_create_v_grookai_value_v2.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `lib/card_detail_screen.dart`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`

## Constraint 1: One price row per `card_print`

Confirmed.

Why:

- `ebay_active_prices_latest` primary key is `card_print_id`
- `card_print_active_prices` left joins that table back to `card_prints`
- `v_grookai_value_v1`, `v_grookai_value_v1_1`, and `v_grookai_value_v2` all read from `card_print_active_prices`
- every active engine therefore starts from one effective base row per canonical print

## Constraint 2: One active base value per `card_print`

Confirmed.

Why:

- `v_grookai_value_v1_1` emits one `grookai_value_nm` per `card_print_id`
- `v_best_prices_all_gv_v1` projects one `base_market` per `card_id`
- web/mobile pricing consumers request one pricing row per card id

## Constraint 3: No variant dimension in active aggregation

Confirmed.

Why:

- no active engine view includes:
  - `printing`
  - `language`
  - `variant_id`
  - `finish_key`
- no active engine joins `card_printings`
- no active app-facing pricing surface exposes multiple prices for the same `card_id`

## Constraint 4: Active output is base-market only

Confirmed.

Why:

- `v_best_prices_all_gv_v1` sets:
  - `condition_label = null`
  - `cond_market = null`
  - `grade_company = null`
  - `grad_market = null`
- the active public surface is therefore intentionally narrowed to a single base market output

## Constraint 5: Legacy dimensional views are not safe insertion targets

Confirmed.

Why:

- legacy `v_best_prices_all` can show condition and graded fields
- current contracts explicitly mark it as non-authoritative for new product code
- current app surfaces do not use it

That means legacy dimensional columns in `v_best_prices_all` do not create a safe opening for JustTCG variant data.

## Aggregation Constraint Conclusion

The active Grookai value system assumes:

- one effective source row per `card_print`
- one active base price per `card_print`
- no printing dimension
- no vendor variant dimension

JustTCG variant pricing therefore cannot be inserted into the current aggregation chain without changing the aggregation contract itself.
