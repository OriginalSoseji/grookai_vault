import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript');
function load(file,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:file}).outputText,{exports,URL,Buffer,require:name=>{assert.ok(name in deps,name);return deps[name];}});return exports;}
const origin='https://grookaivault.com';
test('store invitation and authentication destinations never reach analytics',()=>{
  const safe=load('apps/web/src/lib/stores/storeTeamSafePath.ts');
  for(const value of ['/account/store/team/accept?token=secret','/account/store/team/accept/','/login?next='+encodeURIComponent('/account/store/team/accept?token=secret'),'/auth/callback?next='+encodeURIComponent('/account/store/team/accept?token=secret')])assert.equal(safe.isStoreTeamSecretUrl(value),true,value);
  for(const value of ['/account/store/team','/store/example','/login?next=%2Fvault'])assert.equal(safe.isStoreTeamSecretUrl(value),false,value);
  const analytics=load('apps/web/src/components/analytics/SafeAnalytics.tsx',{'react/jsx-runtime':{},'@vercel/analytics/react':{},'@/lib/stores/storeTeamSafePath':safe,'@/lib/binders/safePath':{isBinderSecretPath:()=>false},'@/lib/collectorPreview':{collectorPreview:false},'@/lib/collectorStaging.mjs':{collectorStaging:false}});
  assert.equal(analytics.sanitizeBinderAnalyticsUrl(origin+'/account/store/team/accept?token=secret'),null);
  assert.equal(analytics.sanitizeBinderAnalyticsUrl(origin+'/store/example'),origin+'/store/example');
});
test('team helper rejects foreign origins before auth and enforces bounded JSON',async()=>{
  let authCalls=0;const helpers=load('apps/web/src/lib/stores/storeTeamServer.ts',{'server-only':{},'next/server':require('next/server'),'@/lib/getSiteOrigin':{getSiteOrigin:()=>origin},'./storefrontServer':{STORE_NO_STORE:{'cache-control':'private, no-store'}},'@/lib/supabase/server':{createServerComponentClient:async()=>{authCalls++;return{auth:{getUser:async()=>({data:{user:{id:'real-session-user'}},error:null})}};}}});
  await assert.rejects(helpers.teamClient(new Request(origin,{headers:{origin:'https://other.invalid'}}),true));assert.equal(authCalls,0);
  await helpers.teamClient(new Request(origin,{headers:{origin}}),true);assert.equal(authCalls,1);
  assert.deepEqual(JSON.parse(JSON.stringify(await helpers.teamBody(new Request(origin,{method:'POST',body:'{"action":"invite"}'})))),{action:'invite'});
  for(const body of ['[]','null','{"x":"'+'a'.repeat(9000)+'"}'])await assert.rejects(helpers.teamBody(new Request(origin,{method:'POST',body})));
});
test('owner route derives invitation origin and passes only governed arguments',async()=>{
  const calls=[];const route=load('apps/web/src/app/api/stores/team/route.ts',{'next/server':{},'@/lib/getSiteOrigin':{getSiteOrigin:()=>origin},'@/lib/stores/storeTeamServer':{teamClient:async()=>({rpc:async(name,args)=>{calls.push({name,args});return{data:{token:'a'.repeat(64)},error:null};}}),teamBody:async()=>({action:'invite',email:'manager@example.invalid',permissions:['pricing'],owner_id:'forged',url:'https://evil.invalid'}),teamJson:value=>value,teamFailure:error=>{throw error;}}});
  const result=await route.POST({});assert.equal(new URL(result.url).origin,origin);assert.equal(calls[0].name,'vendor_store_team_change_v1');assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_action:'invite',p_email:'manager@example.invalid',p_subject:null,p_permissions:['pricing']});
});
