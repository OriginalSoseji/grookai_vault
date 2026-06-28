-- MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1 dry-run.
-- Internal readback only. No writes.

set statement_timeout = '10min';

with eligible_usd as (
  select
    n.card_print_id,
    c.gv_id,
    n.source,
    n.metric_key,
    n.normalized_price::numeric as normalized_price
  from public.market_reference_normalized_evidence n
  join public.market_reference_candidates c on c.id = n.candidate_id
  where n.model_eligible = true
    and n.model_disposition = 'reference_model_candidate'
    and n.normalized_currency = 'USD'
),
base as (
  select
    e.card_print_id,
    max(e.gv_id) as gv_id,
    min(e.normalized_price) as reference_low,
    percentile_cont(0.5) within group (order by e.normalized_price)::numeric as reference_median,
    max(e.normalized_price) as reference_high,
    count(*)::int as eligible_evidence_count,
    count(distinct e.source)::int as source_count
  from eligible_usd e
  group by e.card_print_id
),
quarantined as (
  select
    card_print_id,
    count(*)::int as quarantined_evidence_count
  from public.market_reference_normalized_evidence
  where not (model_eligible = true and model_disposition = 'reference_model_candidate')
  group by card_print_id
),
currency_excluded as (
  select
    card_print_id,
    count(*)::int as currency_excluded_evidence_count
  from public.market_reference_normalized_evidence
  where model_eligible = true
    and model_disposition = 'reference_model_candidate'
    and normalized_currency <> 'USD'
  group by card_print_id
),
scored as (
  select
    b.*,
    coalesce(q.quarantined_evidence_count, 0) as quarantined_evidence_count,
    coalesce(x.currency_excluded_evidence_count, 0) as currency_excluded_evidence_count,
    case
      when b.reference_low is null or b.reference_low <= 0 or b.reference_high is null then null
      else round((b.reference_high / b.reference_low)::numeric, 2)
    end as price_ratio
  from base b
  left join quarantined q on q.card_print_id = b.card_print_id
  left join currency_excluded x on x.card_print_id = b.card_print_id
),
reviewed as (
  select
    *,
    case
      when price_ratio is null then 'unknown_variance'
      when price_ratio >= 20 then 'extreme_variance'
      when price_ratio >= 10 then 'high_variance'
      when price_ratio >= 4 then 'moderate_variance'
      else 'bounded_variance'
    end as variance_band,
    (
      gv_id ilike '%shadowless%'
      or gv_id ~* '1st[-_[:space:]]?edition'
      or gv_id ilike '%1999-2000%'
      or gv_id ~* '(^|-)mcd($|-)'
      or gv_id ilike '%mcdonald%'
      or gv_id ~* '(^|-)tk($|-)'
      or gv_id ilike '%trainer%kit%'
      or gv_id ilike '%world%championship%'
      or gv_id ~* 'wc[0-9]{2,4}'
      or gv_id ilike '%staff%'
      or gv_id ilike '%prerelease%'
    ) as is_special_lane
  from scored
),
statused as (
  select
    *,
    case
      when is_special_lane then 'blocked_special_lane_review'
      when variance_band in ('extreme_variance', 'high_variance') then 'review_required_high_variance'
      when source_count < 2 then 'review_required_single_source'
      when variance_band = 'moderate_variance'
        or currency_excluded_evidence_count > 0
        or quarantined_evidence_count > 0
        then 'review_required_context'
      when source_count >= 2 then 'review_ready_multi_source'
      else 'review_required_single_source'
    end as review_status
  from reviewed
),
flags as (
  select
    *,
    array_remove(array[
      case when variance_band <> 'bounded_variance' then variance_band end,
      case when source_count < 2 then 'single_source_only' end,
      case when eligible_evidence_count < 3 then 'thin_evidence' end,
      case when currency_excluded_evidence_count > 0 then 'non_usd_evidence_excluded' end,
      case when quarantined_evidence_count > 0 then 'quarantined_context_present' end,
      case when is_special_lane then 'special_lane_review_required' end
    ], null)::text[] as review_flags
  from statused
)
select
  count(*)::int as proposed_rollup_rows,
  count(*) filter (where source_count >= 2)::int as multi_source_rows,
  count(*) filter (where source_count = 1)::int as single_source_rows,
  count(*) filter (where review_status = 'review_ready_multi_source')::int as review_ready_rows,
  count(*) filter (where review_status like 'blocked%')::int as blocked_rows,
  count(*) filter (where false)::int as publishable_rows,
  count(*) filter (where false)::int as app_visible_rows,
  count(*) filter (where false)::int as market_truth_rows,
  (
    select jsonb_object_agg(review_status, status_count order by review_status)
    from (
      select review_status, count(*)::int as status_count
      from flags
      group by review_status
    ) s
  ) as status_counts
from flags;
