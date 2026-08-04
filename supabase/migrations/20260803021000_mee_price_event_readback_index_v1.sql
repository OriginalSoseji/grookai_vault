-- MEE run-scoped price-event readback performance V1.
-- Additive only: keep evidence-class aggregation on the index path.

set lock_timeout = '5s';
set statement_timeout = '30min';

create index if not exists market_listing_price_events_observation_evidence_idx
  on public.market_listing_price_events (
    observation_id,
    ((event_payload ->> 'listing_evidence_class'))
  );
