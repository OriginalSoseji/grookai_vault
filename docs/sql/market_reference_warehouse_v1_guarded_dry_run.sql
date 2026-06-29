-- MARKET_REFERENCE_WAREHOUSE_V1 guarded dry-run.
-- Purpose: draft schema only for free-reference Market Evidence Engine storage.
-- Boundary: no pricing_observations writes, no price rollups, no app-facing pricing views.
-- This transaction intentionally ends with ROLLBACK.

begin;

create table public.market_reference_acquisition_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null,
  contract_version text not null,
  source_phase text not null,
  source_list text[] not null default '{}'::text[],
  batch_artifact_path text,
  batch_artifact_hash text,
  input_artifact_paths text[] not null default '{}'::text[],
  options jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint market_reference_acquisition_runs_source_phase_check check (
    source_phase in (
      'MEE-06A_POKEMONTCG_IO_REFERENCE_EVIDENCE_V1',
      'MEE-06B_TCGCSV_REFERENCE_EVIDENCE_V1',
      'MEE-06C_NORMALIZED_REFERENCE_EVIDENCE_V1',
      'MEE-06D_FREE_REFERENCE_COVERAGE_GAP_V1'
    )
  ),
  constraint market_reference_acquisition_runs_run_key_unique unique (run_key)
);

create table public.market_reference_raw_snapshots (
  id uuid primary key default gen_random_uuid(),
  acquisition_run_id uuid null references public.market_reference_acquisition_runs(id) on delete set null,
  source text not null,
  source_object_type text not null,
  source_object_id text not null,
  source_url text,
  raw_payload jsonb not null,
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  payload_hash text not null,
  created_at timestamptz not null default now(),
  constraint market_reference_raw_snapshots_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference')
  ),
  constraint market_reference_raw_snapshots_object_type_check check (
    source_object_type in (
      'tcgcsv_group_products',
      'tcgcsv_group_prices',
      'tcgcsv_product',
      'tcgcsv_price_row',
      'pokemontcg_card'
    )
  ),
  constraint market_reference_raw_snapshots_unique_payload unique (
    source,
    source_object_type,
    source_object_id,
    payload_hash
  )
);

create table public.market_reference_candidates (
  id uuid primary key default gen_random_uuid(),
  acquisition_run_id uuid null references public.market_reference_acquisition_runs(id) on delete set null,
  raw_snapshot_id uuid null references public.market_reference_raw_snapshots(id) on delete set null,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  gv_id text not null,
  source text not null,
  source_type text not null default 'reference',
  source_url text,
  raw_title text,
  raw_price numeric,
  currency text,
  condition_hint text,
  finish_hint text,
  observed_at timestamptz not null,
  match_confidence_hint text not null default 'unreviewed',
  exclusion_flags text[] not null default '{}'::text[],
  needs_review boolean not null default true,
  can_publish_price_directly boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  candidate_hash text not null,
  created_at timestamptz not null default now(),
  constraint market_reference_candidates_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference')
  ),
  constraint market_reference_candidates_source_type_check check (source_type = 'reference'),
  constraint market_reference_candidates_needs_review_check check (needs_review = true),
  constraint market_reference_candidates_no_direct_publish_check check (can_publish_price_directly = false),
  constraint market_reference_candidates_unique_hash unique (source, candidate_hash)
);

create table public.market_reference_normalized_evidence (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.market_reference_candidates(id) on delete cascade,
  card_print_id uuid not null references public.card_prints(id) on delete cascade,
  source text not null,
  normalizer_version text not null,
  metric_key text,
  metric_family text,
  normalized_price numeric,
  normalized_currency text,
  model_disposition text not null,
  model_eligible boolean not null default false,
  evidence_quality_score numeric,
  weight_hint numeric,
  quality_flags text[] not null default '{}'::text[],
  group_reference_median numeric,
  normalized_payload jsonb not null default '{}'::jsonb,
  normalized_at timestamptz not null default now(),
  constraint market_reference_normalized_evidence_source_check check (
    source in ('tcgcsv_reference', 'pokemontcg_io_reference')
  ),
  constraint market_reference_normalized_evidence_disposition_check check (
    model_disposition in (
      'reference_model_candidate',
      'quarantined_metric',
      'quarantined_price_outlier',
      'blocked_candidate'
    )
  ),
  constraint market_reference_normalized_evidence_unique_version unique (
    candidate_id,
    normalizer_version
  )
);

