-- MEE_CORE_SCHEMA_GAP_AUDIT_V1 dry-run migration plan only.
-- Purpose: proposed minimum provider-agnostic lifecycle state and transition history layer.
-- Boundary: rollback-only artifact; not a Supabase migration file; not applied.
-- No evidence backfill, provider calls, pricing_observations writes, ebay_active_prices_latest writes,
-- public pricing views, app-visible pricing, identity writes, vault writes, image/storage writes,
-- deletes, merges, or global apply.

begin;

create table if not exists public.market_evidence_observations (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null,
  source text not null,
  source_type text not null,
  provider_route text,
  source_record_id text not null,
  source_url text,
  acquisition_run_table text,
  acquisition_run_id uuid,
  raw_snapshot_table text,
  raw_snapshot_id uuid,
  provider_observation_table text,
  provider_observation_id uuid,
  provider_candidate_table text,
  provider_candidate_id uuid,
  provider_rollup_table text,
  provider_rollup_id uuid,
  card_print_id uuid,
  gv_id text,
  observed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  adapter_version text,
  normalizer_version text,
  matcher_version text,
  classifier_version text,
  quality_gate_version text,
  rollup_version text,
  publication_gate_version text,
  identity_payload jsonb not null default '{}'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint market_evidence_observations_source_type_check check (
    source_type in ('reference', 'active_listing', 'sold_comp', 'manual_review', 'internal_projection')
  ),
  constraint market_evidence_observations_provider_table_check check (
    provider_observation_table is null
    or provider_observation_table in (
      'market_reference_candidates',
      'market_reference_normalized_evidence',
      'market_listing_observations',
      'market_listing_card_candidates',
      'market_reference_signal_rollups',
      'market_listing_rollups'
    )
  )
);

create table if not exists public.market_evidence_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.market_evidence_observations(id) on delete cascade,
  contract_version text not null,
  event_version text not null,
  from_state text,
  to_state text not null,
  stage_order integer not null,
  transition_reason text not null,
  transition_actor text not null default 'system',
  source text not null,
  source_type text not null,
  source_record_id text not null,
  acquisition_run_id uuid,
  raw_snapshot_id uuid,
  normalized_observation_ref uuid,
  matched_candidate_ref uuid,
  classified_ref uuid,
  quality_gate_ref uuid,
  rollup_ref uuid,
  publication_ref uuid,
  match_confidence numeric,
  match_status text,
  evidence_class text,
  quality_flags text[] not null default '{}'::text[],
  exclusion_flags text[] not null default '{}'::text[],
  model_eligible boolean not null default false,
  rollup_eligible boolean not null default false,
  needs_review boolean not null default true,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  event_payload jsonb not null default '{}'::jsonb,
  event_hash text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint market_evidence_lifecycle_events_source_type_check check (
    source_type in ('reference', 'active_listing', 'sold_comp', 'manual_review', 'internal_projection')
  ),
  constraint market_evidence_lifecycle_events_state_check check (
    to_state in (
      'acquired',
      'raw_stored',
      'normalized',
      'matched',
      'classified',
      'quality_gated',
      'rollup_eligible',
      'rolled_up_internal',
      'publishable',
      'app_visible'
    )
    and (
      from_state is null
      or from_state in (
        'acquired',
        'raw_stored',
        'normalized',
        'matched',
        'classified',
        'quality_gated',
        'rollup_eligible',
        'rolled_up_internal',
        'publishable',
        'app_visible'
      )
    )
  ),
  constraint market_evidence_lifecycle_events_stage_order_check check (
    (to_state = 'acquired' and stage_order = 1)
    or (to_state = 'raw_stored' and stage_order = 2)
    or (to_state = 'normalized' and stage_order = 3)
    or (to_state = 'matched' and stage_order = 4)
    or (to_state = 'classified' and stage_order = 5)
    or (to_state = 'quality_gated' and stage_order = 6)
    or (to_state = 'rollup_eligible' and stage_order = 7)
    or (to_state = 'rolled_up_internal' and stage_order = 8)
    or (to_state = 'publishable' and stage_order = 9)
    or (to_state = 'app_visible' and stage_order = 10)
  ),
  constraint market_evidence_lifecycle_events_no_default_public_truth_check check (
    market_truth = false
  ),
  constraint market_evidence_lifecycle_events_unique_hash unique (event_hash)
);

create index if not exists market_evidence_observations_source_record_idx
  on public.market_evidence_observations (source, source_type, source_record_id);

create index if not exists market_evidence_observations_card_idx
  on public.market_evidence_observations (card_print_id, source_type);

create unique index if not exists market_evidence_observations_unique_source_record_idx
  on public.market_evidence_observations (
    source,
    source_type,
    source_record_id,
    coalesce(provider_observation_table, ''),
    coalesce(provider_observation_id::text, '')
  );

create index if not exists market_evidence_lifecycle_events_observation_stage_idx
  on public.market_evidence_lifecycle_events (observation_id, stage_order, occurred_at desc);

create index if not exists market_evidence_lifecycle_events_state_idx
  on public.market_evidence_lifecycle_events (to_state, occurred_at desc);

create index if not exists market_evidence_lifecycle_events_rollup_idx
  on public.market_evidence_lifecycle_events (rollup_ref)
  where rollup_ref is not null;

create or replace view public.v_market_evidence_lifecycle_current_v1 as
with ranked_events as (
  select
    e.*,
    row_number() over (
      partition by e.observation_id
      order by e.stage_order desc, e.occurred_at desc, e.id desc
    ) as rn,
    count(*) over (partition by e.observation_id) as lifecycle_event_count,
    max(e.stage_order) over (partition by e.observation_id) as max_stage_order
  from public.market_evidence_lifecycle_events e
)
select
  o.id as observation_id,
  o.source,
  o.source_type,
  o.source_record_id,
  o.card_print_id,
  o.gv_id,
  o.observed_at,
  r.to_state as lifecycle_state,
  r.stage_order,
  r.lifecycle_event_count,
  r.max_stage_order,
  r.needs_review,
  r.model_eligible,
  r.rollup_eligible,
  r.publishable,
  r.app_visible,
  r.market_truth,
  r.occurred_at as lifecycle_state_at,
  o.created_at as observation_created_at
from public.market_evidence_observations o
left join ranked_events r
  on r.observation_id = o.id
 and r.rn = 1;

alter table public.market_evidence_observations enable row level security;
alter table public.market_evidence_lifecycle_events enable row level security;

create policy market_evidence_observations_service_role_all
  on public.market_evidence_observations
  for all
  to service_role
  using (true)
  with check (true);

create policy market_evidence_lifecycle_events_service_role_all
  on public.market_evidence_lifecycle_events
  for all
  to service_role
  using (true)
  with check (true);

select
  'MEE_CORE_SCHEMA_GAP_AUDIT_V1_DRY_RUN_MIGRATION_PLAN'::text as package_id,
  2::int as proposed_table_count,
  1::int as proposed_view_count,
  5::int as proposed_index_count,
  2::int as proposed_service_role_policy_count,
  false::boolean as writes_pricing_observations,
  false::boolean as writes_ebay_active_prices_latest,
  false::boolean as creates_public_pricing_view,
  false::boolean as creates_app_visible_pricing,
  false::boolean as writes_identity_tables,
  false::boolean as writes_vault_tables,
  false::boolean as writes_image_or_storage_tables,
  true::boolean as rollback_only;

rollback;
