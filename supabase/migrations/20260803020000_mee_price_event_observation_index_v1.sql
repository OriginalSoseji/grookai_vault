-- MEE price-event run-scoped read performance V1.
-- Additive only: support observation-linked event planning and readback.

set lock_timeout = '5s';
set statement_timeout = '30min';

create index if not exists market_listing_price_events_observation_idx
  on public.market_listing_price_events (observation_id, id);
