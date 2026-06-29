-- MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1 preflight.
-- Read-only. This SQL must not be edited into an apply script.

select
  conrelid::regclass::text as table_name,
  conname,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid in (
  'public.market_reference_candidates'::regclass,
  'public.market_reference_normalized_evidence'::regclass,
  'public.market_reference_raw_snapshots'::regclass,
  'public.market_reference_acquisition_runs'::regclass,
  'public.market_reference_coverage_reports'::regclass
)
order by table_name, conname;

select
  source,
  count(*)::bigint as candidate_rows,
  count(*) filter (where needs_review is not true)::bigint as unsafe_review_rows,
  count(*) filter (where can_publish_price_directly is true)::bigint as direct_publish_rows
from public.market_reference_candidates
where source in (
  'tcgdex_tcgplayer_reference',
  'tcgdex_cardmarket_reference',
  'pokemontcg_io_reference',
  'tcgcsv_reference'
)
group by source
order by source;

select
  source,
  candidate_hash,
  count(*)::bigint as duplicate_rows
from public.market_reference_candidates
where source in (
  'tcgdex_tcgplayer_reference',
  'tcgdex_cardmarket_reference',
  'pokemontcg_io_reference',
  'tcgcsv_reference'
)
group by source, candidate_hash
having count(*) > 1
order by duplicate_rows desc, source
limit 50;

select
  source,
  count(*)::bigint as normalized_rows,
  count(*) filter (where normalized_currency is distinct from 'USD' and source <> 'tcgdex_cardmarket_reference')::bigint as unexpected_non_usd_rows,
  count(*) filter (where model_eligible is true)::bigint as model_eligible_rows
from public.market_reference_normalized_evidence
where source in (
  'tcgdex_tcgplayer_reference',
  'tcgdex_cardmarket_reference',
  'pokemontcg_io_reference',
  'tcgcsv_reference'
)
group by source
order by source;
