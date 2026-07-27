-- TCGPLAYER_MARKET_PUBLICATION_V1
-- Production V1 publishes the exact TCGPlayer marketPrice for qualified
-- English Pokemon printings. It never calculates a Grookai Value.

begin;

create or replace function public.normalize_tcgplayer_market_subtype_v1(raw_subtype text)
returns text
language sql
immutable
parallel safe
as $$
  select case lower(btrim(coalesce(raw_subtype, '')))
    when 'normal' then 'normal'
    when 'holofoil' then 'holo'
    when 'reverse holofoil' then 'reverse'
    else null
  end;
$$;

comment on function public.normalize_tcgplayer_market_subtype_v1(text) is
  'Maps only unambiguous ordinary TCGPlayer price subtypes to canonical finish keys. Edition and special-finish subtypes intentionally abstain.';

-- These established production reference values were absent from the local
-- migration ledger even though ordinary printing contracts already depend on
-- them. Reconcile the ledger before adding the governed market publication path.
insert into public.finish_keys (key, label, sort_order, is_active, meta)
values
  ('normal', 'Normal', 10, true, '{}'::jsonb),
  ('reverse', 'Reverse Holo', 20, true, '{}'::jsonb),
  ('holo', 'Holo', 30, true, '{}'::jsonb)
on conflict (key) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

alter table public.market_evidence_variant_assignments
  drop constraint if exists market_evidence_variant_assignments_source_family_check;
alter table public.market_evidence_variant_assignments
  add constraint market_evidence_variant_assignments_source_family_check check (
    source_family in ('market_reference', 'market_listing', 'tcgcsv_market_close')
  );

alter table public.market_evidence_variant_assignments
  drop constraint if exists market_evidence_variant_assignments_source_table_check;
alter table public.market_evidence_variant_assignments
  add constraint market_evidence_variant_assignments_source_table_check check (
    source_table in (
      'market_reference_candidates',
      'market_listing_card_candidates',
      'tcgcsv_source_price_daily_observations'
    )
  );

create table if not exists public.market_price_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  pipeline_version text not null,
  policy_version text not null,
  run_mode text not null,
  source_name text not null default 'tcgplayer',
  source_observed_on date,
  source_sync_run_id uuid
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_artifact_hash text,
  source_marker text,
  state text not null default 'planned',
  current_phase text,
  reconciliation_state text not null default 'pending',
  selected_count integer not null default 0,
  mapped_count integer not null default 0,
  excluded_count integer not null default 0,
  quarantined_count integer not null default 0,
  delayed_count integer not null default 0,
  suppressed_count integer not null default 0,
  eligible_count integer not null default 0,
  snapshot_count integer not null default 0,
  required_phase_count integer not null default 0,
  succeeded_phase_count integer not null default 0,
  git_commit_sha text not null,
  worker_version text not null,
  schema_version text not null,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_classification text,
  error text,
  resumability_data jsonb not null default '{}'::jsonb,
  reconciliation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_price_pipeline_runs_source_check
    check (source_name = 'tcgplayer'),
  constraint market_price_pipeline_runs_mode_check
    check (run_mode in ('dry_run', 'shadow', 'canary', 'production')),
  constraint market_price_pipeline_runs_state_check check (
    state in (
      'planned',
      'running',
      'qualified',
      'reconciled',
      'shadow_verified',
      'published',
      'verified',
      'failed',
      'rolled_back'
    )
  ),
  constraint market_price_pipeline_runs_reconciliation_check
    check (reconciliation_state in ('pending', 'reconciled', 'mismatch')),
  constraint market_price_pipeline_runs_counts_check check (
    selected_count >= 0
    and mapped_count >= 0
    and excluded_count >= 0
    and quarantined_count >= 0
    and delayed_count >= 0
    and suppressed_count >= 0
    and eligible_count >= 0
    and snapshot_count >= 0
    and required_phase_count >= 0
    and succeeded_phase_count >= 0
    and succeeded_phase_count <= required_phase_count
  )
);

create index if not exists market_price_pipeline_runs_latest_idx
  on public.market_price_pipeline_runs(created_at desc, id desc);

create index if not exists market_price_pipeline_runs_state_idx
  on public.market_price_pipeline_runs(state, created_at desc);

create table if not exists public.market_price_pipeline_phase_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  run_key text not null,
  phase_name text not null,
  attempt integer not null,
  state text not null,
  source_observed_on date,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_artifact_hash text,
  started_at timestamptz not null,
  completed_at timestamptz,
  input_count integer not null default 0,
  output_count integer not null default 0,
  reconciled_count integer not null default 0,
  excluded_count integer not null default 0,
  quarantined_count integer not null default 0,
  error_classification text,
  error text,
  resumability_data jsonb not null default '{}'::jsonb,
  code_version text not null,
  created_at timestamptz not null default now(),
  constraint market_price_pipeline_phase_attempts_attempt_check
    check (attempt > 0),
  constraint market_price_pipeline_phase_attempts_state_check
    check (state in ('started', 'succeeded', 'failed', 'skipped')),
  constraint market_price_pipeline_phase_attempts_counts_check check (
    input_count >= 0
    and output_count >= 0
    and reconciled_count >= 0
    and excluded_count >= 0
    and quarantined_count >= 0
  )
);

create index if not exists market_price_pipeline_phase_attempts_latest_idx
  on public.market_price_pipeline_phase_attempts(
    run_id,
    phase_name,
    attempt desc,
    created_at desc,
    id desc
  );

create table if not exists public.market_price_publication_sets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique
    references public.market_price_pipeline_runs(id) on delete restrict,
  run_key text not null unique,
  publication_state text not null default 'staging',
  expected_snapshot_count integer not null default 0,
  previous_publication_set_id uuid
    references public.market_price_publication_sets(id) on delete restrict,
  published_at timestamptz,
  superseded_at timestamptz,
  rolled_back_at timestamptz,
  rollback_reason text,
  reconciliation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_price_publication_sets_state_check check (
    publication_state in (
      'staging',
      'published',
      'superseded',
      'rolled_back',
      'failed'
    )
  ),
  constraint market_price_publication_sets_count_check
    check (expected_snapshot_count >= 0)
);

create table if not exists public.market_price_current_publication (
  singleton boolean primary key default true check (singleton),
  publication_set_id uuid not null
    references public.market_price_publication_sets(id) on delete restrict,
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  previous_publication_set_id uuid
    references public.market_price_publication_sets(id) on delete restrict,
  activated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_price_publication_events (
  id uuid primary key default gen_random_uuid(),
  publication_set_id uuid not null
    references public.market_price_publication_sets(id) on delete restrict,
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  event_type text not null,
  prior_publication_set_id uuid
    references public.market_price_publication_sets(id) on delete restrict,
  reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint market_price_publication_events_type_check
    check (event_type in ('activated', 'superseded', 'rolled_back', 'restored'))
);

create table if not exists public.market_price_pipeline_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid not null
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_price_row_identity text not null,
  source_row_hash text not null,
  source_product_id integer not null,
  source_subtype_name text not null,
  source_mapping_id bigint
    references public.external_mappings(id) on delete restrict,
  variant_assignment_id uuid
    references public.market_evidence_variant_assignments(id) on delete restrict,
  card_print_id uuid references public.card_prints(id) on delete restrict,
  card_printing_id uuid references public.card_printings(id) on delete restrict,
  candidate_hash text not null,
  candidate_payload jsonb not null,
  staged_at timestamptz not null default now(),
  constraint market_price_pipeline_candidates_payload_check
    check (jsonb_typeof(candidate_payload) = 'object'),
  constraint market_price_pipeline_candidates_run_source_unique
    unique (run_id, source_observation_id),
  constraint market_price_pipeline_candidates_run_hash_unique
    unique (run_id, candidate_hash)
);

