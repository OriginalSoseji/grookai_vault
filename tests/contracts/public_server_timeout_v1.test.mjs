import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=fs.readFileSync('apps/web/src/lib/supabase/publicServer.ts','utf8');
function load(transport){
 const mod={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module:mod,exports:mod.exports,Request,AbortSignal,fetch:transport,require:id=>{
  if(id==='server-only')return {};
  if(id==='@supabase/supabase-js')return {createClient:(_url,_key,opts)=>opts};
  if(id==='@/lib/supabase/config')return {getSupabaseServerConfig:()=>({url:'http://127.0.0.1:54321',publishableKey:'test'})};
  if(id==='@/lib/collectorPreview')return {collectorPreview:false};
  throw Error('unexpected module '+id);
 }});
 return mod.exports.createPublicServerClient;
}
test('bounded public request aborts a stalled endpoint',async()=>{
 const create=load((_input,init)=>new Promise((_resolve,reject)=>{
  if(init.signal.aborted)return reject(new Error('aborted'));
  init.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
 }));
 // Keep a referenced timer while Node's timeout signal uses an unrefed timer.
 const timer=setTimeout(()=>{},1000);
 try {await assert.rejects(()=>create(300,20).global.fetch('http://127.0.0.1:54321'),/aborted/);} finally {clearTimeout(timer);}
});
test('a caller cancellation remains effective with a configured deadline',async()=>{
 let received;
 const create=load(async (_input,init)=>{received=init;return new Response();});
 const controller=new AbortController();
 await create(60,5000).global.fetch('http://127.0.0.1:54321',{signal:controller.signal});
 controller.abort();assert.equal(received.signal.aborted,true);
});
