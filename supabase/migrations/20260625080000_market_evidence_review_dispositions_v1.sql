-- MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1 local migration candidate.
-- Purpose: internal-only Market Evidence Engine review disposition tracking.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- No evidence backfill, provider calls, source fetches, public pricing views, app-visible pricing,
-- public price rollups, identity writes, vault writes, image/storage writes, deletes, merges,
-- or global apply.

begin;

create table if not exists public.market_evidence_review_dispositions (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_V1',
  workflow_version text not null default 'MEE_CORE_INTERNAL_REVIEW_WORKFLOW_V1',
  card_print_id uuid not null,
  gv_id text,
  review_lane text not null,
  evidence_lane text not null default 'unknown',
  review_status text not null default 'pending',
  review_disposition text not null,
  review_actor text not null default 'system',
  reviewed_at timestamptz,
  superseded_by uuid references public.market_evidence_review_dispositions(id),
  evidence_summary jsonb not null default '{}'::jsonb,
  source_mix jsonb not null default '{}'::jsonb,
  blocker_summary jsonb not null default '{}'::jsonb,
  review_payload jsonb not null default '{}'::jsonb,
  needs_review boolean not null default true,
  publication_gate_candidate boolean not null default false,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint market_evidence_review_dispositions_lane_check check (
    review_lane in (
      'high_signal_review',
      'candidate_review',
      'classification_review',
      'reference_only_review',
      'low_signal_monitor'
    )
  ),
  constraint market_evidence_review_dispositions_evidence_lane_check check (
    evidence_lane in (
      'raw_single',
      'slab',
      'reference_metric',
      'mixed_raw_slab',
      'classification_blocked',
      'low_signal',
      'unknown'
    )
  ),
  constraint market_evidence_review_dispositions_status_check check (
    review_status in (
      'pending',
      'in_review',
      'resolved',
      'blocked',
      'superseded'
    )
  ),
  constraint market_evidence_review_dispositions_disposition_check check (
    review_disposition in (
      'review_pending_high_signal',
      'review_pending_candidate',
      'review_pending_classification_fix',
      'review_pending_reference_only',
      'monitor_only',
      'review_confirmed_internal_candidate',
      'review_split_required',
      'review_blocked',
      'review_defer_more_evidence',
      'review_reclassify',
      'review_blocked_classification',
      'review_reference_crosscheck',
      'review_defer_active_market_evidence'
    )
  ),
  constraint market_evidence_review_dispositions_no_public_direct_check check (
    publication_gate_candidate = false
    and can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  ),
  constraint market_evidence_review_dispositions_superseded_check check (
    (review_status = 'superseded' and superseded_by is not null)
    or (review_status <> 'superseded')
  )
);

create index if not exists market_evidence_review_dispositions_card_idx
  on public.market_evidence_review_dispositions (card_print_id, review_lane, evidence_lane);

create index if not exists market_evidence_review_dispositions_status_idx
  on public.market_evidence_review_dispositions (review_status, review_disposition, updated_at desc);

create index if not exists market_evidence_review_dispositions_actor_idx
  on public.market_evidence_review_dispositions (review_actor, reviewed_at desc);

create unique index if not exists market_evidence_review_dispositions_active_unique_idx
  on public.market_evidence_review_dispositions (card_print_id, review_lane, evidence_lane)
  where review_status in ('pending', 'in_review', 'resolved', 'blocked');

alter table public.market_evidence_review_dispositions enable row level security;

drop policy if exists market_evidence_review_dispositions_service_role_all
  on public.market_evidence_review_dispositions;

create policy market_evidence_review_dispositions_service_role_all
  on public.market_evidence_review_dispositions
  for all
  to service_role
  using (true)
  with check (true);

revoke all on public.market_evidence_review_dispositions from public, anon, authenticated;
grant select, insert, update on public.market_evidence_review_dispositions to service_role;

select
  'MEE_CORE_INTERNAL_REVIEW_DISPOSITIONS_SCHEMA_CANDIDATE_V1'::text as package_id,
  1::int as proposed_table_count,
  4::int as proposed_index_count,
  1::int as proposed_service_role_policy_count,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth,
  true::boolean as internal_only,
  true::boolean as service_role_only;

commit;
