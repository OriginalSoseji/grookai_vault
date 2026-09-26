import './vendor_storefront_network_guard.cjs';
import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import{createRequire}from'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript'),database='hrtbjchobencariqclab';
const source=fs.readFileSync('apps/web/src/lib/stores/visualMatchServer.ts','utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function load({pilot=true,url='https://'+database+'.supabase.co',old='true',visual='true',expanded='false',artifact=database}={}){
 const exports={},calls=[];vm.runInNewContext(code,{exports,Map,Date,process:{cwd:()=>process.cwd(),env:{SUPABASE_URL:url,GROOKAI_STORE_SCAN_MATCH_V2_ENABLED:old,GROOKAI_STORE_SCAN_MATCH_V14_ENABLED:expanded,GROOKAI_STORE_SCAN_VISUAL_V24_ENABLED:visual}},require:name=>{
  if(name==='./storeProductionTarget.mjs')return{productionStoreTarget:()=>false};if(name==='server-only')return{};if(name==='node:path')return require('node:path');if(name==='./visualMatchIndex.json')return{database};if(name==='./scanExpandedManifestV13.json')return{database:artifact};if(name==='./scanProcessV1.mjs')return{runScanProcess:async()=>{calls.push('legacy');return{candidates:[]};}};if(name==='./scanVisualServerV24')return{visualCandidatesV24:async()=>{calls.push('visual');return{candidates:[]};}};if(name==='@/lib/vendorPilot.mjs')return{vendorPilot:pilot,VENDOR_PILOT_DATABASE:'https://'+database+'.supabase.co'};if(name==='@/lib/collectorStaging.mjs')return{vendorBatchLocalTest:false};throw Error(name);
 }});return{...exports,calls};
}
test('visual candidate requires explicit flag, original pilot gate and exact artifact target',()=>{
 assert.equal(load().geometryVisualMatchingEnabled(),true);
 for(const scenario of[{pilot:false},{url:'https://ycdxbpibncqcchqiihfz.supabase.co'},{old:'false'},{visual:'false'},{artifact:'other'}])assert.equal(load(scenario).geometryVisualMatchingEnabled(),false);
});
test('new worker is lazy and opt-in; conflicting candidate flags fail closed',async()=>{
 const legacy=load({visual:'false'});await legacy.visualCandidates(new Uint8Array([1]));assert.deepEqual(legacy.calls,['legacy']);
 const visual=load();await visual.visualCandidates(new Uint8Array([1]));assert.deepEqual(visual.calls,['visual']);
 const conflict=load({expanded:'true'});await assert.rejects(conflict.visualCandidates(new Uint8Array([1])));assert.deepEqual(conflict.calls,[]);
});
test('visual concurrency stays at one across owners and release permits retry',()=>{
 const api=load(),release=api.beginVisualMatch('one');assert.equal(typeof release,'function');assert.equal(api.beginVisualMatch('two'),null);assert.equal(api.beginVisualMatch('one'),null);release();release();assert.equal(typeof api.beginVisualMatch('two'),'function');
 const legacy=load({visual:'false'});assert.equal(typeof legacy.beginVisualMatch('one'),'function');assert.equal(typeof legacy.beginVisualMatch('two'),'function');assert.equal(legacy.beginVisualMatch('three'),null);
});

