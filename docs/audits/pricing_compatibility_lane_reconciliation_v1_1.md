# Pricing Compatibility Lane Reconciliation V1.1

Purpose:
- reconcile repo migration truth with the current production compatibility lane

Facts:
- production had already been manually switched so `public.v_best_prices_all_gv_v1` reads from `public.v_grookai_value_v1_1`
- repo history still pointed that compatibility view at `public.v_grookai_value_v1`

This migration restores alignment by updating only the compatibility view:
- `public.v_best_prices_all_gv_v1`
- source engine: `public.v_grookai_value_v1_1`
- emitted source label: `grookai.value.v1_1`

Scope:
- reconciliation only
- no engine view changes
- no worker changes
- no web code changes
