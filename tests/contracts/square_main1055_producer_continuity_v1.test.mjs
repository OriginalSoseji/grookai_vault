import test from 'node:test';
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {priceLinkCodeBindingV3} from '../../backend/pricing/japanese_reviewed_price_links_v3.mjs';
import {priceLinkCodeBindingV4} from '../../backend/pricing/japanese_reviewed_price_links_v4.mjs';
import {assertSquareMain1055ProducerContinuityV1 as check} from '../../scripts/lib/square_main1055_producer_continuity_v1.mjs';

const third=priceLinkCodeBindingV3(),fourth=priceLinkCodeBindingV4();
test('accepted current-source producers compose only six unchanged Square SQL payloads and declared source-test adaptations',()=>{
 for(const[binding,programme,historical,current,adaptations]of[[third,'japaneseV3',605,611,1],[fourth,'japaneseV4',609,615,2]]){
  const result=check(binding,programme);assert.equal(result.historicalFiles,historical);assert.equal(result.currentFiles,current);assert.equal(result.additionalFiles,6);assert.equal(result.declaredTestAdaptations,adaptations);assert.equal(result.productionExecutionAuthority,false);
 }
});
for(const[name,change]of[
 ['changed original',b=>{b.files[0].sha256='0'.repeat(64);}],
 ['changed declared test',b=>{b.files.find(x=>x.file==='tests/contracts/japanese_reviewed_price_links_v3.test.mjs').sha256='0'.repeat(64);}],
 ['changed second declared test',b=>{b.files.find(x=>x.file==='tests/contracts/japanese_reviewed_price_links_v4.test.mjs').sha256='0'.repeat(64);}],
 ['changed added SQL',b=>{b.files.find(x=>x.file.endsWith('20261124230000_square_recovery_target_window_release_v3.sql')).sha256='0'.repeat(64);}],
 ['missing original',b=>b.files.shift()],
 ['missing SQL',b=>{b.files=b.files.filter(x=>!x.file.endsWith('20261124230000_square_recovery_target_window_release_v3.sql'));}],
 ['duplicate path',b=>{b.files[1]={...b.files[0]};}],
 ['reordered original',b=>{[b.files[0],b.files[1]]=[b.files[1],b.files[0]];}],
 ['extra file',b=>b.files.push({file:'unreviewed.sql',sha256:'0'.repeat(64)})],
])test('rejects '+name+' even with a freshly computed fingerprint',()=>{
 const binding=structuredClone(fourth);change(binding);binding.fingerprint=hash(binding.files);assert.throws(()=>check(binding,'japaneseV4'));
});
test('forged digest, cross-programme substitution and unknown scope fail closed',()=>{
 assert.throws(()=>check({...fourth,fingerprint:'0'.repeat(64)},'japaneseV4'));
 assert.throws(()=>check(third,'japaneseV4'));assert.throws(()=>check(fourth,'japaneseV3'));assert.throws(()=>check(fourth,'japaneseV2'));
});