create index if not exists market_price_pipeline_candidates_run_idx
  on public.market_price_pipeline_candidates(run_id, source_product_id, source_subtype_name);

create table if not exists public.market_price_qualification_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_key text not null unique,
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  pipeline_candidate_id uuid not null
    references public.market_price_pipeline_candidates(id) on delete restrict,
  run_key text not null,
  phase_attempt_id uuid
    references public.market_price_pipeline_phase_attempts(id) on delete restrict,
  policy_version text not null,
  source_name text not null default 'tcgplayer',
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_artifact_date date,
  source_artifact_hash text,
  source_price_row_identity text not null,
  source_row_hash text not null,
  source_mapping_id bigint references public.external_mappings(id) on delete restrict,
  candidate_mapping_identity text,
  variant_assignment_id uuid
    references public.market_evidence_variant_assignments(id) on delete restrict,
  variant_assignment_status text,
  variant_assignment_version text,
  mapping_method text,
  mapping_confidence numeric(5,4),
  card_print_id uuid references public.card_prints(id) on delete restrict,
  card_printing_id uuid references public.card_printings(id) on delete restrict,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  source_product_id integer not null,
  source_subtype_name text not null,
  source_observed_on date not null,
  source_sync_finished_at timestamptz,
  currency text,
  market_price numeric,
  decision text not null,
  eligible boolean not null,
  publication_lane text not null,
  language_result text not null,
  finish_result text not null,
  source_integrity_result text not null,
  duplicate_product_result text not null,
  freshness_result text not null,
  reason_codes text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  evaluated_at timestamptz not null default now(),
  code_version text not null,
  migration_version text not null default '20260727120000',
  constraint market_price_qualification_decisions_source_check
    check (source_name = 'tcgplayer'),
  constraint market_price_qualification_decisions_decision_check
    check (decision in ('publish', 'delay', 'quarantine', 'exclude', 'suppress_stale')),
  constraint market_price_qualification_decisions_lane_check check (
    publication_lane in (
      'current',
      'freshness_delayed',
      'quarantine',
      'excluded',
      'suppressed_stale'
    )
  ),
  constraint market_price_qualification_decisions_language_check check (
    language_result in ('english', 'non_english', 'ambiguous', 'missing')
  ),
  constraint market_price_qualification_decisions_finish_check check (
    finish_result in ('exact_child_finish', 'unsupported', 'ambiguous', 'missing')
  ),
  constraint market_price_qualification_decisions_integrity_check check (
    source_integrity_result in ('passed', 'failed', 'missing')
  ),
  constraint market_price_qualification_decisions_duplicate_check check (
    duplicate_product_result in ('unique', 'duplicate', 'ambiguous', 'missing')
  ),
  constraint market_price_qualification_decisions_freshness_check check (
    freshness_result in ('fresh', 'delayed', 'suppressed_stale', 'missing')
  ),
  constraint market_price_qualification_decisions_eligibility_check
    check (
      (
        decision = 'publish'
        and publication_lane = 'current'
        and freshness_result = 'fresh'
        and eligible = true
        and cardinality(reason_codes) = 0
      )
      or
      (
        decision <> 'publish'
        and publication_lane <> 'current'
        and eligible = false
        and cardinality(reason_codes) > 0
      )
    )
);

create index if not exists market_price_qualification_run_idx
  on public.market_price_qualification_decisions(run_id, evaluated_at desc);

create index if not exists market_price_qualification_printing_idx
  on public.market_price_qualification_decisions(card_printing_id, evaluated_at desc, id desc)
  where card_printing_id is not null;

create index if not exists market_price_qualification_source_idx
  on public.market_price_qualification_decisions(source_observation_id, policy_version);

create index if not exists market_price_qualification_reasons_idx
  on public.market_price_qualification_decisions using gin(reason_codes);

create table if not exists public.market_price_publication_snapshots (
  id uuid primary key default gen_random_uuid(),
  provenance_id uuid not null default gen_random_uuid() unique,
  publication_set_id uuid not null
    references public.market_price_publication_sets(id) on delete restrict,
  run_id uuid not null
    references public.market_price_pipeline_runs(id) on delete restrict,
  phase_attempt_id uuid
    references public.market_price_pipeline_phase_attempts(id) on delete restrict,
  qualification_decision_id uuid not null
    references public.market_price_qualification_decisions(id) on delete restrict,
  policy_version text not null,
  snapshot_schema_version text not null default 'MARKET_PRICE_PUBLICATION_SNAPSHOT_V1',
  source_name text not null default 'tcgplayer',
  source_label text not null default 'TCGPlayer Market',
  source_observation_id uuid not null
    references public.tcgcsv_source_price_daily_observations(id) on delete restrict,
  source_sync_run_id uuid not null
    references public.tcgcsv_source_sync_runs(id) on delete restrict,
  source_artifact_id uuid
    references public.tcgcsv_source_artifacts(id) on delete restrict,
  source_artifact_date date,
  source_artifact_hash text not null,
  source_price_row_identity text not null,
  source_row_hash text not null,
  source_mapping_id bigint not null
    references public.external_mappings(id) on delete restrict,
  variant_assignment_id uuid not null
    references public.market_evidence_variant_assignments(id) on delete restrict,
  source_product_id integer not null,
  source_subtype_name text not null,
  source_observed_on date not null,
  source_sync_finished_at timestamptz not null,
  card_print_id uuid not null references public.card_prints(id) on delete restrict,
  card_printing_id uuid not null references public.card_printings(id) on delete restrict,
  gv_id text not null,
  printing_gv_id text not null,
  finish_key text not null,
  currency text not null,
  market_price numeric not null,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  observed_at timestamptz not null,
  qualified_at timestamptz not null,
  published_at timestamptz not null default now(),
  freshness_state text not null,
  publication_state text not null default 'published',
  code_version text not null,
  constraint market_price_publication_source_check
    check (source_name = 'tcgplayer' and source_label = 'TCGPlayer Market'),
  constraint market_price_publication_currency_check check (currency = 'USD'),
  constraint market_price_publication_market_price_check check (market_price > 0),
  constraint market_price_publication_freshness_check
    check (freshness_state = 'fresh'),
  constraint market_price_publication_state_check
    check (publication_state = 'published'),
  constraint market_price_publication_supporting_prices_check check (
    (low_price is null or low_price >= 0)
    and (mid_price is null or mid_price >= 0)
    and (high_price is null or high_price >= 0)
    and (direct_low_price is null or direct_low_price >= 0)
  ),
  constraint market_price_publication_source_printing_policy_key unique (
    publication_set_id,
    source_observation_id,
    card_printing_id,
    policy_version
  )
);

