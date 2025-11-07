-- EXPLAIN checks (no ANALYZE)
EXPLAIN select * from public.wall_feed_v order by created_at desc limit 50;

-- TODO: Add real price lookups used by lib/services/price_service.dart
-- Example (adjust to your schema):
-- EXPLAIN select * from public.latest_card_prices_v where card_id = '00000000-0000-0000-0000-000000000000' and condition = 'NM' order by observed_at desc limit 100;

