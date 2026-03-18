# Pricing Surface Contract V1

Historical design target named by this contract:

`v_grookai_value_v1`

This file remains in the repository as pricing design history. For current active authority, follow the status section below.

## Current Active Status

As of the current stabilization phase:

- Active canonical pricing engine: `v_grookai_value_v1_1`
- Active app-facing pricing surface: `v_best_prices_all_gv_v1`

`v_grookai_value_v1` and `v_grookai_value_v2` may exist in the repository, but they are not the active pricing authority unless a later explicit cutover contract supersedes this status.

Pipeline layers in the pricing stack:

- `ebay_active_price_snapshots`
- `ebay_active_prices_latest`
- `card_print_price_curves`
- `card_print_active_prices`

Legacy pricing tables and views remain temporarily for safety, but they must not be used by new product code:

- `card_prices`
- `latest_card_prices_v`
- `prices`
- `condition_prices`
- `v_best_prices_all`
- `v_latest_price_pref`

Exception:

- mobile card detail may read `card_print_active_prices` directly for listing detail such as listing count, floor, median, and spread

Current app-facing pricing surfaces must use `v_best_prices_all_gv_v1` during stabilization.
