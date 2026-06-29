-- MEE_PRICE_REVIEW_ACTION_MODEL_V1.
-- Purpose: append-only internal review decisions for price candidates that survived
-- the non-public publication policy gate.
-- Boundary: no public pricing, no app-visible prices, no pricing_observations writes,
-- no ebay_active_prices_latest writes, no card identity/vault/image writes.

begin;

create table if not exists public.market_evidence_price_review_events (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_PRICE_REVIEW_ACTION_MODEL_V1',
  policy_version text not null default 'MEE_PRICE_PUBLICATION_POLICY_V1',
  card_print_id uuid not null,
  gv_id text not null,
  source_type text not null,
  evidence_lane text not null,
  source_rollup_id text,
  currency text not null default 'USD',
  candidate_median numeric,
  candidate_low numeric,
  candidate_high numeric,
  minimum_active_ask numeric,
  maximum_active_ask numeric,
  evidence_count integer not null default 0,
  seller_count integer not null default 0,
  signal_at timestamptz,
  action_name text not null,
  review_state text not null,
  reason_code text not null,
  review_actor text not null default 'system',
  review_note text,
  action_payload jsonb not null default '{}'::jsonb,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_evidence_price_review_events_source_check check (
    source_type = 'active_listing'
  ),
  constraint market_evidence_price_review_events_lane_check check (
    evidence_lane = 'raw_single'
  ),
  constraint market_evidence_price_review_events_action_check check (
    action_name in (
      'approve_internal_price_signal',
      'hold_manual_review',
      'reject_candidate',
      'defer_more_evidence'
    )
  ),
  constraint market_evidence_price_review_events_state_check check (
    review_state in (
      'approved_internal',
      'manual_hold',
      'rejected',
      'deferred'
    )
  ),
  constraint market_evidence_price_review_events_reason_check check (
    reason_code in (
      'clean_raw_single_policy_candidate',
      'spread_review',
      'high_value_review',
      'title_sample_review',
      'special_lane_hold',
      'manual_hold',
      'evidence_quality_rejected',
      'insufficient_current_evidence'
    )
  ),
  constraint market_evidence_price_review_events_transition_check check (
    (
      action_name = 'approve_internal_price_signal'
      and review_state = 'approved_internal'
      and reason_code = 'clean_raw_single_policy_candidate'
    )
    or (
      action_name = 'hold_manual_review'
      and review_state = 'manual_hold'
      and reason_code in ('spread_review', 'high_value_review', 'title_sample_review', 'special_lane_hold', 'manual_hold')
    )
    or (
      action_name = 'reject_candidate'
      and review_state = 'rejected'
      and reason_code = 'evidence_quality_rejected'
    )
    or (
      action_name = 'defer_more_evidence'
      and review_state = 'deferred'
      and reason_code = 'insufficient_current_evidence'
    )
  ),
  constraint market_evidence_price_review_events_no_public_boundary_check check (
    can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  )
);

create index if not exists idx_market_evidence_price_review_events_card_lane_created
  on public.market_evidence_price_review_events(card_print_id, evidence_lane, created_at desc);

create index if not exists idx_market_evidence_price_review_events_action_state
  on public.market_evidence_price_review_events(action_name, review_state, reason_code);

create index if not exists idx_market_evidence_price_review_events_public_boundary
  on public.market_evidence_price_review_events(can_publish_price_directly, publishable, app_visible, market_truth);

alter table public.market_evidence_price_review_events enable row level security;

drop policy if exists market_evidence_price_review_events_service_role_select
  on public.market_evidence_price_review_events;

create policy market_evidence_price_review_events_service_role_select
  on public.market_evidence_price_review_events
  for select
  to service_role
  using (true);

drop policy if exists market_evidence_price_review_events_service_role_insert
  on public.market_evidence_price_review_events;

create policy market_evidence_price_review_events_service_role_insert
  on public.market_evidence_price_review_events
  for insert
  to service_role
  with check (
    can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  );

create or replace view public.v_market_evidence_price_review_current_v1 as
with ranked_events as (
  select
    event.*,
    row_number() over (
      partition by event.card_print_id, event.source_type, event.evidence_lane
      order by event.created_at desc, event.id desc
    ) as event_rank
  from public.market_evidence_price_review_events event
)
select
  id as price_review_event_id,
  card_print_id,
  gv_id,
  source_type,
  evidence_lane,
  source_rollup_id,
  currency,
  candidate_median,
  candidate_low,
  candidate_high,
  minimum_active_ask,
  maximum_active_ask,
  evidence_count,
  seller_count,
  signal_at,
  action_name,
  review_state,
  reason_code,
  review_actor,
  review_note,
  action_payload,
  can_publish_price_directly,
  publishable,
  app_visible,
  market_truth,
  created_at as price_review_event_created_at
from ranked_events
where event_rank = 1;

create or replace view public.v_market_evidence_internal_approved_price_signals_v1 as
select
  current_state.card_print_id,
  current_state.gv_id,
  current_state.source_type,
  current_state.evidence_lane,
  current_state.source_rollup_id,
  current_state.currency,
  current_state.candidate_median,
  current_state.candidate_low,
  current_state.candidate_high,
  current_state.minimum_active_ask,
  current_state.maximum_active_ask,
  current_state.evidence_count,
  current_state.seller_count,
  current_state.signal_at,
  current_state.reason_code,
  current_state.review_actor,
  current_state.price_review_event_created_at,
  true as internal_only,
  false as can_publish_price_directly,
  false as publishable,
  false as app_visible,
  false as market_truth
from public.v_market_evidence_price_review_current_v1 current_state
where current_state.review_state = 'approved_internal'
  and current_state.action_name = 'approve_internal_price_signal'
  and current_state.can_publish_price_directly = false
  and current_state.publishable = false
  and current_state.app_visible = false
  and current_state.market_truth = false;

revoke all on public.market_evidence_price_review_events from public, anon, authenticated;
grant select, insert on public.market_evidence_price_review_events to service_role;

revoke all on public.v_market_evidence_price_review_current_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_price_review_current_v1 to service_role;

revoke all on public.v_market_evidence_internal_approved_price_signals_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_internal_approved_price_signals_v1 to service_role;

commit;
