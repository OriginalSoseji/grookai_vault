-- MEE-TCGDEX-REFERENCE-PRICING-BACKFILL-PLAN-V1 preflight only.
-- Read-only guard. Do not edit into an apply script.
select
  source,
  count(*) as existing_candidate_rows
from public.market_reference_candidates
where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
group by source
order by source;

select
  source,
  count(*) as existing_normalized_rows
from public.market_reference_normalized_evidence
where source in ('tcgdex_tcgplayer_reference', 'tcgdex_cardmarket_reference')
group by source
order by source;
