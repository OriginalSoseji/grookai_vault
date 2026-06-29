-- MEE-CORE-QUALITY-FLAG-TAXONOMY-V1 readback.
-- Read-only quality flag taxonomy audit for remaining candidate-review rows.

with remaining as (
  select card_print_id, evidence_lane
  from public.market_evidence_review_dispositions
  where needs_review = true
    and review_status = 'pending'
    and evidence_lane in ('raw_single', 'slab')
), candidates as (
  select
    c.*,
    r.evidence_lane,
    coalesce(c.title_features->>'listing_evidence_class', 'unknown') as listing_evidence_class
  from public.market_listing_card_candidates c
  join remaining r on r.card_print_id = c.card_print_id
), classified as (
  select
    *,
    array_length(exclusion_flags, 1) is not null as has_exclusion_flags,
    (
      (evidence_lane = 'raw_single' and listing_evidence_class = 'slab')
      or (evidence_lane = 'slab' and listing_evidence_class = 'raw_single')
    ) as has_lane_mismatch,
    match_confidence < 0.80 as has_low_match_confidence,
    needs_review = true as has_review_required
  from candidates
), lane_summary as (
  select
    evidence_lane,
    count(*)::int as candidate_rows,
    count(*) filter (where has_review_required)::int as review_required_rows,
    count(*) filter (where has_low_match_confidence)::int as low_confidence_rows,
    count(*) filter (where has_lane_mismatch)::int as lane_mismatch_rows,
    count(*) filter (where has_exclusion_flags)::int as exclusion_flagged_rows,
    count(*) filter (where not has_exclusion_flags)::int as no_exclusion_flag_rows,
    min(match_confidence) as min_confidence,
    percentile_disc(0.5) within group (order by match_confidence) as median_confidence,
    max(match_confidence) as max_confidence
  from classified
  group by 1
), class_summary as (
  select
    evidence_lane,
    listing_evidence_class,
    count(*)::int as rows
  from classified
  group by 1,2
), exclusion_summary as (
  select
    evidence_lane,
    coalesce(flag, '__none__') as exclusion_flag,
    count(*)::int as rows
  from classified
  left join lateral unnest(exclusion_flags) as flag on true
  group by 1,2
), condition_summary as (
  select
    classified.evidence_lane,
    coalesce(o.condition_text, '__null__') as condition_text,
    count(*)::int as rows
  from classified
  join public.market_listing_observations o on o.id = classified.observation_id
  group by 1,2
)
select
  'MEE-CORE-QUALITY-FLAG-TAXONOMY-V1'::text as package_id,
  (select jsonb_agg(to_jsonb(lane_summary) order by evidence_lane) from lane_summary) as lane_summary,
  (select jsonb_agg(to_jsonb(class_summary) order by evidence_lane, listing_evidence_class) from class_summary) as class_summary,
  (select jsonb_agg(to_jsonb(exclusion_summary) order by rows desc, evidence_lane, exclusion_flag) from exclusion_summary) as exclusion_summary,
  (select jsonb_agg(to_jsonb(condition_summary) order by rows desc, evidence_lane, condition_text) from condition_summary) as condition_summary;
