import {
  TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1,
} from "./tcgplayer_wcd_team_rushdown_pilot_v1.mjs";

export const TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V1 = Object.freeze([
  84427,
  88393,
  ...TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.source_product_id),
].sort((left, right) => left - right));

const productIdsSql = TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V1.join(",");

// Reused by both canary and full publication queries. Joins are one-to-one;
// the correlated review check cannot multiply market observations.
export const REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V1 = `
  reviewed_parent.set_id::text as set_id,
  reviewed_parent.set_code,
  reviewed_parent.name as canonical_name,
  reviewed_parent.number as canonical_number,
  reviewed_parent.variant_key,
  reviewed_printing.is_provisional as printing_is_provisional,
  case when candidate.source_product_id in (${productIdsSql}) then
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

export const REVIEWED_SPECIAL_CANDIDATE_JOINS_V1 = `
  left join public.card_prints reviewed_parent on reviewed_parent.id = candidate.card_print_id
    and candidate.source_product_id in (${productIdsSql})
  left join public.card_printings reviewed_printing on reviewed_printing.id = candidate.card_printing_id
    and reviewed_printing.card_print_id = reviewed_parent.id`;
