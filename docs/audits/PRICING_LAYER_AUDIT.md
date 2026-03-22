# PRICING_LAYER_AUDIT

## Scope

Repository-grounded audit of the current pricing tables and views relevant to a JustTCG integration boundary.

Files inspected:

- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20251213153630_baseline_constraints.sql`
- `supabase/migrations/20260218093000_create_v_grookai_value_v1.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260315223000_create_v_grookai_value_v2.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/getPublicCardByGvId.ts`
- `lib/card_detail_screen.dart`
- `docs/contracts/PRICING_SURFACE_CONTRACT_V1.md`
- `docs/contracts/STABILIZATION_CONTRACT_V1.md`

## Active Pricing Path

The current active pricing stack in repo reality is:

```text
ebay_active_price_snapshots
-> ebay_active_prices_latest
-> card_print_active_prices
-> v_grookai_value_v1_1
-> v_best_prices_all_gv_v1
-> web/mobile pricing consumers
```

`docs/contracts/PRICING_SURFACE_CONTRACT_V1.md` and `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts` both confirm that:

- active canonical pricing engine = `public.v_grookai_value_v1_1`
- active app-facing pricing surface = `public.v_best_prices_all_gv_v1`

## Table / View Inventory

### `public.ebay_active_price_snapshots`

- Type: base table
- Primary key: `id`
- Foreign key: `card_print_id -> public.card_prints(id)`
- Columns:
  - `id uuid`
  - `card_print_id uuid`
  - `source text default 'ebay_browse'`
  - `captured_at timestamptz`
  - `nm_floor numeric(12,2)`
  - `nm_median numeric(12,2)`
  - `lp_floor numeric(12,2)`
  - `lp_median numeric(12,2)`
  - `listing_count integer`
  - `raw_sample_count_nm integer`
  - `raw_sample_count_lp integer`
- Source assumption:
  - explicit `source` column exists
  - practical shape is still eBay-only because the table name, defaults, and writers are eBay browse specific
- Condition support:
  - partial, hard-coded raw buckets only: `nm_*`, `lp_*`
- Printing support:
  - none

### `public.ebay_active_prices_latest`

- Type: base table
- Primary key: `card_print_id`
- Foreign key: `card_print_id -> public.card_prints(id)`
- Columns:
  - `card_print_id uuid`
  - `source text default 'ebay_browse'`
  - `nm_floor numeric(12,2)`
  - `nm_median numeric(12,2)`
  - `lp_floor numeric(12,2)`
  - `lp_median numeric(12,2)`
  - `listing_count integer`
  - `confidence numeric(3,2)`
  - `last_snapshot_at timestamptz`
  - `updated_at timestamptz`
- Source assumption:
  - explicit `source` column exists
  - cardinality is one row per `card_print_id`, so the active table is still structurally one latest market row per canonical print
- Condition support:
  - partial, hard-coded raw buckets only: `nm_*`, `lp_*`
- Printing support:
  - none

### `public.card_print_active_prices`

- Type: view
- Effective key: `card_print_id`
- Definition:
  - `card_prints cp`
  - left join `ebay_active_prices_latest lap on lap.card_print_id = cp.id`
- Columns:
  - `card_print_id`
  - `set_id`
  - `number_plain`
  - `name`
  - `source`
  - `nm_floor`
  - `nm_median`
  - `lp_floor`
  - `lp_median`
  - `listing_count`
  - `confidence`
  - `last_snapshot_at`
  - `updated_at`
- Source assumption:
  - explicit `source` is projected from `ebay_active_prices_latest`
  - the view is still implicitly eBay-shaped because its only pricing parent is `ebay_active_prices_latest`
- Condition support:
  - partial, hard-coded raw buckets only: `nm_*`, `lp_*`
- Printing support:
  - none

### `public.v_grookai_value_v1`

- Type: historical pricing engine view
- Effective key: `card_print_id`
- Input:
  - `public.card_print_active_prices`
- Output shape:
  - one Grookai NM value per `card_print_id`
- Source assumption:
  - no explicit source isolation beyond what is inherited from `card_print_active_prices`
- Condition support:
  - no free condition dimension; consumes NM/LP bucket inputs only
- Printing support:
  - none

### `public.v_grookai_value_v1_1`

- Type: active pricing engine view
- Effective key: `card_print_id`
- Input:
  - `public.card_print_active_prices`
- Output columns:
  - `card_print_id`
  - `nm_floor`
  - `nm_median`
  - `listing_count`
  - `confidence`
  - `effective_floor_nm`
  - `w_liquidity`
  - `gv_raw`
  - `conf_factor`
  - `grookai_value_nm`
  - `confidence_out`
- Source assumption:
  - no explicit multi-source semantics
  - the engine assumes a single base price row per `card_print_id`
- Condition support:
  - no variant dimension; only one NM output per canonical print
- Printing support:
  - none

### `public.v_grookai_value_v2`

- Type: present, non-active pricing engine view
- Effective key: `card_print_id`
- Input:
  - `public.card_print_active_prices`
- Source assumption:
  - same one-row-per-card-print assumption as the active lane
- Condition support:
  - still card-level aggregate logic, not variant storage
- Printing support:
  - none

### `public.v_best_prices_all`

- Type: legacy compatibility view
- Effective grain:
  - `card_id`
  - optionally `condition_label`
  - optionally `grade_company + grade_value`
- Inputs:
  - `public.prices`
  - `public.condition_prices`
  - `public.graded_prices`
- Output columns include:
  - `base_market`
  - `condition_label`
  - `cond_market`
  - `grade_company`
  - `grade_value`
  - `grad_market`
- Source assumption:
  - explicit `source` columns exist in parents
  - not the active product surface
- Condition support:
  - yes, via legacy `condition_prices`
- Printing support:
  - none

### `public.v_best_prices_all_gv_v1`

- Type: active app-facing pricing surface
- Effective key: `card_id` (`card_print_id`)
- Inputs:
  - `public.card_print_active_prices`
  - `public.v_grookai_value_v1_1`
- Output columns:
  - `card_id`
  - `base_market`
  - `base_source`
  - `base_ts`
  - `condition_label = null`
  - `cond_market = null`
  - `cond_source = null`
  - `cond_ts = null`
  - `grade_company = null`
  - `grade_value = null`
  - `grade_label = null`
  - `grad_market = null`
  - `grad_source = null`
  - `grad_ts = null`
- Source assumption:
  - output is an app-facing compatibility projection over a single Grookai base value
- Condition support:
  - none in the active output; all condition fields are null
- Printing support:
  - none

## Supporting Pricing Tables Outside The App Surface

These are pricing-relevant tables even though they are not the app-facing read seam requested in the prompt.

### `public.pricing_observations`

- Type: base table
- Primary key: `id`
- Grain:
  - listing-level observation
- Relevant columns:
  - `card_print_id`
  - `source`
  - `external_id`
  - `price`
  - `shipping`
  - `condition_bucket`
  - `mapping_status`
  - `classification`
  - `observed_at`
- Condition support:
  - yes, via `condition_bucket`
- Printing support:
  - none

### `public.card_print_price_curves`

- Type: base table
- Primary key: `id`
- Grain:
  - per-run condition rollup history for one `card_print_id`
- Relevant columns:
  - `card_print_id`
  - `nm_*`
  - `lp_*`
  - `mp_*`
  - `hp_*`
  - `dmg_*`
  - `confidence`
  - `listing_count`
  - `raw_json`
- Condition support:
  - yes, fixed bucket columns
- Printing support:
  - none

## Product Read Surfaces

Current product-facing pricing consumers use:

- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
  - reads `v_best_prices_all_gv_v1`
  - reads `card_print_active_prices`
- `apps/web/src/lib/getPublicCardByGvId.ts`
  - card detail path calls `getPublicPricingByCardIds`
- `lib/card_detail_screen.dart`
  - reads `v_best_prices_all_gv_v1`
  - reads `card_print_active_prices`

This means any contamination of `card_print_active_prices`, `v_grookai_value_v1_1`, or `v_best_prices_all_gv_v1` immediately reaches product surfaces.

## Pricing-Layer Conclusion

Current repo reality is:

- one active price row per `card_print_id`
- one active Grookai base value per `card_print_id`
- eBay-shaped raw bucket inputs
- no printing dimension in the active pricing path
- no JustTCG-specific source domain in the active pricing path

Condition exists historically in legacy tables and minimally in the current observation layer, but the active value path is still card-level and eBay-specific. Printing does not exist anywhere in the active price surfaces.
