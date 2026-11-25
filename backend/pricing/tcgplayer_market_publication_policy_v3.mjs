import {evaluateTcgplayerMarketQualificationV2} from './tcgplayer_market_publication_policy_v2.mjs';
import {isReviewedPlayStampNormalProductV1,resolvePlayStampNormalPublicationAuthorityV1} from './play_stamp_normal_publication_authority_v1.mjs';

export const TCGPLAYER_MARKET_PUBLICATION_POLICY_V3='TCGPLAYER_MARKET_PUBLICATION_POLICY_V3';

export function evaluateTcgplayerMarketQualificationV3(row={},options={}){
 // Existing MTG/edition and cross-TCG guards pin their decision versions.
 // Preserve complete predecessor decisions; the pipeline run identifies V3.
 const prior=evaluateTcgplayerMarketQualificationV2(row,options),result={...prior};
 if(!isReviewedPlayStampNormalProductV1(row))return result;
 const authority=resolvePlayStampNormalPublicationAuthorityV1(row);
 if(!authority){
  if(prior.decision!=='publish')return result;
  return{...result,policy_version:TCGPLAYER_MARKET_PUBLICATION_POLICY_V3,decision:'quarantine',eligible:false,publication_lane:'quarantine',reason_codes:[...prior.reason_codes,'reviewed_play_normal_authority_missing'],evidence:{...prior.evidence,publication_lane:'quarantine',reviewed_play_normal_authority_missing:true}};
 }
 // Lift exactly the generic stamp ceiling. Every unrelated exclusion, finish,
 // identity, source, ownership, currency, amount and freshness check survives.
 if(prior.decision!=='exclude'||prior.reason_codes.length!==1||prior.reason_codes[0]!=='special_variant_v1_1'||prior.freshness_result!=='fresh'||prior.source_integrity_result!=='passed'||prior.finish_result!=='exact_child_finish'||prior.language_result!=='english'||prior.duplicate_product_result!=='unique')return result;
 return{...result,policy_version:TCGPLAYER_MARKET_PUBLICATION_POLICY_V3,decision:'publish',eligible:true,publication_lane:'current',reason_codes:[],evidence:{...prior.evidence,predecessor_product_scope_result:prior.evidence.product_scope_result,predecessor_product_scope_rule_id:prior.evidence.product_scope_rule_id,publication_lane:'current',product_scope_result:'in_scope',product_scope_rule_id:'reviewed_play_stamp_normal_v1',reviewed_play_normal_authority:authority,market_price_is_source_field:true,supporting_prices_do_not_set_market_close:true}};
}
