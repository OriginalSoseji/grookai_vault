-- MARKET_LISTING_WAREHOUSE_V1 migration candidate.
-- Purpose: create internal-only active listing warehouse tables for asking-price evidence.
-- Boundary: no evidence backfill, no provider calls, no public pricing views, no price rollups exposed to the app.
-- This is a local migration candidate, not a remote-applied migration.

begin;

create table public.market_listing_acquisition_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null,
  contract_version text not null,
  source text not null,
  provider_route text not null,
  acquisition_strategy text not null,
  status text not null default 'planned',
  requested_call_ceiling integer not null default 0,
  consumed_call_count integer not null default 0,
  requested_listing_ceiling integer not null default 0,
  observed_listing_count integer not null default 0,
  cached_query_count integer not null default 0,
  error_count integer not null default 0,
  options jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  artifact_paths text[] not null default '{}'::text[],
  artifact_hashes text[] not null default '{}'::text[],
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint market_listing_acquisition_runs_source_check check (source in ('ebay_active')),
  constraint market_listing_acquisition_runs_provider_route_check check (provider_route in ('ebay_browse_api')),
  constraint market_listing_acquisition_runs_status_check check (
    status in ('planned', 'running', 'completed', 'stopped_budget', 'stopped_throttle', 'failed')
  ),
  constraint market_listing_acquisition_runs_nonnegative_counts_check check (
    requested_call_ceiling >= 0
    and consumed_call_count >= 0
    and requested_listing_ceiling >= 0
    and observed_listing_count >= 0
    and cached_query_count >= 0
    and error_count >= 0
  ),
  constraint market_listing_acquisition_runs_run_key_unique unique (run_key)
);

create table public.market_listing_query_cache (
  id uuid primary key default gen_random_uuid(),
  acquisition_run_id uuid null references public.market_listing_acquisition_runs(id) on delete set null,
  source text not null,
  provider_route text not null,
  query_key text not null,
  query_text text not null,
  query_filters jsonb not null default '{}'::jsonb,
  target_hints jsonb not null default '{}'::jsonb,
  page_cursor text,
  result_count integer not null default 0,
  response_hash text,
  cache_status text not null default 'fresh',
  observed_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint market_listing_query_cache_source_check check (source in ('ebay_active')),
  constraint market_listing_query_cache_provider_route_check check (provider_route in ('ebay_browse_api')),
  constraint market_listing_query_cache_status_check check (cache_status in ('fresh', 'reused', 'expired', 'blocked')),
  constraint market_listing_query_cache_result_count_check check (result_count >= 0)
);

create table public.market_listing_raw_snapshots (
  id uuid primary key default gen_random_uuid(),
  acquisition_run_id uuid null references public.market_listing_acquisition_runs(id) on delete set null,
  query_cache_id uuid null references public.market_listing_query_cache(id) on delete set null,
  source text not null,
  provider_route text not null,
  source_listing_id text not null,
  source_url text,
  raw_payload jsonb not null,
  payload_hash text not null,
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint market_listing_raw_snapshots_source_check check (source in ('ebay_active')),
  constraint market_listing_raw_snapshots_provider_route_check check (provider_route in ('ebay_browse_api')),
  constraint market_listing_raw_snapshots_unique_payload unique (source, source_listing_id, payload_hash)
);

create table public.market_listing_observations (
  id uuid primary key default gen_random_uuid(),
  raw_snapshot_id uuid not null references public.market_listing_raw_snapshots(id) on delete cascade,
  acquisition_run_id uuid null references public.market_listing_acquisition_runs(id) on delete set null,
  query_cache_id uuid null references public.market_listing_query_cache(id) on delete set null,
  source text not null,
  source_listing_id text not null,
  listing_url text,
  listing_title text not null,
  listing_status text not null default 'unknown',
  listing_format text not null default 'unknown',
  ask_price numeric,
  shipping_price numeric,
  total_ask_price numeric,
  currency text,
  quantity_available integer,
  quantity_sold integer,
  condition_text text,
  item_location text,
  seller_key text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint market_listing_observations_source_check check (source in ('ebay_active')),
  constraint market_listing_observations_status_check check (
    listing_status in ('active', 'ended', 'unavailable', 'unknown')
  ),
  constraint market_listing_observations_format_check check (
    listing_format in ('fixed_price', 'auction', 'auction_with_bin', 'classified', 'unknown')
  ),
  constraint market_listing_observations_nonnegative_amounts_check check (
    (ask_price is null or ask_price >= 0)
    and (shipping_price is null or shipping_price >= 0)
    and (total_ask_price is null or total_ask_price >= 0)
    and (quantity_available is null or quantity_available >= 0)
    and (quantity_sold is null or quantity_sold >= 0)
  ),
  constraint market_listing_observations_unique_snapshot unique (raw_snapshot_id)
);

