import './vendor_storefront_network_guard.cjs';
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import{createRequire}from'node:module';
import * as delivery from'../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
import * as features from'../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
const source=fs.readFileSync('apps/web/src/lib/stores/scanVisualServerV24.ts','utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
const origin='https://hrtbjchobencariqclab.supabase.co',bytes=Buffer.from('fixture');
const row={id:'00000000-0000-4000-8000-000000000001',gv_id:'GV-PK-TST-1',image_path:'warehouse-derived/self-hosted-images-v1/1.webp',sha256:delivery.hashReference(bytes)};
function load({url=origin,visible=true,printing=true,changed=false,v25=false,v26=false,v27=false,v29=false,metadataFails=false,featureFails=false}={}){
 const exports={},calls=[];
 const createClient=(target,key)=>{
  assert.equal(target,origin);calls.push({kind:'client',key});
  return key==='public-fixture'?{from:table=>{assert.equal(table,'card_prints');return{select:()=>({in:async()=>({error:null,data:visible?[{...row,image_source:'identity',image_status:'exact',image_path:changed?'changed':row.image_path}]:[]})})};}}:{storage:{from:bucket=>{assert.equal(bucket,v29?features.FEATURE_BUCKET_V29:'user-card-images');return{createSignedUrls:async paths=>{calls.push({kind:'sign',paths,bucket});return{error:null,data:paths.map(p=>({path:p,signedUrl:origin+'/storage/v1/object/sign/'+bucket+'/'+p+'?token=synthetic'}))};}};}}};
 };
 vm.runInNewContext(code,{exports,Map,URL,performance,AbortSignal,Uint8Array,Response,process:{env:{SUPABASE_SECRET_KEY:'secret-fixture',GROOKAI_STORE_SCAN_VISUAL_V25_ENABLED:String(v25),GROOKAI_STORE_SCAN_VISUAL_V26_ENABLED:String(v26),GROOKAI_STORE_SCAN_METADATA_V27_ENABLED:String(v27),GROOKAI_STORE_SCAN_FEATURES_V29_ENABLED:String(v29)},cwd:()=>process.cwd()},fetch:async(u,init)=>{calls.push({kind:'fetch',url:u});assert.equal(init.redirect,'error');return new Response(bytes,{headers:{'content-type':'image/webp'}});},require:name=>{
  if(name==='server-only')return{};if(name==='node:path')return require(name);if(name==='@supabase/supabase-js')return{createClient};
  if(name==='@/lib/supabase/config')return{getSupabaseServerConfig:()=>({url,publishableKey:'public-fixture'})};
  if(name==='@/lib/cards/getPublicCardPrintingOptions')return{getPublicCardPrintingOptions:async()=>printing?[{id:row.id,card_print_id:row.id,printing_gv_id:row.gv_id+'-H',finish_is_active:true}]:[]};
  if(name==='@/lib/vendorPilot.mjs')return{VENDOR_PILOT_DATABASE:origin};if(name==='@/lib/collectorStaging.mjs')return{vendorBatchLocalTest:false};
  if(name==='./scanReferenceDeliveryV24.mjs')return{...delivery,createReferenceDelivery:opts=>delivery.createReferenceDelivery({...opts,fetchImage:async(u,init)=>{calls.push({kind:'fetch',url:u});assert.equal(init.redirect,'error');return new Response(bytes,{headers:{'content-type':'image/webp'}});}})};
  if(name==='./scanVisualCatalogV24.mjs')return{visualReferenceMetadataV24:()=>{calls.push({kind:'metadata-v24'});return new Map([[row.id,row]]);}};
  if(name==='./scanReferenceMetadataV27.mjs')return{visualReferenceMetadataV27:()=>{calls.push({kind:'metadata-v27'});if(metadataFails)throw Error('Invalid metadata');return new Map([[row.id,row]]);}};
  if(name==='./scanFeatureManifestV29.mjs')return{featureManifestV29:()=>{calls.push({kind:'features-v29'});if(featureFails)throw Error('Feature manifest unavailable');return new Map([[row.id,{id:row.id,imageSha256:row.sha256,artifactSha256:delivery.hashReference(Buffer.from('features')),bytes:8}]]);}};
  if(name==='./scanFeatureDeliveryV29.mjs')return{...features,createFeatureDeliveryV29:opts=>features.createFeatureDeliveryV29({...opts,fetchFeature:async(u,init)=>{calls.push({kind:'fetch-feature',url:u});assert.equal(init.redirect,'error');return new Response(Buffer.from('features'),{headers:{'content-type':'application/octet-stream'}});}})};
  if(name==='./scanVisualProcessV24.mjs')return{runVisualProcessV24:async(entry,b,opts)=>{const limit=v25||v26||v29?30000:20000;assert.ok(opts.timeoutMs<=limit&&opts.timeoutMs>limit-1000);assert.ok(entry.endsWith(v29?'scanVisualWorkerV29.mjs':v26?'scanVisualWorkerV26.mjs':v25?'scanVisualWorkerV25.mjs':'scanVisualWorkerV24.mjs'));assert.equal(!!opts.featureManifest,v29);assert.equal(opts.onResources,undefined);return{packets:await opts.loadReferences([row.id],{signal:opts.signal})};}};
  throw Error(name);
 }});return{...exports,calls};
}
test('server authorizes using anonymous client before administrative signing',async()=>{
 const api=load(),result=await api.visualCandidatesV24(bytes);assert.equal(result.packets.length,1);assert.deepEqual(api.calls.filter(c=>c.kind==='client').map(c=>c.key),['public-fixture','secret-fixture']);assert.deepEqual(api.calls.find(c=>c.kind==='sign').paths,[row.image_path]);
});
test('optimized worker is selected only by its explicit flag inside the V24 boundary',async()=>{
 for(const v25 of[false,true]){const api=load({v25}),result=await api.visualCandidatesV24(bytes);assert.equal(result.packets.length,1);}
});
test('pipelined worker has its own opt-in and diagnostics stay off by default',async()=>{
 for(const v25 of[false,true]){const api=load({v25,v26:true}),result=await api.visualCandidatesV24(bytes);assert.equal(result.packets.length,1);}
});
test('hidden, printing-ineligible or changed bindings never use an admin client or media',async()=>{
 for(const scenario of[{visible:false},{printing:false},{changed:true}]){const api=load(scenario),result=await api.visualCandidatesV24(bytes);assert.equal(result.packets.length,0);assert.equal(api.calls.filter(c=>c.kind==='client').length,1);assert.ok(api.calls.every(c=>!['sign','fetch'].includes(c.kind)));}
});
test('production target and pre-aborted requests make no service calls',async()=>{
 const api=load({url:'https://ycdxbpibncqcchqiihfz.supabase.co'});await assert.rejects(api.visualCandidatesV24(bytes));assert.equal(api.calls.length,0);
 const local=load(),controller=new AbortController();controller.abort();await assert.rejects(local.visualCandidatesV24(bytes,controller.signal));assert.equal(local.calls.length,0);
});

test('metadata opt-in changes only the parent loader and fails closed',async()=>{for(const v27 of[false,true])for(const v25 of[false,true])for(const v26 of[false,true]){const api=load({v27,v25,v26});await api.visualCandidatesV24(bytes);assert.deepEqual(api.calls.filter(c=>c.kind.startsWith('metadata-')).map(c=>c.kind),[v27?'metadata-v27':'metadata-v24']);}const bad=load({v27:true,metadataFails:true});await assert.rejects(bad.visualCandidatesV24(bytes));assert.deepEqual(bad.calls.map(c=>c.kind),['metadata-v27']);});

test('V29 explicitly selects features with metadata and replaces experimental pipelining',async()=>{
 for(const v26 of[false,true]){const api=load({v29:true,v26});const result=await api.visualCandidatesV24(bytes);
 assert.equal(Buffer.from(result.packets[0].bytes).toString(),'features');
 assert.deepEqual(api.calls.filter(c=>c.kind==='client').map(c=>c.key),['public-fixture','secret-fixture']);
 assert.deepEqual(api.calls.filter(c=>c.kind.startsWith('metadata-')).map(c=>c.kind),['metadata-v27']);
 assert.equal(api.calls.find(c=>c.kind==='sign').bucket,features.FEATURE_BUCKET_V29);}
 const legacy=load();await legacy.visualCandidatesV24(bytes);assert.ok(!legacy.calls.some(c=>c.kind==='features-v29'));
});
test('V29 retains current visibility, printing and exact-image binding checks',async()=>{
 for(const scenario of[{visible:false},{printing:false},{changed:true}]){const api=load({...scenario,v29:true});
 const result=await api.visualCandidatesV24(bytes);assert.equal(result.packets.length,0);
 assert.equal(api.calls.filter(c=>c.kind==='client').length,1);assert.ok(!api.calls.some(c=>['sign','fetch','fetch-feature'].includes(c.kind)));}
});
test('V29 manifest failure has no image fallback or administrative action',async()=>{
 const api=load({v29:true,featureFails:true});await assert.rejects(api.visualCandidatesV24(bytes));
 assert.deepEqual(api.calls.map(c=>c.kind),['metadata-v27','features-v29']);
});
