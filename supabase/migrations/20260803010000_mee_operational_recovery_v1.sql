-- MEE operational recovery V1.
-- Additive only: run-scoped indexes and an append-only acquisition cursor ledger.

set lock_timeout = '5s';
set statement_timeout = '30min';

create index if not exists market_listing_observations_run_id_idx
  on public.market_listing_observations (acquisition_run_id, id);

create index if not exists market_listing_seller_snapshots_run_id_idx
  on public.market_listing_seller_snapshots (acquisition_run_id, id);

create index if not exists market_listing_card_candidates_observation_idx
  on public.market_listing_card_candidates (observation_id, id);

create table if not exists public.market_listing_acquisition_cursor_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  plan_key text not null,
  run_key text not null,
  acquisition_mode text not null,
  source_manifest_hash text not null,
  cycle_ordinal integer not null,
  batch_ordinal integer not null,
  start_index integer not null,
  next_start_index integer not null,
  source_request_count integer not null,
  selected_request_count integer not null,
  cycle_complete boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_listing_acquisition_cursor_events_source_check
    check (source in ('ebay_active')),
  constraint market_listing_acquisition_cursor_events_mode_check
    check (acquisition_mode in ('rotating_cycle', 'refresh')),
  constraint market_listing_acquisition_cursor_events_ordinals_check
    check (cycle_ordinal > 0 and batch_ordinal > 0),
  constraint market_listing_acquisition_cursor_events_counts_check
    check (
      start_index >= 0
      and next_start_index >= start_index
      and source_request_count >= 0
      and selected_request_count >= 0
      and selected_request_count = next_start_index - start_index
      and next_start_index <= source_request_count
    ),
  constraint market_listing_acquisition_cursor_events_run_unique
    unique (source, plan_key, run_key)
);

create index if not exists market_listing_acquisition_cursor_events_latest_idx
  on public.market_listing_acquisition_cursor_events (
    source,
    plan_key,
    created_at desc,
    id desc
  );

alter table public.market_listing_acquisition_cursor_events enable row level security;

create policy market_listing_acquisition_cursor_events_service_role_insert
  on public.market_listing_acquisition_cursor_events
  for insert
  to service_role
  with check (true);

create policy market_listing_acquisition_cursor_events_service_role_select
  on public.market_listing_acquisition_cursor_events
  for select
  to service_role
  using (true);

revoke all on public.market_listing_acquisition_cursor_events from public, anon, authenticated;
grant select, insert on public.market_listing_acquisition_cursor_events to service_role;

create or replace view public.v_market_listing_acquisition_cursor_latest_v1 as
select
  id,
  source,
  plan_key,
  run_key,
  acquisition_mode,
  source_manifest_hash,
  cycle_ordinal,
  batch_ordinal,
  start_index,
  next_start_index,
  source_request_count,
  selected_request_count,
  cycle_complete,
  created_at
from (
  select
    event.*,
    row_number() over (
      partition by event.source, event.plan_key
      order by event.created_at desc, event.id desc
    ) as row_number
  from public.market_listing_acquisition_cursor_events event
) ranked
where row_number = 1;

revoke all on public.v_market_listing_acquisition_cursor_latest_v1 from public, anon, authenticated;
grant select on public.v_market_listing_acquisition_cursor_latest_v1 to service_role;
