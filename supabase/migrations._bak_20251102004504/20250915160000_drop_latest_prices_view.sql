-- Ensure latest_prices normal view is removed before creating the materialized view in 20250916.
-- This avoids: ERROR: "latest_prices" is not a materialized view (SQLSTATE 42809)

drop materialized view if exists public.latest_prices;
drop view if exists public.latest_prices;
