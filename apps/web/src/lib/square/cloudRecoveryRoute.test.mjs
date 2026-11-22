import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {timingSafeEqual} from 'node:crypto';
const source=fs.readFileSync(new URL('../../app/api/square/recovery/route.ts',import.meta.url),'utf8'),secret='fixture-only-cron-authorization-value-v3';
function route({env={},result={runId:'10000000-0000-4000-8000-000000000001',status:'succeeded',succeeded:1,failed:0,skipped:0,targetsChecked:2,errorCode:''},error,work}={}){
 let calls=0;const logs=[];
 const sandbox={exports:{},process:{env:{NODE_ENV:'production',VERCEL_ENV:'production',CRON_SECRET:secret,GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED:'true',...env}},Response,Buffer,console:{info:(...args)=>logs.push(args),error:(...args)=>logs.push(args)},require:name=>{
  if(name==='node:crypto')return{timingSafeEqual};if(name==='@/lib/square/cloudRecovery')return{runSquareCloudRecovery:async()=>{calls++;if(error)throw error;return work?await work():result;}};throw Error('Unexpected import: '+name);
 }};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return {get:(authorization,extra={})=>sandbox.exports.GET(new Request('https://grookaivault.com/api/square/recovery?ownerId=ignored',{headers:{...(authorization?{authorization}:{}),...extra}})),head:()=>sandbox.exports.HEAD(),calls:()=>calls,logs};
}
test('missing, incorrect, owner-style and unicode headers cannot initialize the worker',async()=>{
 for(const authorization of [undefined,'Bearer short','Bearer '+secret+'extra','Bearer '+'x'.repeat(secret.length),'Bearer '+'é'.repeat(secret.length),'Bearer fixture-owner-token']){
  const h=route(),response=await h.get(authorization);assert.equal(response.status,401);assert.equal(h.calls(),0);assert.equal(response.headers.get('cache-control'),'private, no-store');
 }
});
test('unconfigured and malformed cron secrets fail closed',async()=>{
 for(const CRON_SECRET of [undefined,'','short',' '+secret,secret+'\n']){const h=route({env:{CRON_SECRET}});assert.equal((await h.get('Bearer '+secret)).status,401);assert.equal(h.calls(),0);}
});
test('valid secrets cannot run preview or development deployments',async()=>{
 for(const VERCEL_ENV of [undefined,'preview','development']){const h=route({env:{VERCEL_ENV}});assert.equal((await h.get('Bearer '+secret)).status,503);assert.equal(h.calls(),0);}
});
test('default-off clock is paused without contacting the backend',async()=>{
 const h=route({env:{GROOKAI_SQUARE_CLOUD_RECOVERY_ENABLED:undefined}}),response=await h.get('Bearer '+secret);assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'paused'});assert.equal(h.calls(),0);
});
test('an authenticated scheduled invocation awaits ordinary reconciliation and records its run identifier',async()=>{
 const h=route(),response=await h.get('Bearer '+secret,{'x-vercel-cron-schedule':'2-57/5 * * * *'});assert.equal(response.status,200);assert.equal(h.calls(),1);assert.equal((await response.json()).targetsChecked,2);assert.equal(JSON.parse(h.logs[0][1]).trigger,'scheduled');assert.equal(JSON.stringify(h.logs).includes(secret),false);
});
test('authenticated operator checks are distinguishable from natural cron deliveries',async()=>{
 const h=route();await h.get('Bearer '+secret);assert.equal(JSON.parse(h.logs[0][1]).trigger,'operator');
});
test('failed durable jobs return a failure status rather than a success-shaped response',async()=>{
 const h=route({result:{status:'failed',runId:'10000000-0000-4000-8000-000000000001',failed:1,errorCode:'square_state_unavailable'}});assert.equal((await h.get('Bearer '+secret)).status,503);
});
test('unexpected failures expose neither raw error details nor non-UUID identifiers',async()=>{
 const error=Object.assign(new Error('fixture credential must remain private'),{code:'PRIVATE_ERROR_DETAIL',runId:'fixture-secret-value'}),h=route({error}),response=await h.get('Bearer '+secret),body=await response.json();assert.equal(response.status,503);assert.deepEqual(body,{error:'square_worker_failed'});assert.equal(JSON.stringify(h.logs).includes('fixture-secret-value'),false);assert.equal(JSON.stringify(h.logs).includes('credential must'),false);
});
test('HEAD checks are harmless and cannot trigger GET side effects',async()=>{const h=route(),response=await h.head();assert.equal(response.status,405);assert.equal(h.calls(),0);});
test('the HTTP callback waits for the durable worker result before replying',async()=>{
 let release,settled=false;const work=new Promise(resolve=>{release=resolve;}),h=route({work:()=>work});const pending=h.get('Bearer '+secret).then(response=>{settled=true;return response;});await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls(),1);assert.equal(settled,false);release({status:'succeeded',succeeded:1,failed:0,skipped:0});assert.equal((await pending).status,200);
});
test('production cron configuration preserves the Square recovery and independent pricing clock',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../../../vercel.json',import.meta.url)));assert.deepEqual(config.crons,[{path:'/api/square/recovery',schedule:'2-57/5 * * * *'},{path:'/api/vendor-pricing/recovery',schedule:'1-56/5 * * * *'}]);assert.equal(config.functions['src/app/api/stores/owner/intake/match/route.ts'].supportsCancellation,true);assert.equal(config.env.NEXT_PUBLIC_POKEMON_SEALED_CLIENT_V1_ENABLED,'true');assert.equal(config.build.env.NEXT_PUBLIC_POKEMON_SEALED_CLIENT_V1_ENABLED,'true');
});
