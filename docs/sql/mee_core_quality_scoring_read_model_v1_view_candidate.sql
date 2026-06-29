-- MEE-CORE-QUALITY-SCORING-READ-MODEL-V1 local view candidate.
-- Internal-only quality scoring read model. Do not remotely apply without explicit schema approval.
-- This view scores evidence quality only. It cannot publish pricing or create market truth.

create or replace view public.v_market_evidence_candidate_quality_scores_v1 as
with remaining as (
  select
    id as disposition_id,
    card_print_id,
    gv_id,
    review_lane,
    evidence_lane,
    review_status,
    review_disposition,
    needs_review as disposition_needs_review,
    publication_gate_candidate,
    can_publish_price_directly as disposition_can_publish_price_directly,
    publishable as disposition_publishable,
    app_visible as disposition_app_visible,
    market_truth as disposition_market_truth
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), candidate_rows as (
  select
    r.disposition_id,
    r.card_print_id,
    r.gv_id,
    r.review_lane,
    r.evidence_lane,
    r.review_status,
    r.review_disposition,
    r.disposition_needs_review,
    c.id as candidate_id,
    c.observation_id,
    c.raw_snapshot_id,
    c.source,
    c.source_listing_id,
    c.match_version,
    c.match_status,
    c.match_confidence,
    c.needs_review as candidate_needs_review,
    c.can_publish_price_directly as candidate_can_publish_price_directly,
    coalesce(c.exclusion_flags, '{}'::text[]) as exclusion_flags,
    coalesce(c.title_features->>'listing_evidence_class', 'unknown') as listing_evidence_class,
    c.candidate_hash,
    r.publication_gate_candidate,
    r.disposition_can_publish_price_directly,
    r.disposition_publishable,
    r.disposition_app_visible,
    r.disposition_market_truth,
    c.created_at
  from public.market_listing_card_candidates c
  join remaining r on r.card_print_id = c.card_print_id
), classified as (
  select
    *,
    match_confidence < 0.80 as low_match_confidence,
    (
      (evidence_lane = 'raw_single' and listing_evidence_class = 'slab')
      or (evidence_lane = 'slab' and listing_evidence_class = 'raw_single')
    ) as lane_mismatch_raw_vs_slab,
    exists (
      select 1
      from unnest(exclusion_flags) as flag
      where flag in ('lot', 'sealed', 'choose_your_card', 'jumbo', 'menu_listing', 'sleeve_accessory')
    ) as hard_exclusion_flag,
    exists (
      select 1
      from unnest(exclusion_flags) as flag
      where flag in ('foreign_language')
    ) as manual_policy_flag,
    array_length(exclusion_flags, 1) is not null as has_any_exclusion_flag,
    candidate_needs_review = true as review_required,
    not (
      publication_gate_candidate
      or disposition_can_publish_price_directly
      or disposition_publishable
      or disposition_app_visible
      or disposition_market_truth
      or candidate_can_publish_price_directly
    ) as public_boundary_clear
  from candidate_rows
), scored as (
  select
    *,
    (
      review_required
      and not hard_exclusion_flag
      and not manual_policy_flag
      and not has_any_exclusion_flag
    ) as review_required_without_exclusion,
    case
      when hard_exclusion_flag then 'exclude'
      when lane_mismatch_raw_vs_slab then 'reclassify_lane'
      when manual_policy_flag then 'manual_policy_review'
      when low_match_confidence then 'identity_confidence_review'
      when candidate_needs_review then 'threshold_review_required'
      else 'threshold_eligible_candidate'
    end as quality_action,
    (
      public_boundary_clear
      and not hard_exclusion_flag
      and not lane_mismatch_raw_vs_slab
      and not manual_policy_flag
      and not low_match_confidence
      and not candidate_needs_review
    ) as quality_rollup_eligible
  from classified
)
select
  disposition_id,
  card_print_id,
  gv_id,
  review_lane,
  evidence_lane,
  review_status,
  review_disposition,
  candidate_id,
  observation_id,
  raw_snapshot_id,
  source,
  source_listing_id,
  match_version,
  match_status,
  match_confidence,
  candidate_hash,
  listing_evidence_class,
  exclusion_flags,
  low_match_confidence,
  lane_mismatch_raw_vs_slab,
  hard_exclusion_flag,
  manual_policy_flag,
  review_required,
  review_required_without_exclusion,
  public_boundary_clear,
  quality_action,
  quality_rollup_eligible,
  false as can_auto_confirm_internal_candidate,
  false as publishable,
  false as app_visible,
  false as market_truth,
  created_at
from scored;

revoke all on public.v_market_evidence_candidate_quality_scores_v1 from public, anon, authenticated;
grant select on public.v_market_evidence_candidate_quality_scores_v1 to service_role;