create index if not exists market_price_publication_printing_current_idx
  on public.market_price_publication_snapshots(card_printing_id, source_sync_finished_at desc, published_at desc);

create index if not exists market_price_publication_card_current_idx
  on public.market_price_publication_snapshots(card_print_id, source_sync_finished_at desc, published_at desc);

create index if not exists market_price_publication_history_idx
  on public.market_price_publication_snapshots(card_printing_id, source_observed_on desc, published_at desc);

create or replace function public.market_price_append_only_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists market_price_pipeline_phase_attempts_append_only_guard
  on public.market_price_pipeline_phase_attempts;
create trigger market_price_pipeline_phase_attempts_append_only_guard
  before update or delete on public.market_price_pipeline_phase_attempts
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_publication_events_append_only_guard
  on public.market_price_publication_events;
create trigger market_price_publication_events_append_only_guard
  before update or delete on public.market_price_publication_events
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_pipeline_candidates_append_only_guard
  on public.market_price_pipeline_candidates;
create trigger market_price_pipeline_candidates_append_only_guard
  before update or delete on public.market_price_pipeline_candidates
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_qualification_append_only_guard
  on public.market_price_qualification_decisions;
create trigger market_price_qualification_append_only_guard
  before update or delete on public.market_price_qualification_decisions
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_publication_append_only_guard
  on public.market_price_publication_snapshots;
create trigger market_price_publication_append_only_guard
  before update or delete on public.market_price_publication_snapshots
  for each row execute function public.market_price_append_only_guard_v1();

drop trigger if exists market_price_pipeline_runs_updated_at
  on public.market_price_pipeline_runs;
create trigger market_price_pipeline_runs_updated_at
  before update on public.market_price_pipeline_runs
  for each row execute function public.set_timestamp_updated_at();

drop trigger if exists market_price_publication_sets_updated_at
  on public.market_price_publication_sets;
create trigger market_price_publication_sets_updated_at
  before update on public.market_price_publication_sets
  for each row execute function public.set_timestamp_updated_at();

drop trigger if exists market_price_current_publication_updated_at
  on public.market_price_current_publication;
create trigger market_price_current_publication_updated_at
  before update on public.market_price_current_publication
  for each row execute function public.set_timestamp_updated_at();

create or replace view public.v_tcgplayer_market_qualification_candidates_v1 as
with source_run as (
  select sync_run.*
  from public.tcgcsv_source_sync_runs sync_run
  where sync_run.sync_mode = 'current_full_sync'
    and sync_run.status = 'completed'
    and sync_run.failed_count = 0
    and sync_run.finished_at is not null
  order by sync_run.finished_at desc, sync_run.created_at desc, sync_run.id desc
  limit 1
),
source_observations as (
  select
    observation.*,
    count(*) over (
      partition by observation.product_id, observation.subtype_name_normalized
    )::integer as duplicate_product_row_count
  from public.tcgcsv_source_price_daily_observations observation
  join source_run
    on source_run.id = observation.last_seen_run_id
  where observation.category_id = 3
    and observation.observed_on = source_run.observed_on
),
active_source_mappings as (
  select
    mapping.id as source_mapping_id,
    mapping.card_print_id,
    mapping.external_id::integer as source_product_id,
    mapping.meta as source_mapping_meta
  from public.external_mappings mapping
  where mapping.source = 'tcgplayer'
    and mapping.active = true
    and mapping.external_id ~ '^[0-9]+$'
),
mapped as (
  select
    observation.id as source_observation_id,
    observation.last_seen_run_id as source_sync_run_id,
    observation.source_artifact_id,
    artifact.observed_on as source_artifact_date,
    artifact.sha256 as source_artifact_hash,
    artifact.byte_size as source_artifact_byte_size,
    artifact.http_status as source_artifact_http_status,
    observation.source_price_row_identity,
    observation.payload_hash as source_row_hash,
    observation.product_id as source_product_id,
    observation.category_id,
    observation.group_id,
    observation.subtype_name as source_subtype_name,
    observation.subtype_name_normalized,
    observation.observed_on as source_observed_on,
    observation.last_observed_at as source_last_observed_at,
    observation.duplicate_product_row_count,
    observation.currency,
    observation.low_price,
    observation.mid_price,
    observation.high_price,
    observation.market_price,
    observation.direct_low_price,
    product.name as source_product_name,
    product.source_active as source_product_active,
    product.catalog_metadata_status as source_product_catalog_status,
    product.extended_data as source_product_extended_data,
    sync_run.sync_mode as source_sync_mode,
    sync_run.status as source_sync_status,
    sync_run.finished_at as source_sync_finished_at,
    sync_run.failed_count as source_sync_failed_count,
    sync_run.artifact_hash as source_run_artifact_hash,
    source_mapping.source_mapping_id,
    source_mapping.source_mapping_meta,
    source_mapping.card_print_id,
    card.gv_id,
    card.rarity as card_rarity,
    identity.identity_domain,
    public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name) as normalized_finish_key,
    printing.id as card_printing_id,
    printing.printing_gv_id,
    printing.finish_key,
    assignment.id as variant_assignment_id,
    assignment.variant_assignment_status,
    assignment.variant_assignment_version,
    assignment.variant_assignment_confidence
  from source_observations observation
  join public.tcgcsv_source_sync_runs sync_run
    on sync_run.id = observation.last_seen_run_id
  left join public.tcgcsv_source_artifacts artifact
    on artifact.id = observation.source_artifact_id
  left join public.tcgcsv_source_products product
    on product.product_id = observation.product_id
  left join active_source_mappings source_mapping
    on source_mapping.source_product_id = observation.product_id
  left join public.card_prints card
    on card.id = source_mapping.card_print_id
  left join public.card_print_identity identity
    on identity.card_print_id = card.id
   and identity.is_active = true
  left join public.card_printings printing
    on printing.card_print_id = card.id
   and printing.finish_key = public.normalize_tcgplayer_market_subtype_v1(observation.subtype_name)
  left join public.market_evidence_variant_assignments assignment
    on assignment.source_family = 'tcgcsv_market_close'
   and assignment.source_table = 'tcgcsv_source_price_daily_observations'
   and assignment.source_row_id = observation.id
   and assignment.variant_assignment_version = 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1'
),
summarized as (
  select
    source_observation_id,
    source_sync_run_id,
    source_artifact_id,
    source_artifact_date,
    source_artifact_hash,
    source_artifact_byte_size,
    source_artifact_http_status,
    source_price_row_identity,
    source_row_hash,
    source_product_id,
    category_id,
    group_id,
    source_subtype_name,
    subtype_name_normalized,
    source_observed_on,
    source_last_observed_at,
    duplicate_product_row_count,
    currency,
    low_price,
    mid_price,
    high_price,
    market_price,
    direct_low_price,
    source_product_name,
    source_product_active,
    source_product_catalog_status,
    source_product_extended_data,
    source_sync_mode,
    source_sync_status,
    source_sync_finished_at,
    source_sync_failed_count,
    source_run_artifact_hash,
    normalized_finish_key,
    count(distinct source_mapping_id)::integer as source_mapping_count,
    count(distinct card_print_id)::integer as card_print_mapping_count,
    count(distinct card_printing_id)::integer as card_printing_mapping_count,
    count(distinct identity_domain)
      filter (where identity_domain is not null)::integer as identity_domain_count,
    (array_agg(distinct source_mapping_id)
      filter (where source_mapping_id is not null))[1] as source_mapping_id,
    (array_agg(source_mapping_meta)
      filter (where source_mapping_id is not null))[1] as source_mapping_meta,
    (array_agg(distinct card_print_id)
      filter (where card_print_id is not null))[1] as card_print_id,
    (array_agg(distinct gv_id)
      filter (where gv_id is not null))[1] as gv_id,
    (array_agg(distinct card_rarity)
      filter (where card_rarity is not null))[1] as card_rarity,
    (array_agg(distinct identity_domain)
      filter (where identity_domain is not null))[1] as identity_domain,
    (array_agg(distinct card_printing_id)
      filter (where card_printing_id is not null))[1] as card_printing_id,
    (array_agg(distinct printing_gv_id)
      filter (where printing_gv_id is not null))[1] as printing_gv_id,
    (array_agg(distinct finish_key)
      filter (where finish_key is not null))[1] as finish_key,
    (array_agg(distinct variant_assignment_id)
      filter (where variant_assignment_id is not null))[1] as variant_assignment_id,
    (array_agg(distinct variant_assignment_status)
      filter (where variant_assignment_status is not null))[1] as variant_assignment_status,
    (array_agg(distinct variant_assignment_version)
      filter (where variant_assignment_version is not null))[1] as variant_assignment_version,
    (array_agg(distinct variant_assignment_confidence)
      filter (where variant_assignment_confidence is not null))[1] as variant_assignment_confidence
  from mapped
  group by
    source_observation_id,
    source_sync_run_id,
    source_artifact_id,
    source_artifact_date,
    source_artifact_hash,
    source_artifact_byte_size,
    source_artifact_http_status,
    source_price_row_identity,
    source_row_hash,
    source_product_id,
    category_id,
    group_id,
    source_subtype_name,
    subtype_name_normalized,
    source_observed_on,
    source_last_observed_at,
    duplicate_product_row_count,
    currency,
    low_price,
    mid_price,
    high_price,
    market_price,
    direct_low_price,
    source_product_name,
    source_product_active,
    source_product_catalog_status,
    source_product_extended_data,
    source_sync_mode,
    source_sync_status,
    source_sync_finished_at,
    source_sync_failed_count,
    source_run_artifact_hash,
    normalized_finish_key
)
select
  summarized.*,
  exists (
    select 1
    from jsonb_array_elements(
      coalesce(summarized.source_product_extended_data, '[]'::jsonb)
    ) field
    where lower(coalesce(field ->> 'name', '')) = 'number'
      and nullif(btrim(field ->> 'value'), '') is not null
  ) as has_printed_number_evidence,
  coalesce(
    summarized.source_mapping_meta ->> 'mapping_method',
    summarized.source_mapping_meta ->> 'derived_from',
    summarized.source_mapping_meta ->> 'promoted_by'
  ) as mapping_method,
  case
    when coalesce(summarized.source_mapping_meta ->> 'confidence', '') ~
      '^[0-9]+([.][0-9]+)?$'
      then (summarized.source_mapping_meta ->> 'confidence')::numeric
    else null
  end as mapping_confidence,
  case
    when summarized.card_print_mapping_count <> 1 then null
    when summarized.normalized_finish_key is null
      then 'unknown_finish_needs_review'
    when summarized.card_printing_mapping_count = 1
      then 'exact_child_finish'
    else 'no_matching_child_finish'
  end as derived_variant_assignment_status