create table public.market_listing_seller_snapshots (
  id uuid primary key default gen_random_uuid(),
  acquisition_run_id uuid null references public.market_listing_acquisition_runs(id) on delete set null,
  raw_snapshot_id uuid null references public.market_listing_raw_snapshots(id) on delete set null,
  source text not null,
  seller_key text not null,
  seller_username text,
  feedback_score integer,
  feedback_percentage numeric,
  seller_location text,
  store_name text,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint market_listing_seller_snapshots_source_check check (source in ('ebay_active')),
  constraint market_listing_seller_snapshots_feedback_score_check check (feedback_score is null or feedback_score >= 0),
  constraint market_listing_seller_snapshots_feedback_percentage_check check (
    feedback_percentage is null or (feedback_percentage >= 0 and feedback_percentage <= 100)
  ),
  constraint market_listing_seller_snapshots_unique_snapshot unique (source, seller_key, observed_at)
);

create table public.market_listing_card_candidates (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.market_listing_observations(id) on delete cascade,
  raw_snapshot_id uuid null references public.market_listing_raw_snapshots(id) on delete set null,
  card_print_id uuid null references public.card_prints(id) on delete cascade,
  gv_id text,
  source text not null,
  source_listing_id text not null,
  match_version text not null,
  match_status text not null default 'needs_review',
  match_confidence numeric,
  title_features jsonb not null default '{}'::jsonb,
  set_features jsonb not null default '{}'::jsonb,
  number_features jsonb not null default '{}'::jsonb,
  finish_features jsonb not null default '{}'::jsonb,
  condition_features jsonb not null default '{}'::jsonb,
  exclusion_flags text[] not null default '{}'::text[],
  needs_review boolean not null default true,
  can_publish_price_directly boolean not null default false,
  candidate_hash text not null,
  created_at timestamptz not null default now(),
  constraint market_listing_card_candidates_source_check check (source in ('ebay_active')),
  constraint market_listing_card_candidates_status_check check (
    match_status in ('needs_review', 'blocked', 'reviewed_candidate', 'rejected')
  ),
  constraint market_listing_card_candidates_confidence_check check (
    match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)
  ),
  constraint market_listing_card_candidates_needs_review_check check (needs_review = true),
  constraint market_listing_card_candidates_no_direct_publish_check check (can_publish_price_directly = false),
  constraint market_listing_card_candidates_unique_hash unique (source, candidate_hash)
);

create table public.market_listing_price_events (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.market_listing_observations(id) on delete cascade,
  source text not null,
  source_listing_id text not null,
  event_type text not null,
  previous_observation_id uuid null references public.market_listing_observations(id) on delete set null,
  previous_total_ask_price numeric,
  current_total_ask_price numeric,
  currency text,
  event_payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint market_listing_price_events_source_check check (source in ('ebay_active')),
  constraint market_listing_price_events_type_check check (
    event_type in (
      'first_seen',
      'price_changed',
      'shipping_changed',
      'quantity_changed',
      'title_changed',
      'ended',
      'relisted',
      'unavailable'
    )
  ),
  constraint market_listing_price_events_nonnegative_amounts_check check (
    (previous_total_ask_price is null or previous_total_ask_price >= 0)
    and (current_total_ask_price is null or current_total_ask_price >= 0)
  )
);

