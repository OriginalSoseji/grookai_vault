-- MEE_CORE_INTERNAL_EVIDENCE_READ_MODEL_V1 local SQL/view candidates.
-- Plan only. Do not apply remotely without a separate targeted approval.
-- Internal-only read models. No pricing_observations writes, no public pricing views,
-- no app-visible pricing, no price rollups, no identity/vault/image writes.

create or replace view public.v_market_evidence_card_signal_summary_v1
with (security_invoker = true)
as
with final_events as (
  select
    observation_id,
    needs_review,
    model_eligible,
    rollup_eligible,
    publishable,
    app_visible,
    market_truth,
    evidence_class,
    quality_flags,
    exclusion_flags
  from public.market_evidence_lifecycle_events
  where to_state = 'rollup_eligible'
),
joined as (
  select
    o.card_print_id,
    o.gv_id,
    o.source,
    o.source_type,
    o.observed_at,
    f.needs_review,
    f.model_eligible,
    f.rollup_eligible,
    f.publishable,
    f.app_visible,
    f.market_truth,
    f.evidence_class,
    cardinality(f.quality_flags) as quality_flag_count,
    cardinality(f.exclusion_flags) as exclusion_flag_count
  from public.market_evidence_observations o
  join final_events f on f.observation_id = o.id
  where o.card_print_id is not null
)
select
  card_print_id,
  min(gv_id) as sample_gv_id,
  count(*)::int as evidence_count,
  count(*) filter (where source_type = 'reference')::int as reference_evidence_count,
  count(*) filter (where source_type = 'active_listing')::int as active_listing_evidence_count,
  count(distinct source)::int as source_family_count,
  count(*) filter (where needs_review)::int as needs_review_count,
  count(*) filter (where model_eligible)::int as model_eligible_count,
  count(*) filter (where rollup_eligible)::int as rollup_eligible_count,
  count(*) filter (where publishable)::int as publishable_count,
  count(*) filter (where app_visible)::int as app_visible_count,
  count(*) filter (where market_truth)::int as market_truth_count,
  count(*) filter (where evidence_class = 'reference_metric')::int as reference_metric_count,
  count(*) filter (where evidence_class = 'raw_single')::int as raw_single_count,
  count(*) filter (where evidence_class = 'slab')::int as slab_count,
  count(*) filter (where evidence_class not in ('reference_metric', 'raw_single', 'slab'))::int as review_required_evidence_count,
  sum(quality_flag_count)::int as quality_flag_count,
  sum(exclusion_flag_count)::int as exclusion_flag_count,
  min(observed_at) as first_observed_at,
  max(observed_at) as last_observed_at,
  case
    when count(*) filter (where publishable) > 0 then false
    when count(*) filter (where app_visible) > 0 then false
    when count(*) filter (where market_truth) > 0 then false
    when count(*) filter (where rollup_eligible) >= 3 then true
    else false
  end as internal_rollup_candidate,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from joined
group by card_print_id;

create or replace view public.v_market_evidence_card_review_queue_v1
with (security_invoker = true)
as
select
  *,
  case
    when rollup_eligible_count >= 10 and source_family_count >= 2 then 'high_signal_review'
    when rollup_eligible_count >= 3 then 'candidate_review'
    when active_listing_evidence_count >= 25 and rollup_eligible_count = 0 then 'classification_review'
    when reference_evidence_count > 0 and active_listing_evidence_count = 0 then 'reference_only_review'
    else 'low_signal_monitor'
  end as review_lane
from public.v_market_evidence_card_signal_summary_v1
where needs_review = true;
