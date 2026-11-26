import{evaluateTcgplayerMarketQualificationV3_4}from'./tcgplayer_market_publication_policy_v3_4.mjs';
import{TCGPLAYER_MARKET_PUBLICATION_POLICY_V3}from'./tcgplayer_market_publication_policy_v3.mjs';
import{isReviewedStampedReverseProductV1,resolveReviewedStampedReversePublicationAuthorityV1}from'./reviewed_stamped_reverse_publication_authority_v1.mjs';
export{TCGPLAYER_MARKET_PUBLICATION_POLICY_V3}from'./tcgplayer_market_publication_policy_v3.mjs';
export function evaluateTcgplayerMarketQualificationV3_5(row={},options={}){
 const prior=evaluateTcgplayerMarketQualificationV3_4(row,options);if(!isReviewedStampedReverseProductV1(row))return prior;
 const authority=resolveReviewedStampedReversePublicationAuthorityV1(row);
 if(!authority){if(prior.decision!=='publish')return prior;return{...prior,decision:'quarantine',eligible:false,publication_lane:'quarantine',
  reason_codes:[...prior.reason_codes,'reviewed_stamped_reverse_authority_missing'],
  evidence:{...prior.evidence,publication_lane:'quarantine',reviewed_stamped_reverse_authority_missing:true}};}
 // These reviewed fronts and exact numbered products establish single cards.
 // The provider's Miscellaneous Cards & Products group is broader than singles;
 // lift its sole group-kind ceiling only for this same exact physical authority.
 if(prior.decision!=='exclude'||prior.reason_codes.length!==1||!['special_variant_v1_1','unsupported_product_kind'].includes(prior.reason_codes[0])||
  prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||
  prior.language_result!=='english'||prior.duplicate_product_result!=='unique')return prior;
 return{...prior,policy_version:TCGPLAYER_MARKET_PUBLICATION_POLICY_V3,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],
  evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,
   predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',
   product_scope_rule_id:'reviewed_stamped_reverse_v1',reviewed_stamped_reverse_authority:authority,
   market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
