// Prepare and audit only. No remote writes, uploads or serving activation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,fixture,hash} from './storefront_production_lab_v1.mjs';
import {loadReferenceMetadataV27} from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import {loadFeatureManifestV29,FEATURE_MANIFEST_PINS} from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import {FEATURE_BUCKET_V29,featurePathV29} from '../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
assert.equal(process.argv.length,2);
const source='C:/gv_store_billing_20260919',target='ycdxbpibncqcchqiihfz';
const dir=path.join(fixture,'production-features-v1');assert.ok(!fs.existsSync(dir));fs.mkdirSync(dir);
const authority=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/reference-authority.json')));
assert.equal(authority.target,target);assert.equal(authority.eligible,20079);assert.equal(authority.excluded.length,0);
assert.ok(Date.now()-Date.parse(authority.at)<86400000);
const qualificationFile=path.join(source,'docs/audits/vendor_scan_runtime_v30/PROOF_20260925.json');
const qualification=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(qualification.linux.qualified,true);assert.equal(qualification.linux.exactReferences,20079);
const metadata=loadReferenceMetadataV27(path.join(root,'apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz'));
const features=loadFeatureManifestV29(path.join(root,'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz'),metadata);
const local=JSON.parse(fs.readFileSync(path.join(source,'.local/integration/vendor-scan-runtime-v29/manifest.private.json')));
assert.equal(local.pins.sha256,FEATURE_MANIFEST_PINS.sha256);assert.equal(local.references.length,20079);
const allowed=['.local/integration/vendor-scan-runtime-v28/regression2/features','.local/integration/vendor-scan-runtime-v29/windows-generated/features'].map(p=>fs.realpathSync(path.join(source,p)).toLowerCase()+path.sep);
const objects=new Map();
for(const row of local.references){
  const feature=features.get(row.id);assert.ok(feature);assert.equal(feature.artifactSha256,row.artifactSha256);assert.equal(feature.bytes,row.bytes);
  const file=fs.realpathSync(path.resolve(source,row.localSource));assert.ok(allowed.some(prefix=>file.toLowerCase().startsWith(prefix)));
  const bytes=fs.readFileSync(file);assert.equal(bytes.length,feature.bytes);assert.equal(hash(bytes),feature.artifactSha256);
  objects.set(featurePathV29(feature),{path:featurePathV29(feature),sha256:feature.artifactSha256,bytes:feature.bytes,source:file});
}
const token=execFileSync('pwsh',['-NoProfile','-File',path.join(source,'scripts/preview/collector_management_credential.ps1')],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const p=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(p.ok);assert.equal((await p.json()).id,target);
const query=`begin isolation level repeatable read read only;set local statement_timeout='30s';
select jsonb_build_object('read_only',current_setting('transaction_read_only'),
'bucket',(select to_jsonb(b) from storage.buckets b where id='vendor-scan-features-v29'),
'objects',(select count(*) from storage.objects where bucket_id='vendor-scan-features-v29'),
'policies',(select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p where schemaname='storage' and tablename='objects')) as state;rollback;`;
const response=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(45000)});assert.ok(response.ok);
const state=(await response.json())[0].state;assert.equal(state.read_only,'on');assert.equal(state.bucket,null);assert.equal(state.objects,0);
fs.writeFileSync(path.join(dir,'storage-boundary.json'),JSON.stringify(state,null,2),{flag:'wx'});
const plan={at:new Date().toISOString(),target,bucket:FEATURE_BUCKET_V29,public:false,objects:[...objects.values()],references:features.size,bytes:[...objects.values()].reduce((n,r)=>n+r.bytes,0),authorityReceiptSha256:hash(JSON.stringify(authority)),qualificationSha256:hash(fs.readFileSync(qualificationFile)),featureManifestSha256:FEATURE_MANIFEST_PINS.sha256};
assert.equal(plan.objects.length,19621);assert.equal(plan.bytes,8478139239);
const encoded=JSON.stringify(plan,null,2);fs.writeFileSync(path.join(dir,'plan.private.json'),encoded,{flag:'wx'});
const receipt={at:plan.at,target,bucket:plan.bucket,public:false,objects:plan.objects.length,references:plan.references,bytes:plan.bytes,allLocalHashesVerified:true,currentProductionAuthorityVerified:true,planSha256:hash(encoded),storagePolicies:state.policies,productionWrites:0};
fs.writeFileSync(path.join(root,'docs/audits/storefront_production_20260926/feature-plan.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({...receipt,storagePolicies:state.policies.length}));
