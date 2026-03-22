# VARIANT_SUPPORT_AUDIT

## Scope

Repository-grounded audit of whether Grookai currently supports condition-level, printing-level, or variant-level pricing.

Files inspected:

- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20251213153627_baseline_views.sql`
- `supabase/migrations/20260304070000_printing_layer_v1.sql`
- `supabase/migrations/20260319150000_pricing_observations_v1.sql`
- `supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql`
- `supabase/migrations/20260315233000_reconcile_pricing_compatibility_lane_to_v1_1.sql`
- `apps/web/src/lib/pricing/getPublicPricingByCardIds.ts`
- `apps/web/src/lib/pricing/getReferencePricing.ts`

## Question 1: Does Grookai support condition-level pricing?

### Answer

PARTIAL, but not in the active product pricing engine.

### Evidence

- `pricing_observations` has `condition_bucket` with allowed values:
  - `nm`
  - `lp`
  - `mp`
  - `hp`
  - `dmg`
- `card_print_price_curves` stores per-condition medians/floors/samples
- legacy `condition_prices` and `v_best_prices_all` carry condition fields
- active truth surface `v_best_prices_all_gv_v1` sets:
  - `condition_label = null`
  - `cond_market = null`

### Verdict

Condition information exists in the repo, but the active app-facing value lane still emits one card-level base price and no active condition output.

## Question 2: Does Grookai support printing-level pricing?

### Answer

FALSE in the active pricing lane.

### Evidence

- `card_printings` exists and is keyed by `(card_print_id, finish_key)`
- `external_printing_mappings` exists for finish-child identity
- no active pricing table or view joins `card_printings`
- `card_print_active_prices`, `v_grookai_value_v1_1`, and `v_best_prices_all_gv_v1` contain no printing key
- web/mobile pricing reads do not request a printing-level price surface

### Verdict

Printing identity exists structurally, but printing-level pricing does not.

## Question 3: Does Grookai support variant-level pricing?

### Answer

FALSE.

### Evidence

- active price surfaces are one-row-per-`card_print_id`
- `v_grookai_value_v1_1` computes one `grookai_value_nm` per `card_print_id`
- `v_best_prices_all_gv_v1` outputs one `base_market` per `card_id`
- no active table stores a `(condition + printing)` market row
- `getReferencePricing.ts` consumes JustTCG variants directly from API response and selects in memory; it does not read a variant storage table

### Verdict

Grookai currently has no active variant pricing layer.

## JustTCG Implication

JustTCG variants are the primary market unit, and the documented variant dimensions are:

- `condition`
- `printing`

Current Grookai pricing reality does not have a place in the active truth lane for that unit.

## Final Verdict

```text
condition-level pricing: PARTIAL
printing-level pricing: FALSE
variant-level pricing: FALSE
```

Expected result confirmed:

- Grookai does not currently support JustTCG-style variant pricing in the active pricing domain.
