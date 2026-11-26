import {evaluateTcgplayerMarketQualificationV3_3} from './tcgplayer_market_publication_policy_v3_3.mjs';
import {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';
import {isReviewedPlayNormalNineProductV1,resolveReviewedPlayNormalNinePublicationAuthorityV1}
  from './reviewed_play_normal_nine_publication_authority_v1.mjs';
export {TCGPLAYER_MARKET_PUBLICATION_POLICY_V3} from './tcgplayer_market_publication_policy_v3.mjs';

// Add only the nine independently proved Normal facts. Existing75 Play, Japanese,
// MTG and every source, amount, freshness, duplicate and activation rule survive.
export function evaluateTcgplayerMarketQualificationV3_4(row={},options={}) {
  const prior=evaluateTcgplayerMarketQualificationV3_3(row,options);
  if(!isReviewedPlayNormalNineProductV1(row))return prior;
  const authority=resolveReviewedPlayNormalNinePublicationAuthorityV1(row);
  if(!authority) {
    if(prior.decision!=='publish')return prior;
    return {...prior,decision:'quarantine',eligible:false,publication_lane:'quarantine',
      reason_codes:[...prior.reason_codes,'reviewed_play_normal_nine_authority_missing'],
      evidence:{...prior.evidence,publication_lane:'quarantine',reviewed_play_normal_nine_authority_missing:true}};
  }
  if(prior.decision!=='exclude'||prior.reason_codes.length!==1||prior.reason_codes[0]!=='special_variant_v1_1'||
    prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||
    prior.language_result!=='english'||prior.duplicate_product_result!=='unique')return prior;
  return {...prior,policy_version:TCGPLAYER_MARKET_PUBLICATION_POLICY_V3,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],
    evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,
      predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',
      product_scope_rule_id:'reviewed_play_normal_nine_v1',reviewed_play_normal_nine_authority:authority,
      market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
