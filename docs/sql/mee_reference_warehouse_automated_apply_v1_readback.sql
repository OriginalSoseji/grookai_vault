-- MEE-REFERENCE-WAREHOUSE-AUTOMATED-APPLY-V1 readback.
-- Read-only post-run proof for future internal writer packages.

select
  source,
  count(*)::bigint as candidate_rows,
  count(distinct card_print_id)::bigint as unique_card_prints,
  max(observed_at) as latest_observed_at,
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
  count(*)::bigint as normalized_rows,
  count(distinct card_print_id)::bigint as unique_card_prints,
  count(*) filter (where model_eligible is true)::bigint as model_eligible_rows,
  count(*) filter (where model_disposition <> 'reference_model_candidate')::bigint as non_model_candidate_rows
from public.market_reference_normalized_evidence
where source in (
  'tcgdex_tcgplayer_reference',
  'tcgdex_cardmarket_reference',
  'pokemontcg_io_reference',
  'tcgcsv_reference'
)
group by source
order by source;

select
  bridge_state,
  count(*)::bigint as rows,
  count(*) filter (where internal_bridge_candidate)::bigint as internal_bridge_candidates,
  count(*) filter (where publishable or app_visible or market_truth or can_publish_price_directly)::bigint as public_boundary_leaks
from public.v_market_evidence_publication_bridge_candidates_v1
group by bridge_state
order by rows desc;
