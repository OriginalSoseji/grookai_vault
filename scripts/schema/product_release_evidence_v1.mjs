// Local qualification receipts. No database connection, mutation or release authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

export const qualifiedProductCommit='469503b68253a0930e4238ce097478d02b290c0e';
const base='C:/grookai_vault_operator_artifacts/';
const native=base+'product_native_cost_20261007/';
const integrated=base+'product_integrated_20261007/';
const device=native+'device-1791416906152/';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const pins=Object.freeze({
 hook:'0fa8780e8b70dade2d2cce997b49155934631945fc3a487b59a2352bb4f57305',
 runtime:'3b110f8e40568eb4015edef207ab0ed229af5fc570dcfa7925f4f8ea60dc9137',
 runtimeRetention:'6743a345ca05d730145d3c5eadc77474a04386944c972a4b01dd709802bc8c6e',
 device:'28cce88f50acfc2109fbe092c48845d8a33b5cc9a21822daeeb000dbe245a96d',
 process:'b1275eff656083d3062ecd74ed12edf441677392bb938fc93d7433642f40960d',
 deviceRetention:'bc8ab0247476beb5c9f3173d67a4fae2daeaf59e7215b01695d3153984b5d3e3',
 phase1:'aba2ee01b3e1045334991281d4a061533a0ddab5598d6433fe1f5aed938a6483',
 phase2:'74cba622f6e7f0c9e8cbcdc3d1b061d635894a37794e81d31c8ce0cb47901957',
});

export function validateProductQualification(p){
 assert.equal(p.hook.status,'passed');assert.equal(p.hook.exitCode,0);
 assert.equal(p.hook.mode,'commit');assert.equal(p.hook.finalHead,qualifiedProductCommit);
 assert.equal(p.hook.productionWrites,0);assert.equal(p.hook.localReadOnly,true);
 assert.equal(p.hook.before.readonly,'on');assert.equal(p.hook.before.workers,'0');
 assert.equal(p.hook.before.migrations,431);assert.deepEqual(p.hook.after,p.hook.before);
 assert.equal(p.runtime.status,'passed');assert.equal(p.runtime.failure,null);
 assert.equal(p.runtime.cleanup,true);assert.equal(p.runtime.productionRequests,0);
 assert.equal(p.runtime.reset,false);assert.equal(p.runtime.checks.length,5);
 assert.equal(p.device.status,'passed');assert.equal(p.device.requests,1);
 assert.equal(p.device.amount,'13.27');assert.equal(p.device.currency,'USD');
 assert.equal(p.device.archived,true);assert.equal(p.device.processRestart,true);
 assert.equal(p.device.productionWrites,0);
 assert.equal(p.process.status,'passed');assert.equal(p.process.primaryAppPathUnchanged,true);
 assert.equal(p.process.processIds.length,2);
 assert.ok(p.process.processIds.every(v=>/^\d+$/.test(v)));
 assert.notEqual(...p.process.processIds);
 assert.equal(p.phase1.phase,'pending_after_commit');assert.equal(p.phase1.pendingCount,1);
 assert.equal(p.phase2.phase,'recovered_after_process_restart');assert.equal(p.phase2.pendingCount,0);
 for(const key of ['owner','requestId']){
  assert.match(p.phase1[key],/^[a-f0-9-]{36}$/);assert.equal(p.phase1[key],p.phase2[key]);
 }
 for(const retention of [p.deviceRetention,p.runtimeRetention]){
  assert.equal(Object.keys(retention.before).length,13);
  assert.deepEqual(retention.after,retention.before);
 }
 return {commit:qualifiedProductCommit,normalHook:true,authenticatedWebJourney:true,
  samsungProcessRecovery:true,retainedTables:13,productionWrites:0};
}

export function validateShadowQualification(receipt,intent,retention,packageHashes){
 assert.equal(receipt.status,'passed');assert.equal(receipt.failure,undefined);
 assert.equal(receipt.exit,1); // CLI2.90 returns errInSync for a successful empty diff.
 assert.equal(receipt.project,'cost-shadow-430-v7-20261007');
 assert.equal(receipt.targetProject,'cost-full-430-r2-20261007');
 assert.equal(receipt.shadowCaptured,true);assert.equal(receipt.productionWrites,0);
 assert.equal(receipt.targetWrites,0);assert.equal(receipt.retainedFixtureResets,0);
 assert.equal(receipt.comparison.rawBytes,0);assert.equal(receipt.comparison.normalizedBytes,0);
 assert.equal(receipt.comparison.scope,'public');assert.ok(receipt.comparison.securityObjects>1000);
 assert.equal(intent.targetReadOnly,true);assert.equal(intent.apply,false);
 assert.equal(intent.project,receipt.project);assert.equal(intent.targetProject,receipt.targetProject);
 assert.equal(Object.keys(packageHashes).length,430);
 assert.ok(!Object.hasOwn(packageHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
 assert.deepEqual(intent.sourceHashes,packageHashes);
 assert.equal(Object.keys(retention.before).length,15);assert.deepEqual(retention.after,retention.before);
 return {project:receipt.project,independentReplay:true,normalizedBytes:0,retainedTables:15};
}

export function verifyProductReleaseEvidence(packageHashes){
 const files={
  hook:native+'checks-1791417067958/receipt.json',
  runtime:integrated+'runtime-1791414918049/receipt.json',
  runtimeRetention:integrated+'runtime-1791414918049/retention.json',
  device:device+'database-readback.json',process:device+'process-proof.json',
  deviceRetention:device+'retention.json',
  phase1:device+'phase-1/device-response.json',phase2:device+'phase-2/device-response.json',
 };
 for(const [key,file] of Object.entries(files))assert.equal(sha(file),pins[key],key+' qualification receipt changed');
 const p=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,read(v)]));
 assert.equal(sha(native+'checks-1791417067958/checks.private.log'),
  'e484e082bbaa463d342d4583ba30f72488329b7ea14503a7a45f2ea3644d2515');
 assert.equal(p.hook.logSha256,'e484e082bbaa463d342d4583ba30f72488329b7ea14503a7a45f2ea3644d2515');
 assert.equal(read(device+'fixture.private.json').state,'cleaned');
 const result=validateProductQualification(p);
 const shadowDir=base+'product_release_20261007/shadow-430-v7/';
 for(const [file,digest] of Object.entries({
  'receipt.json':'810766a4b1ddc9301c88b5642a37ea59eabec46a61d5a5a21f3e2583ec4fb1bc',
  'intent.json':'f5b831459ecc21710b829b86b21e32f28ed63067562be6a92d19a0d21f1f654a',
  'shadow-schema.private.json':'64918cabf21132f01516d7f9ae03ace8c39ddf9648d1604ad3bbe64d32eb00a7',
  'target-retention.json':'257e975b0747efafc5257902149aa97945442b07cdf52b701686bf63287b4e15',
 }))assert.equal(sha(shadowDir+file),digest,'Independent shadow evidence changed: '+file);
 const shadowReceipt=read(shadowDir+'receipt.json');
 const shadow=validateShadowQualification(shadowReceipt,read(shadowDir+'intent.json'),read(shadowDir+'target-retention.json'),packageHashes);
 assert.equal(sha(shadowDir+'pull.private.log'),shadowReceipt.logSha256);
 for(const file of ['raw.sql','normalized.sql'])assert.equal(fs.readFileSync(shadowDir+'shadow-comparison/'+file,'utf8'),'');
 return {...result,shadow,receipts:Object.fromEntries(Object.entries({...files,shadow:shadowDir+'receipt.json'}).map(([k,v])=>[k,{path:v,sha256:sha(v)}]))};
}
