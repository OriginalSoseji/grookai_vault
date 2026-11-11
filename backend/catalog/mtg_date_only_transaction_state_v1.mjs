import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { mtgDateOnlyStableHashV1, verifyMtgDateOnlyPlanFingerprintV1 } from './mtg_date_only_review_plan_v1.mjs';

export const MTG_DATE_ONLY_RAW_SOURCE_V1 = 'grookai_catalog_mtg_date_only_v1';
const digest = text => createHash('sha256').update(text,'utf8').digest('hex');
const validId = id => /^[1-9]\d*$/.test(String(id ?? ''));

// Publicly selectable metadata contains only the date and schema version.
// Original card bodies and identity/provenance bindings stay in raw_imports.
export function mtgDateOnlyMetadataV1(row) {
  return { mtg_print_release_date_v1: { version:'mtg_print_release_date:v1', release_date:row.release_date } };
}

// This validates objects supplied by the caller. A real executor must read
// receipts and parent rows from its transaction and independently verify bulk
// membership, scope, locks, precommit state, and protected facts.
export function classifyMtgDateOnlyTransactionV1({plan,expectedFingerprint,beforeParents,currentParents,sourceReceipt,applyReceipt}) {
  if(!verifyMtgDateOnlyPlanFingerprintV1(plan,expectedFingerprint) || plan.status!=='review_only_not_apply_plan' ||
      plan.canonical_admission!==false || !Array.isArray(plan.rows) || !plan.rows.length ||
      !Array.isArray(beforeParents) || !Array.isArray(currentParents) ||
      beforeParents.length!==plan.rows.length || currentParents.length!==plan.rows.length ||
      new Set(plan.rows.map(r=>r.card_print_id)).size!==plan.rows.length ||
      new Set(beforeParents.map(p=>p.id)).size!==plan.rows.length ||
      new Set(currentParents.map(p=>p.id)).size!==plan.rows.length) throw Error('DATE_ONLY_PLAN_OR_PARENT_SCOPE');
  const before=new Map(beforeParents.map(p=>[p.id,p])), current=new Map(currentParents.map(p=>[p.id,p]));
  for(const row of plan.rows) {
    const old=before.get(row.card_print_id), now=current.get(row.card_print_id);
    if(!old || !now || old.ai_metadata!==null || mtgDateOnlyStableHashV1(old)!==row.parent_preimage_sha256)
      throw Error('DATE_ONLY_PARENT_PREIMAGE_DRIFT');
  }
  if(!sourceReceipt && !applyReceipt) {
    if(plan.rows.every(row=>isDeepStrictEqual(before.get(row.card_print_id),current.get(row.card_print_id)))) return 'pending';
    throw Error('DATE_ONLY_UNRECEIPTED_PARENT_DRIFT');
  }
  if(!sourceReceipt || !applyReceipt || !validId(sourceReceipt.id) || !validId(applyReceipt.id) ||
      sourceReceipt.source!==MTG_DATE_ONLY_RAW_SOURCE_V1 || applyReceipt.source!==MTG_DATE_ONLY_RAW_SOURCE_V1 ||
      String(sourceReceipt.id)===String(applyReceipt.id)) throw Error('DATE_ONLY_RECEIPT_SCOPE');
  const raw=sourceReceipt.payload, receipt=applyReceipt.payload;
  if(!raw || raw._kind!=='mtg_date_only_original_source_members' || raw.plan_fingerprint!==expectedFingerprint ||
      !Array.isArray(raw.members) || raw.members.length!==plan.rows.length ||
      new Set(raw.members.map(m=>m.card_print_id)).size!==plan.rows.length ||
      !isDeepStrictEqual(receipt,{_kind:'mtg_date_only_apply_receipt',plan_fingerprint:expectedFingerprint,
        source_raw_import_id:String(sourceReceipt.id)})) throw Error('DATE_ONLY_RECEIPT_DRIFT');
  const members=new Map(raw.members.map(m=>[m.card_print_id,m]));
  for(const row of plan.rows) {
    const m=members.get(row.card_print_id), old=before.get(row.card_print_id), now=current.get(row.card_print_id);
    if(!m || m.source_print_id!==row.source_print_id || typeof m.current_body!=='string' || typeof m.historical_body!=='string' ||
        digest(m.current_body)!==row.current_member_sha256 || digest(m.historical_body)!==row.historical_member_sha256)
      throw Error('DATE_ONLY_SOURCE_MEMBER_DRIFT');
    if(!isDeepStrictEqual(now,{...old,ai_metadata:mtgDateOnlyMetadataV1(row)})) throw Error('DATE_ONLY_PARTIAL_OR_OTHER_PARENT_DRIFT');
  }
  return 'already_applied';
}
