import fs from 'node:fs';import assert from 'node:assert/strict';import test from 'node:test';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(new URL('../../apps/web/src/lib/square/notifyOfferSaved.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({actor='owner',enabled=true,result={focusStatus:'ready'},failure=false}={}){
 const jobs=[],calls=[];
 const dependencies={
  'server-only':{},'next/server':{after:job=>jobs.push(job)},
  '@/lib/supabase/server':{createServerComponentClient:async()=>({auth:{getUser:async()=>({data:{user:{id:actor}}})},rpc:async()=>({data:{connections:[{id:'connection',environment:'production',status:'connected',autoSync:true}]}})})},
  './http':{squareBackend:()=>({commerce:{processConnection:async(...args)=>{calls.push(args);if(failure)throw Error('provider failure');return result;}}})},
 };
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,process:{env:{GROOKAI_SQUARE_COMMERCE_ENABLED:String(enabled),SQUARE_ENVIRONMENT:'production'}},require:name=>{assert.ok(name in dependencies,name);return dependencies[name];}});
 return{notify:module.exports.notifySquareOfferSaved,jobs,calls};
}
test('the short sale editor waits for confirmed focused-copy readiness',async()=>{
 const f=fixture();assert.equal(await f.notify('owner','copy',{waitForResult:true}),'ready');assert.equal(f.jobs.length,0);assert.deepEqual(JSON.parse(JSON.stringify(f.calls)),[['owner','connection',{manual:false,maxTargets:2,focusInstanceId:'copy'}]]);
});
test('busy, missing or malformed results never become ready',async()=>{
 for(const result of [{busy:true},{focusStatus:'invented'},null,{}, {focusStatus:'pending'}]){const f=fixture({result});assert.equal(await f.notify('owner','copy',{waitForResult:true}),'pending');}
});
test('worker failures preserve the Vault save as pending',async()=>{
 const f=fixture({failure:true});assert.equal(await f.notify('owner','copy',{waitForResult:true}),'pending');
});
test('ordinary owner changes keep the existing deferred worker behavior',async()=>{
 const f=fixture();assert.equal(await f.notify('owner','copy'),'pending');assert.equal(f.calls.length,0);assert.equal(f.jobs.length,1);await f.jobs[0]();assert.equal(f.calls.length,1);
});
test('disabled commerce and mismatched owners cannot dispatch',async()=>{
 for(const options of [{enabled:false},{actor:'other'}]){const f=fixture(options);assert.equal(await f.notify('owner','copy',{waitForResult:true}),'not_enabled');assert.equal(f.calls.length,0);assert.equal(f.jobs.length,0);}
});
