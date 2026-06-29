-- MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1 local schema candidate.
-- Purpose: append-only internal cleanup action tracking for market_listing_card_candidates.
-- Boundary: local candidate only until explicitly approved for targeted remote schema apply.
-- No evidence backfill, provider calls, source fetches, function invocation, public pricing views,
-- app-visible pricing, public price rollups, identity writes, vault writes, image/storage writes,
-- deletes, upserts, merges, or global apply.

begin;

create table if not exists public.market_listing_candidate_cleanup_events (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_CANDIDATE_CLEANUP_ACTION_MODEL_V1',
  cleanup_policy_version text not null default 'MEE_CANDIDATE_EVIDENCE_CLEANUP_POLICY_V1',
  candidate_id uuid not null references public.market_listing_card_candidates(id),
  card_print_id uuid not null,
  gv_id text,
  observation_id uuid,
  source text,
  source_listing_id text,
  evidence_lane text not null,
  cleanup_action text not null,
  cleanup_state text not null,
  reason_code text not null,
  match_status_at_action text,
  match_confidence_at_action numeric,
  exclusion_flags_at_action text[] not null default '{}'::text[],
  needs_review_at_action boolean not null,
  can_publish_price_directly_at_action boolean not null default false,
  reviewer_actor text not null default 'system',
  review_note text,
  action_payload jsonb not null default '{}'::jsonb,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_listing_candidate_cleanup_events_evidence_lane_check check (
    evidence_lane in ('raw_single', 'slab')
  ),
  constraint market_listing_candidate_cleanup_events_action_check check (
    cleanup_action in (
      'keep_review',
      'quarantine_candidate',
      'require_matcher_reclassify',
      'require_special_lane_policy',
      'require_high_value_review',
      'defer_until_more_evidence'
    )
  ),
  constraint market_listing_candidate_cleanup_events_state_check check (
    cleanup_state in (
      'review_open',
      'quarantined',
      'needs_matcher_reclassify',
      'needs_special_lane_policy',
      'needs_high_value_review',
      'deferred_more_evidence'
    )
  ),
  constraint market_listing_candidate_cleanup_events_reason_check check (
    reason_code in (
      'candidate_rows_still_need_review',
      'match_confidence_below_policy',
      'exclusion_flags_present',
      'special_lane_manual_review',
      'high_value_manual_review',
      'insufficient_listing_count',
      'insufficient_seller_diversity',
      'manual_hold'
    )
  ),
  constraint market_listing_candidate_cleanup_events_transition_check check (
    (
      cleanup_action = 'keep_review'
      and cleanup_state = 'review_open'
      and reason_code in ('candidate_rows_still_need_review', 'manual_hold')
    )
    or (
      cleanup_action = 'quarantine_candidate'
      and cleanup_state = 'quarantined'
      and reason_code = 'exclusion_flags_present'
    )
    or (
      cleanup_action = 'require_matcher_reclassify'
      and cleanup_state = 'needs_matcher_reclassify'
      and reason_code = 'match_confidence_below_policy'
    )
    or (
      cleanup_action = 'require_special_lane_policy'
      and cleanup_state = 'needs_special_lane_policy'
      and reason_code = 'special_lane_manual_review'
    )
    or (
      cleanup_action = 'require_high_value_review'
      and cleanup_state = 'needs_high_value_review'
      and reason_code = 'high_value_manual_review'
    )
    or (
      cleanup_action = 'defer_until_more_evidence'
      and cleanup_state = 'deferred_more_evidence'
      and reason_code in ('insufficient_listing_count', 'insufficient_seller_diversity')
    )
  ),
  constraint market_listing_candidate_cleanup_events_no_public_direct_check check (
    can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
    and can_publish_price_directly_at_action = false
  )
);

create index if not exists idx_market_listing_candidate_cleanup_events_candidate_created
  on public.market_listing_candidate_cleanup_events(candidate_id, created_at desc);

create index if not exists idx_market_listing_candidate_cleanup_events_card_lane
  on public.market_listing_candidate_cleanup_events(card_print_id, evidence_lane, cleanup_state);

create index if not exists idx_market_listing_candidate_cleanup_events_action_reason
  on public.market_listing_candidate_cleanup_events(cleanup_action, reason_code);

create index if not exists idx_market_listing_candidate_cleanup_events_public_boundary
  on public.market_listing_candidate_cleanup_events(can_publish_price_directly, publishable, app_visible, market_truth);

alter table public.market_listing_candidate_cleanup_events enable row level security;

drop policy if exists market_listing_candidate_cleanup_events_service_role_select
  on public.market_listing_candidate_cleanup_events;

create policy market_listing_candidate_cleanup_events_service_role_select
  on public.market_listing_candidate_cleanup_events
  for select
  to service_role
  using (true);

drop policy if exists market_listing_candidate_cleanup_events_service_role_insert
  on public.market_listing_candidate_cleanup_events;

create policy market_listing_candidate_cleanup_events_service_role_insert
  on public.market_listing_candidate_cleanup_events
  for insert
  to service_role
  with check (
    can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
    and can_publish_price_directly_at_action = false
  );

create or replace view public.v_market_listing_candidate_cleanup_current_v1 as
with ranked_events as (
  select
    event.*,
    row_number() over (
      partition by event.candidate_id
      order by event.created_at desc, event.id desc
    ) as event_rank
  from public.market_listing_candidate_cleanup_events event
)
select
  id as cleanup_event_id,
  candidate_id,
  card_print_id,
  gv_id,
  observation_id,
  source,
  source_listing_id,
  evidence_lane,
  cleanup_action,
  cleanup_state,
  reason_code,
  match_status_at_action,
  match_confidence_at_action,
  exclusion_flags_at_action,
  needs_review_at_action,
  can_publish_price_directly_at_action,
  reviewer_actor,
  review_note,
  action_payload,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth,
  created_at as cleanup_event_created_at
from ranked_events
where event_rank = 1;

create or replace view public.v_market_listing_candidate_cleanup_card_summary_v1 as
select
  current_state.card_print_id,
  current_state.gv_id,
  current_state.evidence_lane,
  count(*)::bigint as cleanup_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'quarantined')::bigint as quarantined_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'needs_matcher_reclassify')::bigint as matcher_reclassify_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'needs_special_lane_policy')::bigint as special_lane_policy_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'needs_high_value_review')::bigint as high_value_review_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'review_open')::bigint as keep_review_candidate_rows,
  count(*) filter (where current_state.cleanup_state = 'deferred_more_evidence')::bigint as deferred_more_evidence_candidate_rows,
  count(*) filter (
    where current_state.can_publish_price_directly
       or current_state.publishable
       or current_state.app_visible
       or current_state.market_truth
       or current_state.can_publish_price_directly_at_action
  )::bigint as public_boundary_leak_rows,
  max(current_state.cleanup_event_created_at) as latest_cleanup_event_at
from public.v_market_listing_candidate_cleanup_current_v1 current_state
group by current_state.card_print_id, current_state.gv_id, current_state.evidence_lane;

revoke all on public.market_listing_candidate_cleanup_events from public, anon, authenticated;
grant select, insert on public.market_listing_candidate_cleanup_events to service_role;

revoke all on public.v_market_listing_candidate_cleanup_current_v1 from public, anon, authenticated;
grant select on public.v_market_listing_candidate_cleanup_current_v1 to service_role;

revoke all on public.v_market_listing_candidate_cleanup_card_summary_v1 from public, anon, authenticated;
grant select on public.v_market_listing_candidate_cleanup_card_summary_v1 to service_role;

commit;

