-- MEE_SLAB_PRICE_REVIEW_EVENTS_V1
-- Separate internal review lane for graded/slab active-listing evidence.
-- Slab signals never become app-visible prices through this table.

begin;

create table if not exists public.market_evidence_slab_review_events (
  id uuid primary key default gen_random_uuid(),
  contract_version text not null default 'MEE_SLAB_PRICE_REVIEW_EVENTS_V1',
  card_print_id uuid not null,
  gv_id text not null,
  source_type text not null default 'active_listing',
  evidence_lane text not null default 'slab',
  source_rollup_id text not null,
  currency text not null default 'USD',
  candidate_median numeric,
  candidate_low numeric,
  candidate_high numeric,
  minimum_active_ask numeric,
  maximum_active_ask numeric,
  evidence_count integer not null default 0,
  seller_count integer not null default 0,
  signal_at timestamptz not null,
  action_name text not null,
  review_state text not null,
  reason_code text not null,
  review_actor text not null,
  review_note text,
  action_payload jsonb not null default '{}'::jsonb,
  can_publish_price_directly boolean not null default false,
  publishable boolean not null default false,
  app_visible boolean not null default false,
  market_truth boolean not null default false,
  created_at timestamptz not null default now(),
  constraint market_evidence_slab_review_events_source_check check (source_type = 'active_listing'),
  constraint market_evidence_slab_review_events_lane_check check (evidence_lane = 'slab'),
  constraint market_evidence_slab_review_events_action_check check (
    action_name in ('hold_manual_review', 'reject_candidate', 'defer_more_evidence')
  ),
  constraint market_evidence_slab_review_events_state_check check (
    review_state in ('manual_hold', 'rejected', 'deferred')
  ),
  constraint market_evidence_slab_review_events_reason_check check (
    reason_code in ('spread_review', 'evidence_quality_rejected', 'insufficient_current_evidence', 'special_lane_hold')
  ),
  constraint market_evidence_slab_review_events_transition_check check (
    (action_name = 'hold_manual_review' and review_state = 'manual_hold' and reason_code in ('spread_review', 'special_lane_hold'))
    or (action_name = 'reject_candidate' and review_state = 'rejected' and reason_code = 'evidence_quality_rejected')
    or (action_name = 'defer_more_evidence' and review_state = 'deferred' and reason_code = 'insufficient_current_evidence')
  ),
  constraint market_evidence_slab_review_events_no_public_boundary_check check (
    can_publish_price_directly = false
    and publishable = false
    and app_visible = false
    and market_truth = false
  )
);

create index if not exists market_evidence_slab_review_events_rollup_idx
  on public.market_evidence_slab_review_events(source_rollup_id, created_at desc);
create index if not exists market_evidence_slab_review_events_card_idx
  on public.market_evidence_slab_review_events(card_print_id, created_at desc);

create or replace view public.v_market_evidence_slab_review_current_v1
with (security_invoker = true)
as
select distinct on (event.source_rollup_id)
  event.*
from public.market_evidence_slab_review_events event
order by event.source_rollup_id, event.created_at desc, event.id desc;

alter table public.market_evidence_slab_review_events enable row level security;
drop policy if exists market_evidence_slab_review_events_service_role_select
  on public.market_evidence_slab_review_events;
drop policy if exists market_evidence_slab_review_events_service_role_insert
  on public.market_evidence_slab_review_events;
create policy market_evidence_slab_review_events_service_role_select
  on public.market_evidence_slab_review_events for select to service_role using (true);
create policy market_evidence_slab_review_events_service_role_insert
  on public.market_evidence_slab_review_events for insert to service_role
  with check (can_publish_price_directly = false and publishable = false and app_visible = false and market_truth = false);

revoke all on public.market_evidence_slab_review_events from public, anon, authenticated;
grant select, insert on public.market_evidence_slab_review_events to service_role;
revoke all on public.v_market_evidence_slab_review_current_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_slab_review_current_v1 to service_role;

commit;
