// Diagnostic proof that the billing foundation is additive. This is not PrePush.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,fixture,project,hash,sql,guardRuntime} from './vendor_billing_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guardRuntime();
const replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const release='C:/gv_store_release_20260919';
const query=fs.readFileSync(path.join(release,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
const original=JSON.parse(fs.readFileSync(path.join(release,'docs/audits/vendor_storefront_release_package_v1/release-schema-footprint.json')));
const current=JSON.parse(sql(query));assert.equal(current.transaction_read_only,'on');
const key=o=>`${o.kind}:${o.key}`;
const originalMap=new Map(original.objects.map(o=>[key(o),o]));
const currentMap=new Map(current.objects.map(o=>[key(o),o]));
const changed=[];
for(const [k,old] of originalMap) {
 const next=currentMap.get(k);assert.ok(next,`Existing object removed: ${k}`);
 if(JSON.stringify(old)!==JSON.stringify(next)) {
  assert.equal(old.kind,'function');
  assert.ok(['public.vendor_store_capabilities_v1(','public.vendor_referral_credit_v1('].some(prefix=>old.key.startsWith(prefix)),`Unexpected changed object: ${k}`);
  const withoutBody=({definition_hash,...metadata})=>metadata;
  assert.deepEqual(withoutBody(old.value),withoutBody(next.value),'Existing function security metadata changed');
  changed.push({key:k,previous:old.value.definition_hash,current:next.value.definition_hash});
 }
}
assert.equal(changed.length,2);
const additions=current.objects.filter(o=>!originalMap.has(key(o)));
for(const o of additions)assert.ok(o.key.startsWith('public.vendor_billing_')||o.key.startsWith('public.vendor_account_financial_holds')||o.key.startsWith('public.grookai_effective_entitlement_v1(')||
 ['public.user_entitlements.billing_plan','public.user_entitlements.billing_paid_from','public.user_entitlements.billing_paid_through','public.user_entitlements.user_entitlements_billing_window','public.user_entitlements.user_entitlements_billing_owner'].includes(o.key),`Unexpected added object: ${key(o)}`);
assert.equal(additions.filter(o=>o.kind==='relation').length,6);
assert.equal(additions.filter(o=>o.kind==='function').length,26);
const receipt={at:new Date().toISOString(),status:'passed',project,image:runtime.image,imageId:runtime.imageId,
 migrations:runtime.migrations,sourceHashes:runtime.sourceHashes,resetLogSha256:replay.logSha256,
 existingObjectsUnchanged:original.objects.length-changed.length,reviewedFunctionChanges:changed,billingObjectsAdded:additions.length,
 footprintSha256:hash(JSON.stringify(current.objects)),fullChainResetReplay:true,
 productionWrites:0,sharedResets:0,rolloutEnabled:false,remotePrePushPassed:false};
fs.writeFileSync(path.join(root,'docs/audits/vendor_stripe_billing_schema_v1/closeout-replay.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',migrations:runtime.migrations,existingObjectsUnchanged:receipt.existingObjectsUnchanged,reviewedFunctionChanges:changed.length,billingObjectsAdded:additions.length}));
