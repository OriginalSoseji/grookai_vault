import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/stores/scanProductionAdmission.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const valid={lease:'00000000-0000-4000-8000-000000000001',database_ref:'ycdxbpibncqcchqiihfz',artifact_sha256:'a'.repeat(64),metadata_sha256:'b'.repeat(64),feature_manifest_sha256:'c'.repeat(64)};
function load({production=true,data=valid,error=null}={}){
  const calls=[],exports={};
  vm.runInNewContext(code,{exports,console:{warn(){}},require:name=>{
    if(name==='server-only')return {};
    if(name==='./storeProductionTarget.mjs')return {productionStoreTarget:()=>production};
    if(name==='./scanReferenceMetadataV27.mjs')return {METADATA_SOURCE_SHA256:valid.artifact_sha256,METADATA_SHA256:valid.metadata_sha256};
    if(name==='./scanFeatureManifestV29.mjs')return {FEATURE_MANIFEST_PINS:{sha256:valid.feature_manifest_sha256}};
    if(name==='@/lib/supabase/admin')return {createServerAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return name==='vendor_scan_acquire_v1'?{data,error}:{error:null};}})};
    throw Error(name);
  }});
  return {...exports,calls};
}
test('production scan requires a shared server lease and exact reference release',async()=>{
  const api=load(),release=await api.acquireProductionScan('authenticated-owner');assert.equal(typeof release,'function');
  assert.equal(api.calls.length,1);assert.equal(api.calls[0].name,'vendor_scan_acquire_v1');assert.equal(api.calls[0].args.p_owner,'authenticated-owner');
  await release();await release();assert.equal(api.calls.length,2);assert.equal(api.calls[1].args.p_lease,valid.lease);
});
test('each mismatched release pin fails closed and returns its shared slot',async()=>{
  for(const field of ['database_ref','artifact_sha256','metadata_sha256','feature_manifest_sha256']){
    const api=load({data:{...valid,[field]:'wrong'}});assert.equal(await api.acquireProductionScan('owner'),null,field);
    assert.equal(api.calls.length,2);assert.equal(api.calls[1].name,'vendor_scan_release_v1');
  }
});
test('DB rejection, outage or malformed lease never admits a worker',async()=>{
  for(const scenario of [{data:null},{error:{message:'unavailable'}},{data:{...valid,lease:'invalid'}}]){
    const api=load(scenario);assert.equal(await api.acquireProductionScan('owner'),null);assert.equal(api.calls.length,1);
  }
});
test('existing isolated pilot does not contact the production admission RPC',async()=>{
  const api=load({production:false}),release=await api.acquireProductionScan('owner');await release();assert.equal(api.calls.length,0);
});
