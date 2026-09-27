import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
function client(fetch){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/web/src/components/stores/storeTeamWorkflowClient.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,fetch});return exports;}
test('uncertain creation transport preserves the request bytes for idempotent retry',async()=>{
  const calls=[];let fail=true;
  const api=client(async(url,options)=>{calls.push({url,...options});if(fail)throw new Error('Connection lost');return{ok:true,json:async()=>({id:'existing-copy'})};});
  const body={request:'one-logical-request',data:{printing_id:'exact-printing',amount:18.5,listed:true}};
  let caught;try{await api.teamWrite('/api/local-test',body);}catch(error){caught=error;}
  assert.equal(api.definitiveRejection(caught),false);fail=false;
  assert.equal((await api.teamWrite('/api/local-test',body)).id,'existing-copy');
  assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].credentials,'same-origin');assert.equal(calls[0].cache,'no-store');
});
test('only confirmed input/auth rejections unlock a failed creation draft',async()=>{
  for(const status of [400,401,403,409,500,502]){
    const api=client(async()=>({ok:false,status,json:async()=>({error:'Rejected'})}));
    try{await api.teamWrite('/api/local-test',{});assert.fail('Expected failure');}
    catch(error){assert.equal(error.status,status);assert.equal(api.definitiveRejection(error),[400,401,403].includes(status));}
  }
  const api=client(async()=>({ok:false,status:502,json:async()=>{throw new Error('Invalid upstream response');}}));
  try{await api.teamWrite('/api/local-test',{});assert.fail('Expected failure');}catch(error){assert.equal(api.definitiveRejection(error),false);}
});
