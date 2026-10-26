import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixture,reviewFixture } from '../fixtures/master_mapping_authority_v1.mjs';
import { seal } from '../fixtures/warehouse_printing_authority_v1.mjs';
import { tcgplayerExactMappingCandidateFingerprintV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs';
import { assertMasterMappingBatchAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';
import { buildPricingCompletionMappingAuthorityBatchesV1 } from '../../backend/pricing/pricing_completion_mapping_authority_batches_v1.mjs';

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function syntheticBulk(count) {
  // Unit-test evidence only. These invented identities/reviews are never operator inputs.
  const f=fixture(),baseCandidate=f.selected[0],baseParent=f.manifest.parents[0],basePrinting=f.manifest.printings[0],baseAssertion=f.manifest.external_mapping_assertions[0];
  f.selected=[];f.manifest.parents=[];f.manifest.printings=[];f.manifest.external_mapping_assertions=[];
  for(let i=1;i<=count;i++) {
    const id=`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,name=`Fixture ${i}`;
    const parent={...baseParent,id,gv_id:`GV-PK-TEST-${i}`,name,printed_coordinate:String(i)};
    const candidate=structuredClone(baseCandidate);delete candidate.candidate_fingerprint;
    Object.assign(candidate,{source_product_id:1000+i,source_product_name:name,printed_number:String(i),normalized_source_name:`fixture ${i}`,normalized_source_number:String(i)});
    Object.assign(candidate.target,{card_print_id:id,gv_id:parent.gv_id,canonical_name:name,canonical_number:String(i)});
    candidate.evidence.embedded_external_id=`tcgcsv:456:${candidate.source_product_id}`;
    candidate.candidate_fingerprint=tcgplayerExactMappingCandidateFingerprintV1(candidate);
    f.selected.push(candidate);f.manifest.parents.push(parent);
    f.manifest.printings.push({...basePrinting,card_print_id:id,printing_gv_id:parent.gv_id+'-HOLO',evidence:basePrinting.evidence.map(e=>({...e,card_print_id:id}))});
    f.manifest.external_mapping_assertions.push({...baseAssertion,external_id:String(candidate.source_product_id),card_print_id:id,candidate_fingerprint:candidate.candidate_fingerprint});
  }
  f.manifest.scope='verified_parent_families';f.manifest.expected={parents:count,printings:count,finishes:{holo:count}};
  const review=JSON.parse(f.artifacts.get('review'));review.scope=f.manifest.scope;f.artifacts.set('review',Buffer.from(JSON.stringify(review)));
  reviewFixture(f);return f;
}
function build(f,extra={}) {return buildPricingCompletionMappingAuthorityBatchesV1({candidates:f.selected,scopes:[f],...extra});}

for(const count of [115,120]) test(`${count} reviewed candidates become five bounded packages without new reviews`,()=>{
  const f=syntheticBulk(count),before=JSON.stringify(f.manifest),reviewBefore=Buffer.from(f.artifacts.get('review'));
  const result=build(f);
  assert.deepEqual(result.batches.map(b=>b.selectedCandidates.length),[25,25,25,25,count-100]);
  assert.equal(result.reviewRecordsIssued,0);assert.equal(result.executionAuthorized,false);assert.equal(result.databaseWrites,0);
  assert.equal(JSON.stringify(f.manifest),before);assert.deepEqual(f.artifacts.get('review'),reviewBefore);
  for(const batch of result.batches) {
    assert.equal(batch.receipt.authority_file_sha256,digest(batch.authorityJson));
    assert.equal(batch.receipt.selected_file_sha256,digest(batch.selectedJsonl));
    assert.equal(assertMasterMappingBatchAuthority(batch.selectedCandidates,JSON.parse(batch.authorityJson)).execution_authorized,false);
    assert.equal(batch.authority.scopes[0].manifest.parents.length,count);
  }
});
test('a genuinely reviewed120-parent manifest supports an explicit115-parent selection without claiming full-set completion',()=>{
  const f=syntheticBulk(120);f.selected=f.selected.slice(0,115);
  const result=build(f);assert.equal(result.selectedCount,115);assert.equal(result.batchCount,5);
  assert.equal(result.batches[0].authority.scopes[0].manifest.external_mapping_assertions.length,120);
});
test('boundaries reject0/26/noninteger sizes and preserve every candidate deterministically',()=>{
  const f=syntheticBulk(120);
  for(const size of [0,26,1.5,'25']) assert.throws(()=>build(f,{batchSize:size}),/batch_size_outside_executor_limit/);
  const first=build(f),reverse=build(f,{candidates:[...f.selected].reverse()});
  assert.deepEqual(reverse,first);assert.equal(new Set(first.batches.flatMap(b=>b.receipt.candidate_fingerprints)).size,120);
  assert.equal(build(f,{batchSize:24}).batches.at(-1).selectedCandidates.length,24);
});
test('whole-population duplicate products or parents cannot evade validation across batch boundaries',()=>{
  for(const kind of ['product','parent']) {
    const f=syntheticBulk(120),last=f.selected[119];
    if(kind==='product')last.source_product_id=f.selected[0].source_product_id;
    else last.target.card_print_id=f.selected[0].target.card_print_id;
    delete last.candidate_fingerprint;last.candidate_fingerprint=tcgplayerExactMappingCandidateFingerprintV1(last);
    assert.throws(()=>build(f),new RegExp(`duplicate_mapping_${kind}`));
  }
});
test('missing review, tampered bytes, or unreviewed assertions fail before any packages are returned',()=>{
  for(const change of [f=>f.artifacts.delete('review'),f=>f.artifacts.set('source',Buffer.from('changed')),
    f=>{f.manifest.external_mapping_assertions[119].external_id='999';f.manifest=seal(f.manifest);}]) {
    const f=syntheticBulk(120);change(f);assert.throws(()=>build(f));
  }
});
test('an unresolved lead cannot be hidden inside verified_parent_families',()=>{
  const f=syntheticBulk(115);f.manifest.unresolved_variants=[{key:'unresolved-normal',card_print_id:f.manifest.parents[0].id,source_ref:'source',reason:'not reviewed',status:'needs_review',scope:'outside_base_release'}];
  reviewFixture(f);assert.throws(()=>build(f),/complete_set_has_unresolved_variants/);
});
test('reviewed base-release scope preserves explicit outside-base leads in every bounded package',()=>{
  const f=syntheticBulk(120);f.manifest.scope='base_release';
  f.manifest.unresolved_variants=f.manifest.parents.slice(0,5).map((parent,i)=>({key:`outside-normal-${i}`,
    card_print_id:parent.id,source_ref:'source',reason:'Synthetic independently reviewed outside-base lead remains open',status:'needs_review',scope:'outside_base_release'}));
  const review=JSON.parse(f.artifacts.get('review'));review.scope='base_release';f.artifacts.set('review',Buffer.from(JSON.stringify(review)));reviewFixture(f);
  const result=build(f);assert.equal(result.batchCount,5);
  for(const batch of result.batches) assert.equal(batch.authority.scopes[0].manifest.unresolved_variants.length,5);
});
test('object key insertion order does not change emitted artifact bytes',()=>{
  const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value!==null&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reverseKeys(value[key])])):value;
  const first=syntheticBulk(26),second={...first,selected:reverseKeys(first.selected),manifest:reverseKeys(first.manifest)};
  const a=build(first),b=build(second);
  assert.deepEqual(a.batches.map(x=>[x.selectedJsonl,x.authorityJson,x.receipt]),b.batches.map(x=>[x.selectedJsonl,x.authorityJson,x.receipt]));
});
test('multiple scope input order is canonical while semantic arrays and evidence bytes stay intact',()=>{
  const first=fixture(),second=fixture();
  const setId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',parentId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  Object.assign(second.manifest.parents[0],{set_id:setId,id:parentId,gv_id:'GV-PK-OTHER-1'});
  Object.assign(second.manifest.printings[0],{card_print_id:parentId,printing_gv_id:'GV-PK-OTHER-1-HOLO'});
  second.manifest.printings[0].evidence.forEach(e=>e.card_print_id=parentId);
  second.manifest.authority.set_id=setId;
  const candidate=second.selected[0];candidate.source_product_id=124;
  Object.assign(candidate.target,{set_id:setId,card_print_id:parentId,gv_id:'GV-PK-OTHER-1'});
  candidate.evidence.embedded_external_id='tcgcsv:456:124';
  delete candidate.candidate_fingerprint;candidate.candidate_fingerprint=tcgplayerExactMappingCandidateFingerprintV1(candidate);
  Object.assign(second.manifest.external_mapping_assertions[0],{external_id:'124',card_print_id:parentId,candidate_fingerprint:candidate.candidate_fingerprint});
  reviewFixture(second);
  const args={candidates:[...first.selected,...second.selected],scopes:[first,second]};
  const a=buildPricingCompletionMappingAuthorityBatchesV1(args),b=buildPricingCompletionMappingAuthorityBatchesV1({...args,scopes:[second,first]});
  assert.deepEqual(a,b);
  assert.deepEqual(a.batches[0].authority.scopes.map(s=>s.manifest.authority.set_id),[first.manifest.authority.set_id,setId]);
  assert.deepEqual(a.batches[0].authority.scopes[1].manifest.printings,second.manifest.printings);
});
