import './vendor_storefront_network_guard.cjs';import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';import vm from'node:vm';import {createRequire}from'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript'),database='hrtbjchobencariqclab';
const source=fs.readFileSync(new URL('../../apps/web/src/lib/stores/visualMatchServer.ts',import.meta.url),'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function load({pilot=true,url='https://'+database+'.supabase.co',old='true',expanded='true',artifact=database}={}){
 const exports={};vm.runInNewContext(code,{exports,Map,Date,process:{env:{SUPABASE_URL:url,GROOKAI_STORE_SCAN_MATCH_V2_ENABLED:old,GROOKAI_STORE_SCAN_MATCH_V13_ENABLED:'true',GROOKAI_STORE_SCAN_MATCH_V14_ENABLED:expanded}},require:name=>{
  if(name==='./storeProductionTarget.mjs')return{productionStoreTarget:()=>false};if(name==='server-only')return{};if(name==='node:path')return require('node:path');if(name==='./visualMatchIndex.json')return{database};if(name==='./scanExpandedManifestV13.json')return{database:artifact};if(name==='./scanProcessV1.mjs')return{runScanProcess:async()=>({candidates:[]})};if(name==='@/lib/vendorPilot.mjs')return{vendorPilot:pilot,VENDOR_PILOT_DATABASE:'https://'+database+'.supabase.co'};if(name==='@/lib/collectorStaging.mjs')return{vendorBatchLocalTest:false};throw Error(name);
 }});return exports;
}
test('expanded matching needs both flags, the fixed pilot and matching artifact target',()=>{
 assert.equal(load().expandedVisualMatchingEnabled(),true);
 for(const scenario of[{pilot:false},{url:'https://ycdxbpibncqcchqiihfz.supabase.co'},{old:'false'},{expanded:'false'},{artifact:'other'}])assert.equal(load(scenario).expandedVisualMatchingEnabled(),false);
});
test('expanded matching allows one active process; release is idempotent and retries remain usable',()=>{
 const api=load(),release=api.beginVisualMatch('first');assert.equal(typeof release,'function');assert.equal(api.beginVisualMatch('second'),null);assert.equal(api.beginVisualMatch('first'),null);release();release();
 const second=api.beginVisualMatch('second');assert.equal(typeof second,'function');assert.equal(api.beginVisualMatch('third'),null);second();assert.equal(typeof api.beginVisualMatch('third'),'function');
});
