// Exact package identity. No I/O, credentials, mutation, or apply operation.
import assert from 'node:assert/strict';
export const dealRelease=Object.freeze({
 root:'C:/gv_product_deal_release_20261008',
 evidence:'C:/grookai_vault_operator_artifacts/product_deal_release_20261008',
 target:'ycdxbpibncqcchqiihfz',
 deferred:'20261005150000_vendor_receipt_delivery_v1.sql',
 deferredSha256:'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d',
 added:Object.freeze({
  '20261007180000_vendor_cost_evidence_v1.sql':'7a64b0ec767e06a6c163b5184a8f95ce8acf795da4d15888635eb864c8830199',
  '20261008021000_vendor_purchase_v1.sql':'f5aed7be276c0dca27a2778ee23954a8412fbe678d42f8508b63e91c646f62b0',
  '20261008060000_vendor_negotiated_trade_v1.sql':'420d4dfaf98823e52ca0360d86ef91ce5420c0bb000edfce4a244354787912eb',
 }),
});
export function dealReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,433);assert.equal(Object.keys(baseline).length,429);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,433);
 for(const [name,digest]of Object.entries(baseline))assert.equal(sources[name],digest,name);
 assert.deepEqual(Object.keys(sources).filter(n=>!Object.hasOwn(baseline,n)).sort(),[dealRelease.deferred,...Object.keys(dealRelease.added)].sort());
 assert.equal(sources[dealRelease.deferred],dealRelease.deferredSha256);
 for(const [name,digest]of Object.entries(dealRelease.added))assert.equal(sources[name],digest,name);
 return Object.fromEntries(Object.entries(sources).filter(([name])=>name!==dealRelease.deferred));
}
export function validateDealReleaseArguments(args){
 assert.equal(args.length,1,'Use AuditLinkedSchema or PrePush only');
 assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'No apply or target overrides');return args[0];
}
export function validateDealShadow(receipt,intent,retention,packageHashes){
 assert.equal(receipt.status,'passed');assert.equal(receipt.failure,undefined);assert.equal(receipt.exit,1);
 assert.equal(receipt.project,'deal-shadow-432-v2-20261008');assert.equal(receipt.targetProject,'deal-full-432-v1-20261008');
 for(const key of ['productionWrites','targetWrites','retainedFixtureResets'])assert.equal(receipt[key],0,key);
 assert.equal(receipt.shadowCaptured,true);assert.equal(receipt.comparison.rawBytes,0);assert.equal(receipt.comparison.normalizedBytes,0);
 assert.equal(receipt.comparison.scope,'public');assert.ok(receipt.comparison.securityObjects>1000);
 assert.equal(intent.targetReadOnly,true);assert.equal(intent.apply,false);assert.equal(intent.project,receipt.project);assert.equal(intent.targetProject,receipt.targetProject);
 assert.equal(Object.keys(packageHashes).length,432);assert.ok(!Object.hasOwn(packageHashes,dealRelease.deferred));assert.deepEqual(intent.sourceHashes,packageHashes);
 assert.equal(Object.keys(retention.before).length,23);assert.deepEqual(retention.after,retention.before);
 return {project:receipt.project,independentReplay:true,normalizedBytes:0,retainedTables:23};
}
