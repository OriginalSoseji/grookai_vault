# Grookai Pricing Index v1 Contract

## Pipeline Overview
The pricing engine now follows a three-layer architecture:

1. **Raw observations** – `public.price_observations`  
   - Stores every sale/listing with `card_print_id`, marketplace metadata (`marketplace_id`, `order_id`, `listing_type`, etc.), and `price_usd`.  
   - Only rows with non-null `card_print_id`, `price_usd`, and `observed_at` participate in downstream aggregates.

2. **Aggregates layer** – `public.price_aggregates_v1` (materialized view)  
   - Built from raw observations during MV refresh.  
   - Computes 30d, 90d, and 365d windows per `card_print_id` with floor, median (percentile_cont 0.5), mean, volatility (stddev_pop), sale counts, and last-sale metadata.  
   - Refresh via `REFRESH MATERIALIZED VIEW CONCURRENTLY public.price_aggregates_v1;`.

3. **Index layer** – `public.price_index_v1` (view)  
   - Selects a single record per `card_print_id` based on window priority (30d → 90d → 365d).  
   - Exposes canonical fields (`price`, `floor`, `volatility`, `confidence`, `window_used`, `sale_count`, `last_sale_price`, `last_sale_timestamp`).  
   - Confidence tiers:  
     - **HIGH:** 30d window, sale_count ≥ 10, volatility present.  
     - **MEDIUM:** 30d or 90d window, sale_count ≥ 5 (but not HIGH).  
     - **LOW:** 365d window or any window with <5 sales (fallback).

## Window Rules
- **30d window** – `observed_at >= now() - interval '30 days'`; primary source for HIGH/MEDIUM signals.  
- **90d window** – fallback if 30d lacks ≥5 sales; still MEDIUM confidence if sale_count ≥5.  
- **365d window** – thin-market fallback; sale_count ≥1 yields LOW confidence.

## Refresh Strategy
- `price_observations` is continuously appended by workers (e.g., `ebay_self`).  
- A scheduler/worker (future task) will periodically run:  
  `REFRESH MATERIALIZED VIEW CONCURRENTLY public.price_aggregates_v1;`  
- `price_index_v1` is a regular view and always reflects the last refreshed aggregates.  
- Frontend/API consumers should read from `price_index_v1` for canonical pricing metrics and may join back to `price_aggregates_v1` for multi-window detail.

## References
- Schema contract: `docs/GV_SCHEMA_CONTRACT_V1.md` (card_print identity, price_observations definition).  
- Pricing audit context: `docs/AUDIT_PRICING_ENGINE_L2.md`.  
- Future tasks: mapping enforcement (non-null `card_print_id`), MV refresh workers, and API exposure.
