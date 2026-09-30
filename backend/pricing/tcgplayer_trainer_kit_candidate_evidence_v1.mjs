// Reused by both canary and full publication queries. Joins are one-to-one;
// the correlated review check cannot multiply market observations.
export const TRAINER_KIT_CANDIDATE_COLUMNS_V1 = `
  pilot_parent.set_id::text as set_id,
  pilot_parent.set_code,
  pilot_parent.name as canonical_name,
  pilot_parent.number as canonical_number,
  pilot_parent.variant_key,
  pilot_printing.is_provisional as printing_is_provisional,
  case when candidate.source_product_id in (88393, 84427) then
    exists (
      select 1 from public.card_printing_truth_reviews review
      where review.card_printing_id = candidate.card_printing_id
        and review.active = true and review.review_status = 'verified'
        and review.public_visibility = 'visible'
    ) and not exists (
      select 1 from public.card_printing_truth_reviews review
      where review.card_printing_id = candidate.card_printing_id
        and review.active = true
        and (review.review_status is distinct from 'verified'
          or review.public_visibility is distinct from 'visible')
    )
  else false end as printing_truth_verified`;

export const TRAINER_KIT_CANDIDATE_JOINS_V1 = `
  left join public.card_prints pilot_parent on pilot_parent.id = candidate.card_print_id
    and candidate.source_product_id in (88393, 84427)
  left join public.card_printings pilot_printing on pilot_printing.id = candidate.card_printing_id
    and pilot_printing.card_print_id = pilot_parent.id`;
