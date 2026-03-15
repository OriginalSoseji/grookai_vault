# Pricing Surface Contract V1

Canonical product pricing surface:

`v_grookai_value_v1`

All user-facing product pricing must read from this view.

Pipeline layers feeding this view:

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

All other pricing surfaces must use `v_grookai_value_v1`.
