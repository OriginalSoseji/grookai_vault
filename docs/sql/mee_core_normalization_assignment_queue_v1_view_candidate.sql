-- MEE-NORMALIZATION-GVID-ASSIGNMENT-AUDIT-V1 local view candidate.
-- Purpose: internal-only queue for active-listing rows that did not cleanly normalize to card_print_id/gv_id.
-- Boundary: candidate SQL only. Do not apply remotely without a targeted schema approval.

create or replace view public.v_market_evidence_normalization_assignment_queue_v1 as
with listing_events as (
  select
    e.id as price_event_id,
    e.observation_id,
    e.source,
    e.source_listing_id,
    e.current_total_ask_price,
    e.currency,
    e.event_payload,
    o.listing_title,
    o.condition_text,
    o.seller_key,
    o.observed_at
  from public.market_listing_price_events e
  join public.market_listing_observations o on o.id = e.observation_id
), candidate_rows as (
  select
    c.id as candidate_id,
    c.observation_id,
    c.source,
    c.source_listing_id,
    c.card_print_id,
    c.gv_id as candidate_gv_id,
    c.match_status,
    c.match_confidence,
    c.title_features,
    c.exclusion_flags,
    c.needs_review,
    c.can_publish_price_directly
  from public.market_listing_card_candidates c
), joined as (
  select
    e.*,
    c.candidate_id,
    c.card_print_id,
    c.candidate_gv_id,
    cp.gv_id as canonical_gv_id,
    c.match_status,
    c.match_confidence,
    c.title_features,
    c.exclusion_flags,
    c.needs_review,
    c.can_publish_price_directly
  from listing_events e
  left join candidate_rows c
    on c.observation_id = e.observation_id
   and c.source = e.source
   and c.source_listing_id = e.source_listing_id
  left join public.card_prints cp on cp.id = c.card_print_id
)
select
  price_event_id,
  observation_id,
  candidate_id,
  source,
  source_listing_id,
  listing_title,
  condition_text,
  seller_key,
  observed_at,
  current_total_ask_price,
  currency,
  card_print_id,
  coalesce(canonical_gv_id, candidate_gv_id) as gv_id,
  match_status,
  match_confidence,
  title_features,
  exclusion_flags,
  case
    when candidate_id is null and event_payload->>'listing_evidence_class' = 'excluded_or_ambiguous' then 'excluded_or_ambiguous_non_candidate'
    when candidate_id is null then 'missing_candidate'
    when card_print_id is null then 'missing_card_print_id'
    when canonical_gv_id is null and candidate_gv_id is null then 'missing_gv_id'
    when can_publish_price_directly then 'public_boundary_violation'
    else 'assigned_review_only'
  end as assignment_queue_reason,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from joined
where candidate_id is null
   or card_print_id is null
   or (canonical_gv_id is null and candidate_gv_id is null)
   or can_publish_price_directly;

revoke all on public.v_market_evidence_normalization_assignment_queue_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_normalization_assignment_queue_v1 to service_role;
