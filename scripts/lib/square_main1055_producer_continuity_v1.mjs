import fs from 'node:fs';
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const manifest=JSON.parse(fs.readFileSync(new URL('../../docs/audits/fixtures/square_main1055_producers_v1.json',import.meta.url)));
const {fingerprint,...body}=manifest;
assert.equal(fingerprint,'06b7ce113cb43bf904a8360e602d66056548adc04fed6f8c0a70597f19faab16');
assert.equal(hash(body),fingerprint);
assert.equal(manifest.acceptedMain,'69a2ec80cb5b27f76fd65dabc1b9673704c079d8');
assert.equal(manifest.acceptedRuntime,'62cb16aba75072f3172459d5af3b3da60713d8a9');
assert.equal(manifest.productionExecutionAuthority,false);
assert.equal(manifest.historicalFiles.length,609);
assert.equal(manifest.additional.length,6);
assert.deepEqual(manifest.testOnlyTransformations.map(x=>x.file),[
 'tests/contracts/japanese_reviewed_price_links_v3.test.mjs',
 'tests/contracts/japanese_reviewed_price_links_v4.test.mjs',
]);

/** Source composition only. Never validates or admits a production execution. */
export function assertSquareMain1055ProducerContinuityV1(binding,programme){
 assert.ok(['japaneseV3','japaneseV4'].includes(programme),'Unknown frozen programme');
 const baseline=manifest.baseline[programme],current=manifest.expectedCurrent[programme];
 assert.equal(binding.files.length,current.fileCount,'Exact combined producer required');
 assert.equal(new Set(binding.files.map(x=>x.file)).size,binding.files.length,'Duplicate producer path');
 const extras=new Set(manifest.additional.map(x=>x.file));
 const additional=binding.files.filter(x=>extras.has(x.file));
 assert.deepEqual(additional,manifest.additional,'Six exact unchanged Square payloads required');
 const original=binding.files.filter(x=>!extras.has(x.file)).map(x=>{
  const declared=manifest.testOnlyTransformations.find(t=>t.file===x.file);
  if(!declared)return x;
  assert.equal(x.sha256,declared.afterSha256,'Undeclared test transformation');
  return{file:x.file,sha256:declared.beforeSha256};
 });
 assert.deepEqual(original,manifest.historicalFiles.slice(0,baseline.fileCount),'Accepted original producer bytes/order changed');
 assert.equal(hash(original),baseline.fingerprint,'Accepted historical fingerprint changed');
 assert.equal(hash(binding.files),binding.fingerprint,'Producer fingerprint mismatch');
 assert.equal(binding.fingerprint,current.fingerprint,'Unqualified combined source');
 return{historicalFiles:baseline.fileCount,additionalFiles:6,currentFiles:current.fileCount,declaredTestAdaptations:programme==='japaneseV3'?1:2,historicalFingerprint:baseline.fingerprint,currentFingerprint:current.fingerprint,productionExecutionAuthority:false};
}
