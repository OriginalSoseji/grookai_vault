import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),ts=require('typescript'),next=require('next/server');
const code='a'.repeat(64),origin='https://grookaivault.com';
function route(file,{enabled=true,cookie=code,user={id:'trusted-user'},error=null}={}){
  const calls=[],exports={};
  const deps={'next/server':next,'next/headers':{cookies:async()=>({get:()=>({value:cookie})})},'@/lib/supabase/server':{createServerComponentClient:async()=>({auth:{getUser:async()=>({data:{user}})},rpc:async(name,args)=>{calls.push({name,args});return{error};}})},'@/lib/stores/storeTrial':{storeTrialEnabled:()=>enabled,validStoreTrialCode:v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),storeTrialHeaders:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'},STORE_TRIAL_COOKIE:'grookai_store_trial',STORE_TRIAL_ORIGIN:origin}};
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,URL,require:name=>{assert.ok(name in deps,name);return deps[name];}});return{...exports,calls};
}
const start='apps/web/src/app/store-trial/start/route.ts',activation='apps/web/src/app/api/stores/trial/activate/route.ts';
test('invitation entry is gated and keeps codes out of authentication destinations',()=>{
  assert.equal(route(start,{enabled:false}).GET(new next.NextRequest(origin+'/store-trial/start?code='+code)).status,404);
  assert.equal(route(start).GET(new next.NextRequest(origin+'/store-trial/start?code=bad')).status,400);
  const r=route(start).GET(new next.NextRequest(origin+'/store-trial/start?code='+code));assert.equal(r.status,303);assert.equal(r.headers.get('location'),origin+'/store-trial');assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('referrer-policy'),'no-referrer');
  const cookie=r.headers.get('set-cookie');for(const pattern of [/HttpOnly/i,/Secure/i,/SameSite=lax/i])assert.match(cookie,pattern);
});
test('activation rejects disabled, foreign-origin and malformed-cookie requests without an RPC',async()=>{
  for(const [options,headers,status] of [[{enabled:false},{origin},404],[{},{origin:'https://other.invalid'},403],[{cookie:'bad'},{origin},403]]){
    const r=route(activation,options);assert.equal((await r.POST(new next.NextRequest(origin+'/api/stores/trial/activate',{method:'POST',headers}))).status,status);assert.equal(r.calls.length,0);
  }
});
test('authentication returns to the token-free trial page; only a verified session can activate',async()=>{
  const anonymous=route(activation,{user:null}),request=new next.NextRequest(origin+'/api/stores/trial/activate',{method:'POST',headers:{origin}});
  const login=await anonymous.POST(request);assert.equal(login.headers.get('location'),origin+'/login?next=%2Fstore-trial');assert.equal(anonymous.calls.length,0);
  const active=route(activation),r=await active.POST(request);assert.equal(r.status,303);assert.equal(r.headers.get('location'),origin+'/account/store');assert.equal(active.calls.length,1);assert.equal(active.calls[0].name,'vendor_store_trial_activate_v1');assert.deepEqual(JSON.parse(JSON.stringify(active.calls[0].args)),{p_code:code});
});
test('database rejection never grants access or navigates to inventory',async()=>{
  const active=route(activation,{error:{code:'42501'}});const r=await active.POST(new next.NextRequest(origin+'/api/stores/trial/activate',{method:'POST',headers:{origin}}));assert.equal(r.status,403);assert.equal(r.headers.get('location'),null);assert.match(r.headers.get('cache-control'),/no-store/);
});
