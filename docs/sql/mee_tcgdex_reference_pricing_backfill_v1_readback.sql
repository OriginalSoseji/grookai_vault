-- MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1 post-apply readback.
-- Expected counts are supplied by the plan artifact.
select
  source,
  count(*) as candidate_rows,
  count(distinct card_print_id) as unique_card_prints,
  bool_or(can_publish_price_directly) as any_direct_publish,
  bool_and(needs_review) as all_need_review
from public.market_reference_candidates
where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
group by source
order by source;

select
  source,
  count(*) as normalized_rows,
  count(*) filter (where model_eligible) as model_eligible_rows,
  count(*) filter (where model_disposition = 'quarantined_metric') as quarantined_metric_rows,
  count(distinct card_print_id) as unique_card_prints
from public.market_reference_normalized_evidence
where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
group by source
order by source;
