import {TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V2} from './tcgplayer_reviewed_special_candidate_evidence_v2.mjs';
import {PLAY_STAMP_NORMAL_PRODUCT_IDS_V1} from './play_stamp_normal_publication_authority_v1.mjs';
import {REVIEWED_PLAY_NORMAL_NINE_PRODUCT_IDS_V1} from './reviewed_play_normal_nine_registry_v1.mjs';
import {REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1} from './reviewed_stamped_reverse_registry_v1.mjs';
export const TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V4=Object.freeze([...new Set([
  ...TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V2,...REVIEWED_PLAY_NORMAL_NINE_PRODUCT_IDS_V1,...REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1])].sort((a,b)=>a-b));
const ids=TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V4.join(',');
const playIds=[...PLAY_STAMP_NORMAL_PRODUCT_IDS_V1,...REVIEWED_PLAY_NORMAL_NINE_PRODUCT_IDS_V1,...REVIEWED_STAMPED_REVERSE_PRODUCT_IDS_V1].sort((a,b)=>a-b).join(',');
export const REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V4=`
 reviewed_parent.set_id::text as set_id,
 reviewed_parent.set_code,
 reviewed_parent.name as canonical_name,
 reviewed_parent.number as canonical_number,
 reviewed_parent.variant_key,
 reviewed_parent.printed_identity_modifier as reviewed_printed_identity_modifier,
 reviewed_printing.is_provisional as printing_is_provisional,
 reviewed_printing.provenance_source as reviewed_printing_provenance_source,
 reviewed_printing.provenance_ref as reviewed_printing_provenance_ref,
 reviewed_printing.created_by as reviewed_printing_created_by,
 case when candidate.source_product_id in (${ids}) then
  exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=candidate.card_printing_id and r.active and r.review_status='verified' and r.public_visibility='visible')
  and not exists(select 1 from public.card_printing_truth_reviews r where r.card_printing_id=candidate.card_printing_id and r.active and(r.review_status is distinct from 'verified' or r.public_visibility is distinct from 'visible'))
 else false end as printing_truth_verified,
 case when reviewed_parent.id is not null then
  (select case when count(*)=1 then min(i.id::text) end from public.card_print_identity i where i.card_print_id=reviewed_parent.id and i.is_active)
 end as reviewed_identity_id,
 case when reviewed_printing.id is not null then
  (select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.card_printing_truth_reviews r where r.card_printing_id=reviewed_printing.id and r.active)
 else '[]'::jsonb end as reviewed_printing_truth_reviews,
 reviewed_source.extended_data as reviewed_source_extended_data`;
export const REVIEWED_SPECIAL_CANDIDATE_JOINS_V4=`
 left join public.card_prints reviewed_parent on reviewed_parent.id=candidate.card_print_id and candidate.source_product_id in (${ids})
 left join public.card_printings reviewed_printing on reviewed_printing.id=candidate.card_printing_id and reviewed_printing.card_print_id=reviewed_parent.id
 left join public.tcgcsv_source_products reviewed_source on reviewed_source.product_id=candidate.source_product_id and candidate.source_product_id in (${playIds})`;
