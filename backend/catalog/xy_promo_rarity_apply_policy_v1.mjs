import crypto from 'node:crypto';import {isDeepStrictEqual} from 'node:util';
import {evaluateReviewedXyPromo} from '../pokemon/xy_promo_visual_policy_v1.mjs';
export const XY_PROMO_PLAN_FINGERPRINT='40c18750ed652e83fb5bf04363ee75dfd7edef04269d36a9c44055c24f6592f4';
export const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
export function validateXyPromoPlan(plan,{snapshotBytes,preflightBytes,candidateBytes,visualBytes,articles,images}){
 const {fingerprint_sha256,...body}=plan;
 if(fingerprint_sha256!==XY_PROMO_PLAN_FINGERPRINT||sha256(JSON.stringify(body))!==fingerprint_sha256||
  plan.source_snapshot_sha256!==sha256(snapshotBytes)||plan.preflight_sha256!==sha256(preflightBytes)||
  plan.candidate_sha256!==sha256(candidateBytes)||plan.visual_review_sha256!==sha256(visualBytes))throw Error('XY_PROMO_PACKAGE_HASH_MISMATCH');
 if(plan.status!=='FROZEN_GUARDED_PACKAGE'||plan.no_writer!==false||plan.target!=='ycdxbpibncqcchqiihfz'||
  plan.source_review_fingerprint!=='4fb9d460f93df2c553b1ad3d7ddbcb8dc8a343bb3ab661f3e6c932b4b0298b0a'||
  !isDeepStrictEqual(plan.scope,{count:2,table:'card_prints',field:'rarity'})||plan.rows.length!==2)throw Error('XY_PROMO_SCOPE_MISMATCH');
 const snapshot=JSON.parse(snapshotBytes),preflight=JSON.parse(preflightBytes),candidates=JSON.parse(candidateBytes),visual=JSON.parse(visualBytes);
 if(snapshot.project_ref!==plan.target||snapshot.parents.length!==2||preflight.status!=='review_only_preflight_passed'||
  preflight.snapshot_sha256!==plan.source_snapshot_sha256||candidates.source_readback_sha256!==plan.source_snapshot_sha256||candidates.rows.length!==2)
  throw Error('XY_PROMO_EVIDENCE_MISMATCH');
 for(let i=0;i<2;i++){
  const row=plan.rows[i],input=candidates.rows[i].input,p=input.parent,n=p.number,product=snapshot.products.find(x=>x.row.product_id===input.product.product_id);
  if(!isDeepStrictEqual(p,snapshot.parents.find(x=>x.id===p.id))||!isDeepStrictEqual(input.set,snapshot.sets.find(x=>x.id===p.set_id))||
    !isDeepStrictEqual(input.identities,snapshot.identities.filter(x=>x.card_print_id===p.id))||
    !isDeepStrictEqual(input.traits,snapshot.traits.filter(x=>x.card_print_id===p.id))||
    !isDeepStrictEqual(input.mappings,snapshot.mappings.filter(x=>x.card_print_id===p.id))||
    !isDeepStrictEqual(input.raw,snapshot.raw)||!isDeepStrictEqual(input.product,product?.row)||
    !isDeepStrictEqual(input.group,snapshot.groups.find(g=>g.row.group_id===input.product.group_id)?.row)||
    !isDeepStrictEqual(input.groupSets,snapshot.groupSets.find(g=>g.group_id===input.product.group_id))||!isDeepStrictEqual(input.runs,snapshot.runs))
   throw Error('XY_PROMO_SOURCE_OR_SCOPE_MISMATCH');
  const decision=evaluateReviewedXyPromo(input,articles[n],images[n],visual);
  if(!isDeepStrictEqual(decision,row.review)||decision.status!=='record_scoped_review_candidate'||row.id!==p.id||row.gv_id!==p.gv_id||
   row.before!=='Common'||p.rarity!=='Common'||row.proposed!=='Promo'||row.identity_key_hash!==input.identities[0].identity_key_hash||
   !isDeepStrictEqual(row.protected_trait_ids,input.traits.map(t=>t.id)))throw Error('XY_PROMO_REVIEW_MISMATCH');
 }
 if(new Set(plan.rows.map(r=>r.id)).size!==2)throw Error('XY_PROMO_DUPLICATE_TARGET');
 return {snapshot,candidates,visual};
}
export function classifyXyPromoState(snapshot,parents,receipt){
 if(parents.length!==2)throw Error('XY_PROMO_PARENT_COUNT');let pending=0,applied=0;
 for(const expected of snapshot.parents){const actual=parents.find(p=>p.id===expected.id);
  if(isDeepStrictEqual(actual,expected))pending++;
  else if(isDeepStrictEqual(actual,{...expected,rarity:'Promo'}))applied++;
  else throw Error('XY_PROMO_PARENT_DRIFT');
 }
 if(pending===2&&!receipt)return 'pending';if(applied===2&&receipt)return 'already_applied';
 throw Error('XY_PROMO_PARTIAL_OR_MISSING_RECEIPT');
}
