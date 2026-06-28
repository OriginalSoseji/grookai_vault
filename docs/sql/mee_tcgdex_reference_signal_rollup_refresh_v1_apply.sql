-- MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1 apply.
-- Inserts one internal-only signal rollup version after TCGdex reference pricing evidence.
-- Boundary: no public pricing, no app-visible pricing, no pricing_observations writes,
-- no ebay_active_prices_latest writes, no identity/card/vault/image writes, no deletes/upserts/merges.

set statement_timeout = '10min';

insert into public.market_reference_signal_rollups (
  card_print_id,
  gv_id,
  rollup_version,
  read_model_version,
  review_gate_version,
  rollup_lane,
  review_status,
  currency,
  reference_low,
  reference_median,
  reference_high,
  source_count,
  eligible_evidence_count,
  quarantined_evidence_count,
  currency_excluded_evidence_count,
  price_ratio,
  variance_band,
  review_flags,
  source_summary,
  signal_payload,
  needs_review,
  publishable,
  app_visible,
  market_truth
)
with existing_version as (
  select count(*)::int as row_count
  from public.market_reference_signal_rollups
  where rollup_version = 'MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1'
),
eligible_usd as (
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
  f.card_print_id,
  f.gv_id,
  'MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1'::text as rollup_version,
  'MEE_09B_INTERNAL_REFERENCE_SIGNAL_READ_MODEL_V1'::text as read_model_version,
  'MEE_09C_REFERENCE_SIGNAL_REVIEW_GATE_V1'::text as review_gate_version,
  'internal_reference_signal'::text as rollup_lane,
  f.review_status,
  'USD'::text as currency,
  f.reference_low,
  round(f.reference_median, 2) as reference_median,
  f.reference_high,
  f.source_count,
  f.eligible_evidence_count,
  f.quarantined_evidence_count,
  f.currency_excluded_evidence_count,
  f.price_ratio,
  f.variance_band,
  f.review_flags,
  jsonb_build_object(
    'source_count', f.source_count,
    'signal_band', case
      when f.source_count >= 2 and f.eligible_evidence_count >= 3 then 'multi_source_reference_candidate'
      when f.source_count >= 1 and f.eligible_evidence_count >= 2 then 'single_source_reference_candidate'
      else 'thin_reference_candidate'
    end
  ) as source_summary,
  jsonb_build_object(
    'package_id', 'MEE-TCGDEX-REFERENCE-SIGNAL-ROLLUP-REFRESH-V1',
    'rollup_version', 'MEE_13A_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_TCGDEX_REFERENCE_PRICING_V1',
    'card_print_id', f.card_print_id,
    'gv_id', f.gv_id,
    'internal_only', true,
    'publishable', false,
    'app_visible', false,
    'market_truth', false
  ) as signal_payload,
  true as needs_review,
  false as publishable,
  false as app_visible,
  false as market_truth
from flags f
cross join existing_version ev
where ev.row_count = 0
order by f.gv_id nulls last, f.card_print_id;
