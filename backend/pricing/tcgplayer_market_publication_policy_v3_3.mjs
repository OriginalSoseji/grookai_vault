import {evaluateTcgplayerMarketQualificationV3_2} from './tcgplayer_market_publication_policy_v3_2.mjs';
import {isReviewedJapaneseSixNumberedSingleV1,resolveGovernedJapaneseSixNumberedSingleV1} from './governed_japanese_six_numbered_single_v1.mjs';
export {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';

// Worker32 changes only six individually reviewed single-card kind decisions.
// Original source/price/finish/language/duplicate/coverage/activation guards remain.
export function evaluateTcgplayerMarketQualificationV3_3(row={},options={}) {
 const prior=evaluateTcgplayerMarketQualificationV3_2(row,options);
 if(!isReviewedJapaneseSixNumberedSingleV1(row))return prior;
 const proof=resolveGovernedJapaneseSixNumberedSingleV1(row,options);
 if(!proof){
  if(prior.decision!=='publish')return prior;
  return {...prior,decision:'quarantine',eligible:false,publication_lane:'quarantine',
   reason_codes:[...prior.reason_codes,'governed_japanese_six_single_kind_authority_missing'],
   evidence:{...prior.evidence,publication_lane:'quarantine',governed_japanese_six_single_kind_authority_missing:true}};
 }
 if(prior.decision!=='exclude'||prior.reason_codes.length!==1||prior.reason_codes[0]!=='unsupported_product_kind'||
    prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||
    prior.language_result!=='japanese'||prior.duplicate_product_result!=='unique')return prior;
 return {...prior,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],
  evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,
   predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',
   product_scope_rule_id:'governed_japanese_six_numbered_single_v1',product_scope_policy_version:'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2_4',
   governed_japanese_six_single_card_evidence:proof,market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