from summarized;

create or replace function public.prepare_tcgplayer_market_variant_assignments_v1(
  p_source_sync_run_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.market_evidence_variant_assignments (
    contract_version,
    source_family,
    source_table,
    source_row_id,
    observation_id,
    raw_snapshot_id,
    card_print_id,
    gv_id,
    card_printing_id,
    printing_gv_id,
    source_finish_hint,
    normalized_finish_key,
    assigned_finish_key,
    variant_assignment_status,
    variant_assignment_confidence,
    variant_assignment_version,
    variant_assignment_reason,
    variant_assignment_flags,
    assignment_payload,
    needs_review,
    publishable,
    app_visible,
    market_truth
  )
  select
    'MARKET_EVIDENCE_VARIANT_ASSIGNMENT_V1',
    'tcgcsv_market_close',
    'tcgcsv_source_price_daily_observations',
    candidate.source_observation_id,
    candidate.source_observation_id,
    candidate.source_artifact_id,
    candidate.card_print_id,
    candidate.gv_id,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.card_printing_id
      else null
    end,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.printing_gv_id
      else null
    end,
    candidate.source_subtype_name,
    candidate.normalized_finish_key,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then candidate.finish_key
      else null
    end,
    candidate.derived_variant_assignment_status,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then 1.0000
      else 0.0000
    end,
    'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1',
    case candidate.derived_variant_assignment_status
      when 'exact_child_finish'
        then 'ordinary source subtype resolved to one exact canonical child finish'
      when 'unknown_finish_needs_review'
        then 'source subtype is not an approved ordinary finish'
      else 'approved source subtype did not resolve to one exact canonical child finish'
    end,
    case
      when candidate.derived_variant_assignment_status = 'exact_child_finish'
        then '{}'::text[]
      else array[candidate.derived_variant_assignment_status]::text[]
    end,
    jsonb_build_object(
      'source_mapping_id', candidate.source_mapping_id,
      'source_product_id', candidate.source_product_id,
      'source_subtype_name', candidate.source_subtype_name,
      'source_observation_id', candidate.source_observation_id
    ),
    candidate.derived_variant_assignment_status <> 'exact_child_finish',
    false,
    false,
    false
  from public.v_tcgplayer_market_qualification_candidates_v1 candidate
  where candidate.source_sync_run_id = p_source_sync_run_id
    and candidate.card_print_mapping_count = 1
    and candidate.card_print_id is not null
    and candidate.derived_variant_assignment_status is not null
  on conflict (
    source_family,
    source_row_id,
    variant_assignment_version
  ) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.activate_market_price_publication_set_v1(
  p_run_id uuid,
  p_publication_set_id uuid,
  p_expected_snapshot_count integer
)
returns table (
  publication_set_id uuid,
  previous_publication_set_id uuid,
  activated_snapshot_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.market_price_pipeline_runs%rowtype;
  set_row public.market_price_publication_sets%rowtype;
  prior_set_id uuid;
  actual_snapshot_count integer;
  eligible_decision_count integer;
  traced_snapshot_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'));

  select *
  into run_row
  from public.market_price_pipeline_runs
  where id = p_run_id
  for update;

  if not found then
    raise exception 'market price run not found: %', p_run_id;
  end if;
  if run_row.state <> 'reconciled'
    or run_row.reconciliation_state <> 'reconciled' then
    raise exception 'market price run is not fully reconciled: %', p_run_id;
  end if;
  if run_row.required_phase_count <= 0
    or run_row.succeeded_phase_count <> run_row.required_phase_count then
    raise exception 'required market price phases are incomplete: %', p_run_id;
  end if;
  if run_row.selected_count <>
    run_row.eligible_count
    + run_row.delayed_count
    + run_row.suppressed_count
    + run_row.quarantined_count
    + run_row.excluded_count then
    raise exception 'market price top-level counts do not reconcile: %', p_run_id;
  end if;

  select *
  into set_row
  from public.market_price_publication_sets
  where id = p_publication_set_id
    and run_id = p_run_id
  for update;

  if not found then
    raise exception 'market price publication set not found for run: %', p_run_id;
  end if;
  if set_row.publication_state <> 'staging' then
    raise exception 'market price publication set is not staging: %', p_publication_set_id;
  end if;
  if p_expected_snapshot_count <= 0
    or set_row.expected_snapshot_count <> p_expected_snapshot_count
    or run_row.eligible_count <> p_expected_snapshot_count then
    raise exception 'market price expected snapshot counts do not agree: %', p_run_id;
  end if;

  select count(*)::integer
  into actual_snapshot_count
  from public.market_price_publication_snapshots snapshot
  where snapshot.publication_set_id = p_publication_set_id
    and snapshot.run_id = p_run_id;

  select count(*)::integer
  into eligible_decision_count
  from public.market_price_qualification_decisions decision
  where decision.run_id = p_run_id
    and decision.eligible = true
    and decision.decision = 'publish'
    and decision.publication_lane = 'current';

  select count(*)::integer
  into traced_snapshot_count
  from public.market_price_publication_snapshots snapshot
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
   and decision.source_observation_id = snapshot.source_observation_id
   and decision.card_printing_id = snapshot.card_printing_id
   and decision.eligible = true
  where snapshot.publication_set_id = p_publication_set_id
    and snapshot.run_id = p_run_id;

  if actual_snapshot_count <> p_expected_snapshot_count
    or eligible_decision_count <> p_expected_snapshot_count
    or traced_snapshot_count <> p_expected_snapshot_count then
    raise exception
      'market price publication reconciliation mismatch run=% expected=% snapshots=% eligible=% traced=%',
      p_run_id,
      p_expected_snapshot_count,
      actual_snapshot_count,
      eligible_decision_count,
      traced_snapshot_count;
  end if;

  select current_state.publication_set_id
  into prior_set_id
  from public.market_price_current_publication current_state
  where current_state.singleton = true
  for update;

  if prior_set_id is not null then
    update public.market_price_publication_sets
    set
      publication_state = 'superseded',
      superseded_at = now()
    where id = prior_set_id
      and publication_state = 'published';

    insert into public.market_price_publication_events (
      publication_set_id,
      run_id,
      event_type,
      prior_publication_set_id,
      payload
    )
    select
      prior_set.id,
      prior_set.run_id,
      'superseded',
      prior_set_id,
      jsonb_build_object('superseded_by', p_publication_set_id)
    from public.market_price_publication_sets prior_set
    where prior_set.id = prior_set_id;
  end if;

  update public.market_price_publication_sets
  set
    publication_state = 'published',
    previous_publication_set_id = prior_set_id,
    published_at = now(),
    reconciliation = jsonb_build_object(
      'expected_snapshot_count', p_expected_snapshot_count,
      'actual_snapshot_count', actual_snapshot_count,
      'eligible_decision_count', eligible_decision_count,
      'traced_snapshot_count', traced_snapshot_count
    )
  where id = p_publication_set_id;

  insert into public.market_price_current_publication (
    singleton,
    publication_set_id,
    run_id,
    previous_publication_set_id,
    activated_at
  )
  values (
    true,
    p_publication_set_id,
    p_run_id,
    prior_set_id,
    now()
  )
  on conflict (singleton) do update
  set
    publication_set_id = excluded.publication_set_id,
    run_id = excluded.run_id,
    previous_publication_set_id = excluded.previous_publication_set_id,
    activated_at = excluded.activated_at;

  update public.market_price_pipeline_runs
  set
    state = 'published',
    current_phase = 'verify_read_model',
    snapshot_count = actual_snapshot_count
  where id = p_run_id;

  insert into public.market_price_publication_events (
    publication_set_id,
    run_id,
    event_type,
    prior_publication_set_id,
    payload
  )
  values (
    p_publication_set_id,
    p_run_id,
    'activated',
    prior_set_id,
    jsonb_build_object('snapshot_count', actual_snapshot_count)
  );

  return query
  select p_publication_set_id, prior_set_id, actual_snapshot_count;
end;
$$;

create or replace function public.rollback_market_price_publication_set_v1(
  p_expected_current_publication_set_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.market_price_current_publication%rowtype;
  restore_set public.market_price_publication_sets%rowtype;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'rollback reason is required';
  end if;

  perform pg_advisory_xact_lock(hashtext('tcgplayer_market_publication_v1'));

  select *
  into current_row
  from public.market_price_current_publication
  where singleton = true
  for update;

  if not found
    or current_row.publication_set_id <> p_expected_current_publication_set_id then
    raise exception 'current publication set changed before rollback';
  end if;
  if current_row.previous_publication_set_id is null then
    raise exception 'no prior publication set is available for rollback';
  end if;

  select *
  into restore_set
  from public.market_price_publication_sets
  where id = current_row.previous_publication_set_id
  for update;

  if not found then
    raise exception 'prior publication set is missing';
  end if;

  update public.market_price_publication_sets
  set
    publication_state = 'rolled_back',
    rolled_back_at = now(),
    rollback_reason = btrim(p_reason)
  where id = current_row.publication_set_id;

  update public.market_price_pipeline_runs
  set
    state = 'rolled_back',
    current_phase = 'rollback',
    error_classification = 'publication_rollback',
    error = btrim(p_reason)
  where id = current_row.run_id;

  update public.market_price_publication_sets
  set
    publication_state = 'published',
    superseded_at = null
  where id = restore_set.id;

  update public.market_price_current_publication
  set
    publication_set_id = restore_set.id,
    run_id = restore_set.run_id,
    previous_publication_set_id = restore_set.previous_publication_set_id,
    activated_at = now()
  where singleton = true;

  insert into public.market_price_publication_events (
    publication_set_id,
    run_id,
    event_type,
    prior_publication_set_id,
    reason,
    payload
  )
  values (
    current_row.publication_set_id,
    current_row.run_id,
    'rolled_back',
    restore_set.id,
    btrim(p_reason),
    jsonb_build_object('restored_publication_set_id', restore_set.id)
  );

  insert into public.market_price_publication_events (
    publication_set_id,
    run_id,
    event_type,
    prior_publication_set_id,
    reason,
    payload
  )
  values (
    restore_set.id,
    restore_set.run_id,
    'restored',
    current_row.publication_set_id,
    btrim(p_reason),
    jsonb_build_object('rolled_back_publication_set_id', current_row.publication_set_id)
  );

  return restore_set.id;
end;
$$;

create or replace view public.v_market_price_current_v1 as
with current_snapshots as (
  select
    snapshot.*,
    row_number() over (
      partition by snapshot.card_printing_id
      order by snapshot.source_observed_on desc, snapshot.published_at desc, snapshot.id desc
    ) as snapshot_rank
  from public.market_price_publication_snapshots snapshot
  join public.market_price_current_publication current_state
    on current_state.publication_set_id = snapshot.publication_set_id
   and current_state.run_id = snapshot.run_id
  join public.market_price_publication_sets publication_set
    on publication_set.id = current_state.publication_set_id
   and publication_set.run_id = current_state.run_id
   and publication_set.publication_state = 'published'
  join public.market_price_pipeline_runs pipeline_run
    on pipeline_run.id = publication_set.run_id
   and pipeline_run.reconciliation_state = 'reconciled'
   and pipeline_run.state in ('published', 'verified')
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
   and decision.eligible = true
   and decision.decision = 'publish'
   and decision.publication_lane = 'current'
  where snapshot.publication_set_id = publication_set.id
    and snapshot.run_id = pipeline_run.id
    and snapshot.publication_state = 'published'
    and snapshot.freshness_state = 'fresh'
    and snapshot.source_sync_finished_at >= now() - interval '36 hours'
)
select
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.source_observed_on,
  snapshot.source_sync_finished_at as observed_at,
  snapshot.published_at,
  'fresh'::text as freshness,
  extract(epoch from (now() - snapshot.source_sync_finished_at))::bigint as age_seconds,
  snapshot.provenance_id,
  snapshot.policy_version,
  snapshot.publication_set_id,
  snapshot.run_id
from current_snapshots snapshot
where snapshot.snapshot_rank = 1;

create or replace view public.v_market_price_history_v1 as
select distinct on (snapshot.card_printing_id, snapshot.source_observed_on)
  snapshot.card_print_id,
  snapshot.card_printing_id,
  snapshot.gv_id,
  snapshot.printing_gv_id,
  snapshot.finish_key,
  snapshot.source_observed_on as observed_on,
  snapshot.currency,
  snapshot.market_price,
  snapshot.low_price,
  snapshot.mid_price,
  snapshot.high_price,
  snapshot.direct_low_price,
  snapshot.source_name,
  snapshot.source_label,
  snapshot.provenance_id,
  snapshot.published_at,
  snapshot.publication_set_id,
  snapshot.run_id
from public.market_price_publication_snapshots snapshot
join public.market_price_publication_sets publication_set
  on publication_set.id = snapshot.publication_set_id
 and publication_set.publication_state in ('published', 'superseded')
join public.market_price_pipeline_runs pipeline_run
  on pipeline_run.id = snapshot.run_id
 and pipeline_run.reconciliation_state = 'reconciled'
 and pipeline_run.state in ('published', 'verified')
order by
  snapshot.card_printing_id,
  snapshot.source_observed_on,
  snapshot.published_at desc,
  snapshot.id desc;

create or replace view public.v_market_listing_variant_active_ask_exact_v1 as
with exact_listings as (
  select
    assignment.card_print_id,
    assignment.card_printing_id,
    assignment.printing_gv_id,
    assignment.assigned_finish_key as finish_key,
    observation.seller_key,
    observation.total_ask_price::numeric as total_ask_price,
    observation.currency,
    observation.observed_at
  from public.market_listing_card_candidates candidate
  join public.market_evidence_variant_assignments assignment
    on assignment.source_family = 'market_listing'
   and assignment.source_table = 'market_listing_card_candidates'
   and assignment.source_row_id = candidate.id
   and assignment.variant_assignment_version = 'MEE_VARIANT_ASSIGNMENT_RULES_V1'
   and assignment.variant_assignment_status = 'exact_child_finish'
   and assignment.card_printing_id is not null
  join public.market_listing_observations observation
    on observation.id = candidate.observation_id
  where observation.currency = 'USD'
    and observation.total_ask_price is not null
    and observation.observed_at >= now() - interval '72 hours'
    and coalesce(candidate.condition_features -> 'slab_features' ->> 'is_slab', 'false') <> 'true'
)
select
  card_print_id,
  card_printing_id,
  printing_gv_id,
  finish_key,
  'USD'::text as currency,
  min(total_ask_price)::numeric as lowest_active_ask,
  round((percentile_cont(0.5) within group (order by total_ask_price))::numeric, 2) as median_active_ask,
  count(*)::integer as listing_count,
  count(distinct seller_key)::integer as seller_count,
  max(observed_at) as observed_at
from exact_listings
group by card_print_id, card_printing_id, printing_gv_id, finish_key;

create or replace view public.v_market_price_parent_summary_v1 as
select
  current_price.card_print_id,
  current_price.gv_id,
  current_price.currency,
  min(current_price.market_price)::numeric as market_close,
  count(*)::integer as eligible_printing_count,
  (count(*) > 1) as is_from_price,
  max(current_price.observed_at) as observed_at,
  'fresh'::text as freshness,
  case when count(*) = 1 then (array_agg(current_price.provenance_id))[1] else null end as provenance_id,
  min(active_ask.lowest_active_ask)::numeric as lowest_active_ask,
  sum(coalesce(active_ask.listing_count, 0))::integer as active_ask_listing_count,
  max(active_ask.observed_at) as active_ask_observed_at
from public.v_market_price_current_v1 current_price
left join public.v_market_listing_variant_active_ask_exact_v1 active_ask
  on active_ask.card_printing_id = current_price.card_printing_id
group by current_price.card_print_id, current_price.gv_id, current_price.currency;

create or replace function public.get_market_pricing_read_model_v1(
  p_card_print_ids uuid[] default null,
  p_card_printing_ids uuid[] default null
)
returns table (
  pricing_scope text,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  status text,
  unavailable_reason text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  freshness text,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with requested_parents as (
    select distinct requested.card_print_id
    from unnest(coalesce(p_card_print_ids, '{}'::uuid[]))
      as requested(card_print_id)
  ),
  requested_printings as (
    select distinct requested.card_printing_id
    from unnest(coalesce(p_card_printing_ids, '{}'::uuid[]))
      as requested(card_printing_id)
  ),
  latest_parent_decisions as (
    select distinct on (decision.card_print_id)
      decision.card_print_id,
      decision.reason_codes,
      decision.freshness_result,
      decision.publication_lane
    from public.market_price_qualification_decisions decision
    join public.market_price_pipeline_runs pipeline_run
      on pipeline_run.id = decision.run_id
     and pipeline_run.run_mode in ('canary', 'production')
     and pipeline_run.state not in ('failed', 'rolled_back')
    where decision.card_print_id is not null
    order by decision.card_print_id, decision.evaluated_at desc, decision.id desc
  ),
  latest_printing_decisions as (
    select distinct on (decision.card_printing_id)
      decision.card_printing_id,
      decision.reason_codes,
      decision.freshness_result,
      decision.publication_lane
    from public.market_price_qualification_decisions decision
    join public.market_price_pipeline_runs pipeline_run
      on pipeline_run.id = decision.run_id
     and pipeline_run.run_mode in ('canary', 'production')
     and pipeline_run.state not in ('failed', 'rolled_back')
    where decision.card_printing_id is not null
    order by decision.card_printing_id, decision.evaluated_at desc, decision.id desc
  )
  select
    'parent'::text,
    requested.card_print_id,
    null::uuid,
    card.gv_id,
    null::text,
    null::text,
    case when parent.card_print_id is null then 'unavailable' else 'available' end,
    case
      when parent.card_print_id is not null then null::text
      when latest.freshness_result = 'delayed' then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale' then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case
      when parent.is_from_price then 'From TCGPlayer Market'
      else 'TCGPlayer Market'
    end,
    parent.observed_at,
    coalesce(parent.freshness, latest.freshness_result, 'unavailable'),
    null::numeric,
    null::numeric,
    null::numeric,
    null::numeric,
    coalesce(parent.is_from_price, false),
    coalesce(parent.eligible_printing_count, 0),
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from requested_parents requested
  left join public.card_prints card
    on card.id = requested.card_print_id
  left join public.v_market_price_parent_summary_v1 parent
    on parent.card_print_id = requested.card_print_id
  left join latest_parent_decisions latest
    on latest.card_print_id = requested.card_print_id

  union all

  select
    'card_printing'::text,
    printing.card_print_id,
    requested.card_printing_id,
    card.gv_id,
    printing.printing_gv_id,
    printing.finish_key,
    case when exact.card_printing_id is null then 'unavailable' else 'available' end,
    case
      when exact.card_printing_id is not null then null::text
      when latest.freshness_result = 'delayed' then 'source_freshness_delayed'
      when latest.freshness_result = 'suppressed_stale' then 'suppressed_stale'
      when cardinality(latest.reason_codes) > 0 then latest.reason_codes[1]
      else 'no_current_qualified_market_price'
    end,
    exact.currency,
    exact.market_price,
    'tcgplayer'::text,
    'TCGPlayer Market'::text,
    exact.observed_at,
    coalesce(exact.freshness, latest.freshness_result, 'unavailable'),
    exact.low_price,
    exact.mid_price,
    exact.high_price,
    exact.direct_low_price,
    false,
    case when exact.card_printing_id is null then 0 else 1 end,
    active_ask.lowest_active_ask,
    active_ask.listing_count,
    active_ask.observed_at,
    exact.provenance_id
  from requested_printings requested
  left join public.card_printings printing
    on printing.id = requested.card_printing_id
  left join public.card_prints card
    on card.id = printing.card_print_id
  left join public.v_market_price_current_v1 exact
    on exact.card_printing_id = requested.card_printing_id
  left join public.v_market_listing_variant_active_ask_exact_v1 active_ask
    on active_ask.card_printing_id = requested.card_printing_id
  left join latest_printing_decisions latest
    on latest.card_printing_id = requested.card_printing_id
  order by 1, 2, 6 nulls first;
$$;

create or replace function public.get_market_price_history_v1(
  p_card_printing_id uuid,
  p_days integer default 365
)
returns table (
  card_printing_id uuid,
  printing_gv_id text,
  observed_on date,
  currency text,
  market_price numeric,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  direct_low_price numeric,
  source_label text,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    history.card_printing_id,
    history.printing_gv_id,
    history.observed_on,
    history.currency,
    history.market_price,
    history.low_price,
    history.mid_price,
    history.high_price,
    history.direct_low_price,
    history.source_label,
    history.provenance_id
  from public.v_market_price_history_v1 history
  where history.card_printing_id = p_card_printing_id
    and history.observed_on >= current_date - greatest(1, least(coalesce(p_days, 365), 3650))
  order by history.observed_on asc;
$$;

create or replace function public.get_top_market_pricing_v1(p_limit integer default 100)
returns table (
  card_print_id uuid,
  gv_id text,
  currency text,
  market_close numeric,
  source_name text,
  source_label text,
  observed_at timestamptz,
  freshness text,
  is_from_price boolean,
  eligible_printing_count integer,
  lowest_active_ask numeric,
  active_ask_listing_count integer,
  active_ask_observed_at timestamptz,
  provenance_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    parent.card_print_id,
    parent.gv_id,
    parent.currency,
    parent.market_close,
    'tcgplayer'::text,
    case when parent.is_from_price then 'From TCGPlayer Market' else 'TCGPlayer Market' end,
    parent.observed_at,
    parent.freshness,
    parent.is_from_price,
    parent.eligible_printing_count,
    parent.lowest_active_ask,
    parent.active_ask_listing_count,
    parent.active_ask_observed_at,
    parent.provenance_id
  from public.v_market_price_parent_summary_v1 parent
  order by parent.market_close desc, parent.card_print_id
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.get_market_price_trace_v1(p_provenance_id uuid)
returns table (
  provenance_id uuid,
  publication_set_id uuid,
  run_id uuid,
  run_key text,
  pipeline_candidate_id uuid,
  phase_attempt_id uuid,
  source_observation_id uuid,
  source_sync_run_id uuid,
  source_artifact_id uuid,
  source_artifact_date date,
  source_artifact_hash text,
  source_price_row_identity text,
  source_row_hash text,
  source_mapping_id bigint,
  variant_assignment_id uuid,
  source_product_id integer,
  source_subtype_name text,
  source_observed_on date,
  source_sync_finished_at timestamptz,
  card_print_id uuid,
  card_printing_id uuid,
  gv_id text,
  printing_gv_id text,
  finish_key text,
  market_price numeric,
  qualification_decision_id uuid,
  policy_version text,
  publication_lane text,
  language_result text,
  finish_result text,
  source_integrity_result text,
  duplicate_product_result text,
  freshness_result text,
  qualified_at timestamptz,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    snapshot.provenance_id,
    snapshot.publication_set_id,
    snapshot.run_id,
    decision.run_key,
    decision.pipeline_candidate_id,
    snapshot.phase_attempt_id,
    snapshot.source_observation_id,
    snapshot.source_sync_run_id,
    snapshot.source_artifact_id,
    snapshot.source_artifact_date,
    snapshot.source_artifact_hash,
    snapshot.source_price_row_identity,
    snapshot.source_row_hash,
    snapshot.source_mapping_id,
    snapshot.variant_assignment_id,
    snapshot.source_product_id,
    snapshot.source_subtype_name,
    snapshot.source_observed_on,
    snapshot.source_sync_finished_at,
    snapshot.card_print_id,
    snapshot.card_printing_id,
    snapshot.gv_id,
    snapshot.printing_gv_id,
    snapshot.finish_key,
    snapshot.market_price,
    snapshot.qualification_decision_id,
    snapshot.policy_version,
    decision.publication_lane,
    decision.language_result,
    decision.finish_result,
    decision.source_integrity_result,
    decision.duplicate_product_result,
    decision.freshness_result,
    snapshot.qualified_at,
    snapshot.published_at
  from public.market_price_publication_snapshots snapshot
  join public.market_price_qualification_decisions decision
    on decision.id = snapshot.qualification_decision_id
  where snapshot.provenance_id = p_provenance_id;
$$;

alter table public.market_price_pipeline_runs enable row level security;
alter table public.market_price_pipeline_phase_attempts enable row level security;
alter table public.market_price_publication_sets enable row level security;
alter table public.market_price_current_publication enable row level security;
alter table public.market_price_publication_events enable row level security;
alter table public.market_price_pipeline_candidates enable row level security;
alter table public.market_price_qualification_decisions enable row level security;
alter table public.market_price_publication_snapshots enable row level security;

drop policy if exists market_price_pipeline_runs_service_role_all
  on public.market_price_pipeline_runs;
create policy market_price_pipeline_runs_service_role_all
  on public.market_price_pipeline_runs
  for all to service_role using (true) with check (true);

drop policy if exists market_price_pipeline_phase_attempts_service_role_all
  on public.market_price_pipeline_phase_attempts;
create policy market_price_pipeline_phase_attempts_service_role_all
  on public.market_price_pipeline_phase_attempts
  for all to service_role using (true) with check (true);

drop policy if exists market_price_publication_sets_service_role_all
  on public.market_price_publication_sets;
create policy market_price_publication_sets_service_role_all
  on public.market_price_publication_sets
  for all to service_role using (true) with check (true);

drop policy if exists market_price_current_publication_service_role_all
  on public.market_price_current_publication;
create policy market_price_current_publication_service_role_all
  on public.market_price_current_publication
  for all to service_role using (true) with check (true);

drop policy if exists market_price_publication_events_service_role_all
  on public.market_price_publication_events;
create policy market_price_publication_events_service_role_all
  on public.market_price_publication_events
  for all to service_role using (true) with check (true);

drop policy if exists market_price_pipeline_candidates_service_role_all
  on public.market_price_pipeline_candidates;
create policy market_price_pipeline_candidates_service_role_all
  on public.market_price_pipeline_candidates
  for all to service_role using (true) with check (true);

drop policy if exists market_price_qualification_service_role_all
  on public.market_price_qualification_decisions;
create policy market_price_qualification_service_role_all
  on public.market_price_qualification_decisions
  for all to service_role using (true) with check (true);

drop policy if exists market_price_publication_service_role_all
  on public.market_price_publication_snapshots;
create policy market_price_publication_service_role_all
  on public.market_price_publication_snapshots
  for all to service_role using (true) with check (true);

revoke all on public.market_price_pipeline_runs from public, anon, authenticated, service_role;
revoke all on public.market_price_pipeline_phase_attempts from public, anon, authenticated, service_role;
revoke all on public.market_price_publication_sets from public, anon, authenticated, service_role;
revoke all on public.market_price_current_publication from public, anon, authenticated, service_role;
revoke all on public.market_price_publication_events from public, anon, authenticated, service_role;
revoke all on public.market_price_pipeline_candidates from public, anon, authenticated, service_role;
revoke all on public.market_price_qualification_decisions from public, anon, authenticated, service_role;
revoke all on public.market_price_publication_snapshots from public, anon, authenticated, service_role;
revoke all on public.v_tcgplayer_market_qualification_candidates_v1 from public, anon, authenticated;
revoke all on public.v_market_price_current_v1 from public, anon, authenticated;
revoke all on public.v_market_price_history_v1 from public, anon, authenticated;
revoke all on public.v_market_listing_variant_active_ask_exact_v1 from public, anon, authenticated;
revoke all on public.v_market_price_parent_summary_v1 from public, anon, authenticated;

grant select, insert, update on public.market_price_pipeline_runs to service_role;
grant select, insert on public.market_price_pipeline_phase_attempts to service_role;
grant select, insert, update on public.market_price_publication_sets to service_role;
grant select, insert, update on public.market_price_current_publication to service_role;
grant select, insert on public.market_price_publication_events to service_role;
grant select, insert on public.market_price_pipeline_candidates to service_role;
grant select, insert on public.market_price_qualification_decisions to service_role;
grant select, insert on public.market_price_publication_snapshots to service_role;
grant select on public.v_tcgplayer_market_qualification_candidates_v1 to service_role;
grant select on public.v_market_price_current_v1 to service_role;
grant select on public.v_market_price_history_v1 to service_role;
grant select on public.v_market_listing_variant_active_ask_exact_v1 to service_role;
grant select on public.v_market_price_parent_summary_v1 to service_role;

revoke all on function public.normalize_tcgplayer_market_subtype_v1(text)
  from public, anon, authenticated, service_role;
revoke all on function public.market_price_append_only_guard_v1()
  from public, anon, authenticated, service_role;
revoke all on function public.prepare_tcgplayer_market_variant_assignments_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.activate_market_price_publication_set_v1(uuid, uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.rollback_market_price_publication_set_v1(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_pricing_read_model_v1(uuid[], uuid[])
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_price_history_v1(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_top_market_pricing_v1(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_market_price_trace_v1(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.normalize_tcgplayer_market_subtype_v1(text) to service_role;
grant execute on function public.market_price_append_only_guard_v1() to service_role;
grant execute on function public.prepare_tcgplayer_market_variant_assignments_v1(uuid) to service_role;
grant execute on function public.activate_market_price_publication_set_v1(uuid, uuid, integer) to service_role;
grant execute on function public.rollback_market_price_publication_set_v1(uuid, text) to service_role;
grant execute on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) to authenticated, service_role;
grant execute on function public.get_market_price_history_v1(uuid, integer) to authenticated, service_role;
grant execute on function public.get_top_market_pricing_v1(integer) to authenticated, service_role;
grant execute on function public.get_market_price_trace_v1(uuid) to service_role;

comment on table public.market_price_pipeline_runs is
  'Durable resumable run state for the governed TCGPlayer Market current-price pipeline.';

comment on table public.market_price_pipeline_phase_attempts is
  'Append-only phase-attempt evidence. A new row records each started, succeeded, failed, or skipped transition.';

comment on table public.market_price_pipeline_candidates is
  'Immutable run-scoped staging rows that freeze source, mapping, variant, and canonical evidence before qualification.';

comment on table public.market_price_publication_sets is
  'Atomic publication generations. Only the set referenced by market_price_current_publication is current.';

comment on table public.market_price_publication_events is
  'Append-only activation, supersession, rollback, and restoration evidence.';

comment on table public.market_price_qualification_decisions is
  'Append-only deterministic publication decisions for exact TCGPlayer Market observations.';

comment on table public.market_price_publication_snapshots is
  'Immutable TCGPlayer Market publication snapshots. market_price is the source close; supporting fields never alter it.';

comment on function public.get_market_pricing_read_model_v1(uuid[], uuid[]) is
  'Signed-in Production V1 pricing contract shared by every client surface.';

commit;
