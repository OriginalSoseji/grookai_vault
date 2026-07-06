-- MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1 local migration candidate.
-- Purpose: append-only internal Market Evidence Engine review action event tracking.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- No evidence backfill, provider calls, source fetches, disposition updates, public pricing views,
-- app-visible pricing, public price rollups, identity writes, vault writes, image/storage writes,
-- deletes, upserts, merges, or global apply.

begin;

create table if not exists public.market_evidence_review_action_events (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_V1',
  workflow_version text not null default 'MEE_CORE_INTERNAL_REVIEW_ACTION_WORKFLOW_V1',
  disposition_id uuid not null references public.market_evidence_review_dispositions(id),
  card_print_id uuid not null,
  gv_id text,
  action_name text not null,
  from_status text not null,
  to_status text not null,
  from_disposition text not null,
  to_disposition text not null,
  review_lane text not null,
  evidence_lane text not null,
  reason_code text,
  review_note text,
  action_payload jsonb not null default '{}'::jsonb,
  review_actor text not null,
  expected_disposition_updated_at timestamptz not null,
  publication_gate_candidate boolean not null default false,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_evidence_review_action_events_action_check check (
    action_name in (
      'start_review',
      'confirm_internal_candidate',
      'require_split',
      'block_evidence',
      'block_classification',
      'request_reclassification',
      'defer_more_evidence',
      'reference_crosscheck',
      'defer_active_market_evidence',
      'confirm_monitor_only'
    )
  ),
  constraint market_evidence_review_action_events_reason_check check (
    reason_code is null
    or reason_code in (
      'approved_internal_raw_single_signal',
      'approved_internal_slab_signal',
      'mixed_raw_slab_requires_split',
      'classification_noise',
      'wrong_identity',
      'unresolved_match_ambiguity',
      'lot_bulk_sealed_proxy_noise',
      'reference_only_no_market_support',
      'low_signal_sample',
      'insufficient_source_independence',
      'stale_signal',
      'special_lane_ambiguous',
      'manual_hold'
    )
  ),
  constraint market_evidence_review_action_events_from_status_check check (
    from_status in (
      'pending',
      'in_review',
      'resolved',
      'blocked',
      'superseded'
    )
  ),
  constraint market_evidence_review_action_events_to_status_check check (
    to_status in (
      'pending',
      'in_review',
      'resolved',
      'blocked',
      'superseded'
    )
  ),
  constraint market_evidence_review_action_events_from_disposition_check check (
    from_disposition in (
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
  constraint market_evidence_review_action_events_to_disposition_check check (
    to_disposition in (
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
  constraint market_evidence_review_action_events_review_lane_check check (
    review_lane in (
      'high_signal_review',
      'candidate_review',
      'classification_review',
      'reference_only_review',
      'low_signal_monitor'
    )
  ),
  constraint market_evidence_review_action_events_evidence_lane_check check (
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
  constraint market_evidence_review_action_events_reason_required_check check (
    action_name in ('start_review', 'confirm_monitor_only')
    or reason_code is not null
  ),
  constraint market_evidence_review_action_events_transition_check check (
    (
      action_name = 'start_review'
      and from_status = 'pending'
      and to_status = 'in_review'
      and review_lane in ('high_signal_review', 'candidate_review', 'classification_review', 'reference_only_review')
      and to_disposition = from_disposition
    )
    or (
      action_name = 'confirm_internal_candidate'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_confirmed_internal_candidate'
      and review_lane in ('high_signal_review', 'candidate_review')
      and evidence_lane in ('raw_single', 'slab')
    )
    or (
      action_name = 'require_split'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_split_required'
      and evidence_lane = 'mixed_raw_slab'
    )
    or (
      action_name = 'block_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_blocked'
      and review_lane in ('high_signal_review', 'candidate_review', 'reference_only_review', 'low_signal_monitor')
    )
    or (
      action_name = 'block_classification'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_blocked_classification'
      and review_lane = 'classification_review'
      and evidence_lane = 'classification_blocked'
    )
    or (
      action_name = 'request_reclassification'
      and from_status in ('pending', 'in_review')
      and to_status = 'blocked'
      and to_disposition = 'review_reclassify'
      and review_lane = 'classification_review'
    )
    or (
      action_name = 'defer_more_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_defer_more_evidence'
      and review_lane in ('high_signal_review', 'candidate_review', 'classification_review', 'low_signal_monitor')
    )
    or (
      action_name = 'reference_crosscheck'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_reference_crosscheck'
      and review_lane = 'reference_only_review'
      and evidence_lane = 'reference_metric'
    )
    or (
      action_name = 'defer_active_market_evidence'
      and from_status in ('pending', 'in_review')
      and to_status = 'resolved'
      and to_disposition = 'review_defer_active_market_evidence'
      and review_lane = 'reference_only_review'
      and evidence_lane = 'reference_metric'
    )
    or (
      action_name = 'confirm_monitor_only'
      and from_status in ('pending', 'in_review', 'resolved')
      and to_status = 'resolved'
      and to_disposition = 'monitor_only'
      and review_lane = 'low_signal_monitor'
    )
  ),
  constraint market_evidence_review_action_events_no_public_direct_check check (
    publication_gate_candidate = false
    and can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  )
);

create index if not exists market_evidence_review_action_events_disposition_idx
  on public.market_evidence_review_action_events (disposition_id, created_at desc);

create index if not exists market_evidence_review_action_events_card_idx
  on public.market_evidence_review_action_events (card_print_id, created_at desc);

create index if not exists market_evidence_review_action_events_action_idx
  on public.market_evidence_review_action_events (action_name, created_at desc);

create index if not exists market_evidence_review_action_events_actor_idx
  on public.market_evidence_review_action_events (review_actor, created_at desc);

alter table public.market_evidence_review_action_events enable row level security;

drop policy if exists market_evidence_review_action_events_service_role_select
  on public.market_evidence_review_action_events;
drop policy if exists market_evidence_review_action_events_service_role_insert
  on public.market_evidence_review_action_events;

create policy market_evidence_review_action_events_service_role_select
  on public.market_evidence_review_action_events
  for select
  to service_role
  using (true);

create policy market_evidence_review_action_events_service_role_insert
  on public.market_evidence_review_action_events
  for insert
  to service_role
  with check (true);

revoke all on public.market_evidence_review_action_events from public, anon, authenticated;
grant select, insert on public.market_evidence_review_action_events to service_role;

select
  'MEE_CORE_INTERNAL_REVIEW_ACTION_EVENTS_SCHEMA_CANDIDATE_V1'::text as package_id,
  1::int as proposed_table_count,
  4::int as proposed_index_count,
  2::int as proposed_service_role_policy_count,
  true::boolean as append_only_from_service_api,
  false::boolean as public_price_publication,
  false::boolean as app_visible_pricing,
  false::boolean as public_price_rollup,
  false::boolean as market_truth,
  true::boolean as internal_only,
  true::boolean as service_role_only;

commit;
