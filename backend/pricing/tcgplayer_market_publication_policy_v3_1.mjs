import {evaluateTcgplayerMarketQualificationV3} from './tcgplayer_market_publication_policy_v3.mjs';
import {isReviewedJapaneseNumberedSingleV1,resolveGovernedJapaneseNumberedSingleV1} from './governed_japanese_numbered_single_v1.mjs';
export {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';

// Worker29 owns the changed execution authority. Preserve the V3 pipeline and
// database-pinned V2 Japanese decision lineage, just as the One Piece kind fix.
export function evaluateTcgplayerMarketQualificationV3_1(row={},options={}) {
 const prior=evaluateTcgplayerMarketQualificationV3(row,options);
 if(!isReviewedJapaneseNumberedSingleV1(row))return prior;
 const proof=resolveGovernedJapaneseNumberedSingleV1(row);
 if(!proof){
  if(prior.decision!=='publish')return prior;
  return {...prior,decision:'quarantine',eligible:false,publication_lane:'quarantine',
   reason_codes:[...prior.reason_codes,'governed_japanese_single_authority_missing'],
   evidence:{...prior.evidence,publication_lane:'quarantine',governed_japanese_single_authority_missing:true}};
 }
 if(prior.decision!=='exclude'||prior.reason_codes.length!==1||prior.reason_codes[0]!=='unsupported_product_kind'||
    prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||
    prior.language_result!=='japanese'||prior.duplicate_product_result!=='unique')return prior;
 return {...prior,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],
  evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,
   predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',
   product_scope_rule_id:'governed_japanese_numbered_single_v1',product_scope_policy_version:'TCGPLAYER_MARKET_PRODUCT_SCOPE_POLICY_V2_2',
   governed_japanese_single_card_evidence:proof,market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
