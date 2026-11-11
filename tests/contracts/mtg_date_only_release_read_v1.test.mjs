import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildMtgCanonicalCandidateV1 } from '../../backend/pricing/mtg_canonical_catalog_candidate_v1.mjs';
import { mtgDateOnlyStableHashV1 } from '../../backend/catalog/mtg_date_only_review_plan_v1.mjs';
import { mtgDateOnlyMetadataV1,MTG_DATE_ONLY_RAW_SOURCE_V1 as source } from '../../backend/catalog/mtg_date_only_transaction_state_v1.mjs';
import { readMtgDateOnlyReleaseV1 as read } from '../../backend/catalog/mtg_date_only_release_read_v1.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
function fixture(){
  const id='8688c051-a8f6-4894-ac16-ec7578f7029e',parentId='001e8971-1465-5432-9af6-9f5cbb483401';
  const old={id,oracle_id:'eaabd151-2160-4bff-82c0-3fa88659be98',set_id:'fbbad14d-1d42-4204-ade6-911876dc7c06',
    lang:'en',games:['paper'],digital:false,set:'slz',collector_number:'54',name:'Anger',released_at:'2026-09-02',finishes:['nonfoil']};
  const current={...old,finishes:['foil']},candidate=buildMtgCanonicalCandidateV1(old),currentBody=JSON.stringify(current),oldBody=JSON.stringify(old);
  const first={card_print_id:parentId,source_print_id:id,release_date:old.released_at,current_member_sha256:hash(currentBody),historical_member_sha256:hash(oldBody)};
  const body={status:'review_only_not_apply_plan',canonical_admission:false,rows:[first,...Array.from({length:47},(_,n)=>({card_print_id:`other${n}`}))]};
  const plan={...body,fingerprint_sha256:mtgDateOnlyStableHashV1(body)},expectedFingerprint=plan.fingerprint_sha256;
  const members=[{card_print_id:parentId,source_print_id:id,current_body:currentBody,historical_body:oldBody},...Array.from({length:47},(_,n)=>({card_print_id:`other${n}`}))];
  const parent={id:parentId,gv_id:`GV-MTG-SF-${id.toUpperCase()}`,name:old.name,number:old.collector_number,set_code:old.set,
    identity_domain:'mtg_eng_paper_print',external_ids:{scryfall:id},variant_key:`scryfall:${id}`,print_identity_key:`scryfall:${id}`,
    printed_identity_modifier:null,set_identity_model:'standard',ai_metadata:mtgDateOnlyMetadataV1(first)};
  const identities=[{id:'96f83dce-5b8d-5371-9982-549fb5879dcf',card_print_id:parentId,is_active:true,
    identity_domain:'mtg_eng_paper_print',identity_key_version:candidate.identity_key_version,identity_key_hash:candidate.identity_key_hash,
    set_code_identity:old.set,printed_number:old.collector_number,identity_payload:candidate.identity_payload}];
  const sourceOwners=[{source:'scryfall',external_id:id,card_print_id:parentId,active:true,meta:{source_card_released_at:old.released_at}}];
  const sourceReceipt={id:'101',source,payload:{_kind:'mtg_date_only_original_source_members',plan_fingerprint:expectedFingerprint,plan,members,
    original_bulk_proof:{current_sha256:'42a921fd8e75c0d573cbc12280afa6416b4955678d1d097ffb3ee6504bbc516f',
      historical_sha256:'4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c',exact_members_verified:48}}};
  const applyReceipt={id:'102',source,payload:{_kind:'mtg_date_only_apply_receipt',plan_fingerprint:expectedFingerprint,source_raw_import_id:'101'}};
  return {parent,identities,sourceOwners,sourceReceipt,applyReceipt,expectedFingerprint};
}
test('returns only the qualified individual date, preserving all inputs',()=>{
  const f=fixture(),before=JSON.stringify(f),v=read(f);
  assert.deepEqual(v,{card_print_id:f.parent.id,release_date:'2026-09-02',release_year:2026,release_date_scope:'individual_print',release_date_source:'scryfall'});
  assert.equal(JSON.stringify(f),before);
});
test('holds stale identity, missing receipts, source tampering, and invalid metadata',()=>{
  for(const mutate of [
    f=>{f.sourceReceipt=null;},f=>{f.applyReceipt=null;},f=>{f.applyReceipt.payload.source_raw_import_id='999';},
    f=>{f.sourceReceipt.payload.original_bulk_proof.exact_members_verified=47;},
    f=>{f.sourceReceipt.payload.members[0].current_body+=' ';},
    f=>{f.sourceReceipt.payload.plan.rows[0].release_date='2026-09-03';},
    f=>{f.parent.ai_metadata.mtg_print_release_date_v1.release_date='2026-09-03';},
    f=>{f.parent.ai_metadata.extra=true;},f=>{f.identities[0].is_active=false;},
    f=>{f.sourceOwners.push(structuredClone(f.sourceOwners[0]));},
    f=>{f.sourceReceipt.payload.members[1]=null;},
  ]){const f=fixture();mutate(f);assert.equal(read(f),null);}
});
