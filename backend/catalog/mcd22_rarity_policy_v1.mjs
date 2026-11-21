import crypto from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {evaluateMcd22Candidate} from '../../docs/audits/promo_era_search_review_20261118/mcd22_candidate_policy.mjs';
export const MCD22_PLAN_FINGERPRINT='03d2da1f4666c7610d26b469d98d82d79bd997d345d70b04180053fe9fd19fae';
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function validateMcd22Plan(plan,candidateBytes,policyBytes,preflightBytes){
 const {fingerprint_sha256,...body}=plan;
 if(fingerprint_sha256!==MCD22_PLAN_FINGERPRINT||sha256(JSON.stringify(body))!==fingerprint_sha256||
    sha256(candidateBytes)!==plan.candidate_sha256||sha256(policyBytes)!==plan.policy_sha256||
    sha256(preflightBytes)!==plan.preflight_sha256)throw Error('MCD22_PACKAGE_HASH_MISMATCH');
 if(plan.status!=='FROZEN_GUARDED_PACKAGE'||plan.source_proposal_fingerprint!=='e49f07c0b8179915727cfcc23cfd1fa15b5565a31eb1b590198c1caecd30bf3b'||plan.target!=='ycdxbpibncqcchqiihfz'||
    !isDeepStrictEqual(plan.scope,{table:'card_prints',field:'rarity',null_only:true,count:15})||plan.rows.length!==15)
  throw Error('MCD22_PACKAGE_SCOPE_MISMATCH');
 const evidence=JSON.parse(candidateBytes),preflight=JSON.parse(preflightBytes);
 if(evidence.count!==15||evidence.rows.length!==15||preflight.status!=='read_only_preflight_passed'||
    preflight.candidate_file_sha256!==plan.candidate_sha256||preflight.candidate_policy_sha256!==plan.policy_sha256||
    !isDeepStrictEqual(preflight.protectedState,plan.protected_state))throw Error('MCD22_EVIDENCE_MISMATCH');
 const ids=new Set();
 for(let i=0;i<15;i++){
  const row=plan.rows[i],candidate=evidence.rows[i],p=candidate.input.parent,decision=evaluateMcd22Candidate(candidate.input);
  if(ids.has(p.id)||!isDeepStrictEqual(decision,candidate.decision)||decision.status!=='candidate_only'||
     row.id!==p.id||row.gv_id!==p.gv_id||row.number!==p.number||row.set_code!=='mcd22'||row.expected_rarity!==null||
     row.proposed_rarity!=='Promo'||row.identity_key_hash!==candidate.input.identities[0].identity_key_hash||
     row.trait_count!==candidate.input.traits.length||row.source_product_id!==candidate.input.product.product_id||
     row.source_payload_hash!==candidate.input.product.payload_hash)throw Error('MCD22_CANDIDATE_MISMATCH');
  ids.add(p.id);
 }
 return evidence.rows;
}
export function classifyMcd22State(evidence,parents,receipt){
 if(parents.length!==15)throw Error('MCD22_PARENT_COUNT');
 let pending=0,applied=0;
 for(const row of evidence){const expected=row.input.parent,current=parents.find(p=>p.id===expected.id);
  if(isDeepStrictEqual(current,expected))pending++;
  else if(isDeepStrictEqual(current,{...expected,rarity:'Promo'}))applied++;
  else throw Error('MCD22_PARENT_DRIFT');
 }
 if(pending===15&&!receipt)return 'pending';
 if(applied===15&&receipt)return 'already_applied';
 throw Error('MCD22_PARTIAL_OR_MISSING_RECEIPT');
}
