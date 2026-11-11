import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { classifyMtgDateOnlyCandidateV1 } from './mtg_date_only_candidate_v1.mjs';
import { verifyMtgDateOnlyPlanFingerprintV1 } from './mtg_date_only_review_plan_v1.mjs';
import { MTG_DATE_ONLY_RAW_SOURCE_V1,mtgDateOnlyMetadataV1 } from './mtg_date_only_transaction_state_v1.mjs';

export const MTG_DATE_ONLY_RELEASE_PLAN_PIN_V1='3b0dccb6c1ffd7fd0b27e1b0829a45af333b632fdc19d5583cce68f2f0d84543';
const currentBulk='42a921fd8e75c0d573cbc12280afa6416b4955678d1d097ffb3ee6504bbc516f';
const historicalBulk='4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c';
const sha=text=>createHash('sha256').update(text,'utf8').digest('hex');
const validId=id=>/^[1-9]\d*$/.test(String(id??''));

// Inputs must come from a request-scoped visibility gate and trusted private
// DB reads; this function never returns the private source receipt or plan.
export function readMtgDateOnlyReleaseV1({parent,identities,sourceOwners,sourceReceipt,applyReceipt,
  expectedFingerprint=MTG_DATE_ONLY_RELEASE_PLAN_PIN_V1}={}) {
  const raw=sourceReceipt?.payload,receipt=applyReceipt?.payload,plan=raw?.plan;
  if(!parent || !validId(sourceReceipt?.id) || !validId(applyReceipt?.id) ||
      String(sourceReceipt.id)===String(applyReceipt.id) || sourceReceipt.source!==MTG_DATE_ONLY_RAW_SOURCE_V1 ||
      applyReceipt.source!==MTG_DATE_ONLY_RAW_SOURCE_V1 || raw?._kind!=='mtg_date_only_original_source_members' ||
      raw.plan_fingerprint!==expectedFingerprint || !verifyMtgDateOnlyPlanFingerprintV1(plan,expectedFingerprint) ||
      plan.status!=='review_only_not_apply_plan' || plan.canonical_admission!==false || !Array.isArray(plan.rows) || plan.rows.length!==48 ||
      raw.original_bulk_proof?.current_sha256!==currentBulk || raw.original_bulk_proof?.historical_sha256!==historicalBulk ||
      raw.original_bulk_proof?.exact_members_verified!==48 || !Array.isArray(raw.members) || raw.members.length!==48 ||
      plan.rows.some(r=>!r || typeof r.card_print_id!=='string') || raw.members.some(m=>!m || typeof m.card_print_id!=='string') ||
      new Set(plan.rows.map(r=>r.card_print_id)).size!==48 || new Set(raw.members.map(m=>m.card_print_id)).size!==48 ||
      !isDeepStrictEqual(receipt,{_kind:'mtg_date_only_apply_receipt',plan_fingerprint:expectedFingerprint,
        source_raw_import_id:String(sourceReceipt.id)}))return null;
  const row=plan.rows.find(r=>r.card_print_id===parent.id), member=raw.members.find(m=>m.card_print_id===parent.id);
  if(!row || !member || member.source_print_id!==row.source_print_id || typeof member.current_body!=='string' ||
      typeof member.historical_body!=='string' || sha(member.current_body)!==row.current_member_sha256 ||
      sha(member.historical_body)!==row.historical_member_sha256 || !isDeepStrictEqual(parent.ai_metadata,mtgDateOnlyMetadataV1(row)))return null;
  const decision=classifyMtgDateOnlyCandidateV1({parent,identities,sourceOwners,
    currentBody:member.current_body,historicalBody:member.historical_body});
  if(decision.status!=='candidate_only' || decision.release_date!==row.release_date || decision.source_print_id!==row.source_print_id)return null;
  return {card_print_id:parent.id,release_date:row.release_date,release_year:Number(row.release_date.slice(0,4)),
    release_date_scope:'individual_print',release_date_source:'scryfall'};
}
