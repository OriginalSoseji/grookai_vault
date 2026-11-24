import {evaluateTcgplayerMarketQualificationV3_1} from './tcgplayer_market_publication_policy_v3_1.mjs';
import {isReviewedMtgMappedSingleKindV1,resolveGovernedMtgMappedSingleKindV1} from './governed_mtg_mapped_single_kind_v1.mjs';
export {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';

// Worker30 owns this bounded kind correction. Keep V3 pipeline authority and
// the existing V1_3 MTG decision lineage; no database guard or price is changed.
export function evaluateTcgplayerMarketQualificationV3_2(row={},options={}) {
 const prior=evaluateTcgplayerMarketQualificationV3_1(row,options);
 if(!isReviewedMtgMappedSingleKindV1(row))return prior;
 const proof=resolveGovernedMtgMappedSingleKindV1(row);
 if(!proof){
  if(prior.decision!=='publish')return prior;
  return {...prior,decision:'quarantine',eligible:false,publication_lane:'quarantine',
   reason_codes:[...prior.reason_codes,'governed_mtg_single_kind_authority_missing'],
   evidence:{...prior.evidence,publication_lane:'quarantine',governed_mtg_single_kind_authority_missing:true}};
 }
 if(prior.decision!=='exclude'||prior.reason_codes.length!==1||prior.reason_codes[0]!=='unsupported_product_kind'||
    prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||
    prior.language_result!=='english'||prior.duplicate_product_result!=='unique')return prior;
 return {...prior,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],
  evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,
   predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',
   product_scope_rule_id:'governed_mtg_mapped_single_kind_v1',product_scope_policy_version:'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2_3',
   governed_mtg_single_card_evidence:proof,market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