create table public.market_listing_rollups (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid null references public.card_prints(id) on delete cascade,
  gv_id text,
  source text not null,
  rollup_version text not null,
  rollup_window text not null,
  listing_count integer not null default 0,
  seller_count integer not null default 0,
  median_active_ask numeric,
  trimmed_low_active_ask numeric,
  trimmed_high_active_ask numeric,
  minimum_active_ask numeric,
  maximum_active_ask numeric,
  currency text,
  stale_listing_count integer not null default 0,
  reviewed_candidate_count integer not null default 0,
  exclusion_counts jsonb not null default '{}'::jsonb,
  rollup_payload jsonb not null default '{}'::jsonb,
  needs_review boolean not null default true,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint market_listing_rollups_source_check check (source in ('ebay_active')),
  constraint market_listing_rollups_window_check check (rollup_window in ('daily', 'weekly', 'monthly', 'manual')),
  constraint market_listing_rollups_nonnegative_counts_check check (
    listing_count >= 0
    and seller_count >= 0
    and stale_listing_count >= 0
    and reviewed_candidate_count >= 0
  ),
  constraint market_listing_rollups_nonnegative_amounts_check check (
    (median_active_ask is null or median_active_ask >= 0)
    and (trimmed_low_active_ask is null or trimmed_low_active_ask >= 0)
    and (trimmed_high_active_ask is null or trimmed_high_active_ask >= 0)
    and (minimum_active_ask is null or minimum_active_ask >= 0)
    and (maximum_active_ask is null or maximum_active_ask >= 0)
  ),
  constraint market_listing_rollups_internal_only_check check (
    needs_review = true
    and publishable = false
    and app_visible = false
    and market_truth = false
  ),
  constraint market_listing_rollups_unique_version unique (source, rollup_version, rollup_window, card_print_id)
);

create index market_listing_acquisition_runs_source_status_idx
  on public.market_listing_acquisition_runs (source, status, created_at desc);

create index market_listing_query_cache_source_query_idx
  on public.market_listing_query_cache (source, query_key, observed_at desc);

create unique index market_listing_query_cache_query_unique_idx
  on public.market_listing_query_cache (source, provider_route, query_key, coalesce(page_cursor, ''));

create index market_listing_query_cache_run_idx
  on public.market_listing_query_cache (acquisition_run_id);

create index market_listing_raw_snapshots_listing_idx
  on public.market_listing_raw_snapshots (source, source_listing_id, observed_at desc);

create index market_listing_raw_snapshots_run_idx
  on public.market_listing_raw_snapshots (acquisition_run_id);

create index market_listing_raw_snapshots_query_idx
  on public.market_listing_raw_snapshots (query_cache_id);

create index market_listing_observations_listing_idx
  on public.market_listing_observations (source, source_listing_id, observed_at desc);

create index market_listing_observations_seller_idx
  on public.market_listing_observations (source, seller_key, observed_at desc);

create index market_listing_seller_snapshots_seller_idx
  on public.market_listing_seller_snapshots (source, seller_key, observed_at desc);

create index market_listing_card_candidates_card_idx
  on public.market_listing_card_candidates (card_print_id, match_status, created_at desc);

create index market_listing_card_candidates_listing_idx
  on public.market_listing_card_candidates (source, source_listing_id);

create index market_listing_price_events_listing_idx
  on public.market_listing_price_events (source, source_listing_id, observed_at desc);

create index market_listing_price_events_type_idx
  on public.market_listing_price_events (event_type, observed_at desc);

create index market_listing_rollups_card_idx
  on public.market_listing_rollups (card_print_id, source, rollup_version);

alter table public.market_listing_acquisition_runs enable row level security;
alter table public.market_listing_query_cache enable row level security;
alter table public.market_listing_raw_snapshots enable row level security;
alter table public.market_listing_observations enable row level security;
alter table public.market_listing_seller_snapshots enable row level security;
alter table public.market_listing_card_candidates enable row level security;
alter table public.market_listing_price_events enable row level security;
alter table public.market_listing_rollups enable row level security;

create policy market_listing_acquisition_runs_service_role_all
  on public.market_listing_acquisition_runs
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_query_cache_service_role_all
  on public.market_listing_query_cache
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_raw_snapshots_service_role_all
  on public.market_listing_raw_snapshots
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_observations_service_role_all
  on public.market_listing_observations
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_seller_snapshots_service_role_all
  on public.market_listing_seller_snapshots
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_card_candidates_service_role_all
  on public.market_listing_card_candidates
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_price_events_service_role_all
  on public.market_listing_price_events
  for all
  to service_role
  using (true)
  with check (true);

create policy market_listing_rollups_service_role_all
  on public.market_listing_rollups
  for all
  to service_role
  using (true)
  with check (true);

select
  'MARKET_LISTING_WAREHOUSE_V1_MIGRATION_CANDIDATE'::text as package_id,
  8::int as proposed_table_count,
  15::int as proposed_index_count,
  8::int as proposed_service_role_policy_count,
  true::boolean as active_listings_are_asking_price_only,
  false::boolean as creates_public_surface,
  false::boolean as creates_app_visible_rows,
  false::boolean as creates_external_fetch_job,
  false::boolean as changes_identity_rows,
  false::boolean as changes_vault_rows,
  false::boolean as changes_image_rows;

commit;