create table public.market_reference_coverage_reports (
  id uuid primary key default gen_random_uuid(),
  report_key text not null,
  contract_version text not null,
  batch_artifact_path text,
  tcgcsv_artifact_path text,
  pokemontcg_io_artifact_path text,
  target_count integer not null default 0,
  covered_target_count integer not null default 0,
  uncovered_target_count integer not null default 0,
  source_summary jsonb not null default '{}'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  samples jsonb not null default '{}'::jsonb,
  artifact_path text,
  report_hash text not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint market_reference_coverage_reports_nonnegative_counts_check check (
    target_count >= 0
    and covered_target_count >= 0
    and uncovered_target_count >= 0
  ),
  constraint market_reference_coverage_reports_report_key_unique unique (report_key)
);

create index market_reference_raw_snapshots_source_object_idx
  on public.market_reference_raw_snapshots (source, source_object_type, source_object_id);

create index market_reference_raw_snapshots_source_hash_idx
  on public.market_reference_raw_snapshots (source, payload_hash);

create index market_reference_raw_snapshots_run_idx
  on public.market_reference_raw_snapshots (acquisition_run_id);

create index market_reference_raw_snapshots_observed_idx
  on public.market_reference_raw_snapshots (observed_at desc);

create index market_reference_candidates_card_source_observed_idx
  on public.market_reference_candidates (card_print_id, source, observed_at desc);

create index market_reference_candidates_source_hash_idx
  on public.market_reference_candidates (source, candidate_hash);

create index market_reference_candidates_run_idx
  on public.market_reference_candidates (acquisition_run_id);

create index market_reference_candidates_raw_snapshot_idx
  on public.market_reference_candidates (raw_snapshot_id);

create index market_reference_normalized_evidence_candidate_idx
  on public.market_reference_normalized_evidence (candidate_id);

create index market_reference_normalized_evidence_card_source_model_idx
  on public.market_reference_normalized_evidence (card_print_id, source, model_eligible);

create index market_reference_normalized_evidence_version_idx
  on public.market_reference_normalized_evidence (normalizer_version);

create index market_reference_normalized_evidence_disposition_idx
  on public.market_reference_normalized_evidence (model_disposition);

alter table public.market_reference_acquisition_runs enable row level security;
alter table public.market_reference_raw_snapshots enable row level security;
alter table public.market_reference_candidates enable row level security;
alter table public.market_reference_normalized_evidence enable row level security;
alter table public.market_reference_coverage_reports enable row level security;

create policy market_reference_acquisition_runs_service_role_all
  on public.market_reference_acquisition_runs
  for all
  to service_role
  using (true)
  with check (true);

create policy market_reference_raw_snapshots_service_role_all
  on public.market_reference_raw_snapshots
  for all
  to service_role
  using (true)
  with check (true);

create policy market_reference_candidates_service_role_all
  on public.market_reference_candidates
  for all
  to service_role
  using (true)
  with check (true);

create policy market_reference_normalized_evidence_service_role_all
  on public.market_reference_normalized_evidence
  for all
  to service_role
  using (true)
  with check (true);

create policy market_reference_coverage_reports_service_role_all
  on public.market_reference_coverage_reports
  for all
  to service_role
  using (true)
  with check (true);

select
  'MARKET_REFERENCE_WAREHOUSE_V1_DRY_RUN'::text as package_id,
  5::int as proposed_table_count,
  12::int as proposed_index_count,
  5::int as proposed_service_role_policy_count,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as publishes_public_prices,
  false::boolean as creates_app_facing_pricing_view;

rollback;
