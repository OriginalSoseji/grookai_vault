-- MARKET_REFERENCE_SIGNAL_ROLLUPS_V1 guarded dry-run.
-- Purpose: draft schema only for internal reference signal rollup storage.
-- Boundary: no pricing_observations writes, no price rollups into public/app surfaces.
-- This transaction intentionally ends with ROLLBACK.

begin;

create table public.market_reference_signal_rollups (
  id uuid primary key default gen_random_uuid(),
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  gv_id text,
  rollup_version text not null,
  read_model_version text not null,
  review_gate_version text not null,
  rollup_lane text not null default 'internal_reference_signal',
  review_status text not null,
  currency text not null default 'USD',
  reference_low numeric,
  reference_median numeric,
  reference_high numeric,
  source_count integer not null default 0,
  eligible_evidence_count integer not null default 0,
  quarantined_evidence_count integer not null default 0,
  currency_excluded_evidence_count integer not null default 0,
  price_ratio numeric,
  variance_band text,
  review_flags text[] not null default '{}'::text[],
  source_summary jsonb not null default '{}'::jsonb,
  signal_payload jsonb not null default '{}'::jsonb,
  needs_review boolean not null default true,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_reference_signal_rollups_lane_check check (
    rollup_lane = 'internal_reference_signal'
  ),
  constraint market_reference_signal_rollups_review_status_check check (
    review_status in (
      'review_ready_multi_source',
      'review_required_context',
      'review_required_high_variance',
      'review_required_single_source',
      'blocked_special_lane_review',
      'blocked_publishable_leak'
    )
  ),
  constraint market_reference_signal_rollups_currency_check check (currency = 'USD'),
  constraint market_reference_signal_rollups_variance_band_check check (
    variance_band in (
      'bounded_variance',
      'moderate_variance',
      'high_variance',
      'extreme_variance',
      'unknown_variance'
    )
  ),
  constraint market_reference_signal_rollups_counts_nonnegative_check check (
    source_count >= 0
    and eligible_evidence_count >= 0
    and quarantined_evidence_count >= 0
    and currency_excluded_evidence_count >= 0
  ),
  constraint market_reference_signal_rollups_needs_review_check check (needs_review = true),
  constraint market_reference_signal_rollups_not_publishable_check check (publishable = false),
  constraint market_reference_signal_rollups_not_app_visible_check check (app_visible = false),
  constraint market_reference_signal_rollups_not_market_truth_check check (market_truth = false),
  constraint market_reference_signal_rollups_unique_version unique (card_print_id, rollup_version)
);

create index market_reference_signal_rollups_card_idx
  on public.market_reference_signal_rollups (card_print_id);

create index market_reference_signal_rollups_review_status_idx
  on public.market_reference_signal_rollups (review_status);

create index market_reference_signal_rollups_variance_band_idx
  on public.market_reference_signal_rollups (variance_band);

create index market_reference_signal_rollups_rollup_version_idx
  on public.market_reference_signal_rollups (rollup_version);

alter table public.market_reference_signal_rollups enable row level security;

create policy market_reference_signal_rollups_service_role_all
  on public.market_reference_signal_rollups
  for all
  to service_role
  using (true)
  with check (true);

select
  'MARKET_REFERENCE_SIGNAL_ROLLUPS_V1_DRY_RUN'::text as package_id,
  1::int as proposed_table_count,
  4::int as proposed_index_count,
  1::int as proposed_service_role_policy_count,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as publishes_public_prices,
  false::boolean as creates_app_facing_pricing_view,
  false::boolean as creates_market_truth_rollup;

rollback;
