import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function route(kind,{result,error,cookies={}}={}){
 const source=fs.readFileSync(new URL(`../../app/api/square/oauth/${kind}/route.ts`,import.meta.url),'utf8');
 let calls=0,input;const saved=[];
 class Reply extends Response{
  cookies={set:(...args)=>saved.push(args)};
  static redirect(destination,init){return new Reply(null,{...init,headers:{...init.headers,location:String(destination)}});}
 }
 const sandbox={exports:{},URL,Error,require:name=>{
  if(name==='next/server')return{NextResponse:Reply};
  if(name==='@/lib/getSiteOrigin')return{getSiteOrigin:()=> 'https://grookaivault.com'};
  if(name==='@/lib/square/http')return{squareHeaders:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'},squareBackend:()=>({[kind]:async value=>{calls++;input=value;if(error)throw error;return result;}})};
  throw Error('Unexpected import: '+name);
 }};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return{get:query=>sandbox.exports.GET({nextUrl:new URL('https://grookaivault.com/api/square/oauth/'+kind+'?'+query),cookies:{get:name=>cookies[name]?{value:cookies[name]}:undefined}}),calls:()=>calls,input:()=>input,saved};
}
test('native cancellation and expired state return publicly to the app without a second grookai login',async()=>{
 for(const query of['state=fixture-state&error=access_denied','state=expired&code=private-code']){
  const h=route('callback',{error:Error('untrusted provider detail'),cookies:{'grookai-square-return':'native','grookai-square-oauth':'nonce'}});
  const response=await h.get(query),location=new URL(response.headers.get('location'));
  assert.equal(response.status,303);assert.equal(location.pathname,'/square/return');
  assert.equal(location.search,'?status=reconnect_required');
  assert.equal(h.calls(),1);assert.equal(h.input().browserNonce,'nonce');
  assert.equal(h.saved.length,2);assert.ok(h.saved.every(row=>row[2].maxAge===0&&row[2].httpOnly&&row[2].secure));
  assert.equal(response.headers.get('cache-control'),'private, no-store');
 }
});
test('only a successful server callback establishes connected; fixed return hints cannot inject a destination',async()=>{
 const h=route('callback',{result:{clientReturn:'web'},cookies:{'grookai-square-return':'native'}});
 const response=await h.get('state=s&code=c');
 assert.equal(response.headers.get('location'),'https://grookaivault.com/account/connections/square?status=connected');
 const bad=route('callback',{error:Error(),cookies:{'grookai-square-return':'https://attacker.invalid'}});
 assert.equal((await bad.get('error=denied')).headers.get('location'),'https://grookaivault.com/account/connections/square?status=reconnect_required');
});
test('duplicate OAuth parameters never reach the exchange; native return is retained',async()=>{
 for(const query of['state=a&state=b','code=a&code=b','error=a&error=b']){
  const h=route('callback',{cookies:{'grookai-square-return':'native'}});
  const response=await h.get(query);assert.equal(h.calls(),0);
  assert.equal(new URL(response.headers.get('location')).pathname,'/square/return');
 }
});
test('launch binds browser nonce and server-derived return hint separately, with fixed paths and expiry',async()=>{
 const h=route('launch',{result:{browserNonce:'opaque-nonce',authorizationUrl:'https://connect.squareup.com/oauth2/authorize',clientReturn:'native'}});
 const response=await h.get('capability=one-time');assert.equal(response.status,303);assert.equal(h.input(),'one-time');
 assert.equal(h.saved[0][0],'grookai-square-oauth');assert.equal(h.saved[0][2].maxAge,600);
 assert.equal(h.saved[1][0],'grookai-square-return');assert.equal(h.saved[1][1],'native');assert.equal(h.saved[1][2].maxAge,1800);
 assert.ok(h.saved.every(row=>row[2].secure&&row[2].httpOnly&&row[2].sameSite==='lax'));
});
test('an expired launch gets a recovery page with no credential or untrusted redirect parameters',async()=>{
 const h=route('launch',{error:Error('private capability')});
 const response=await h.get('capability=private&return=https://attacker.invalid');
 assert.equal(response.headers.get('location'),'https://grookaivault.com/square/reconnect');
 assert.equal(h.saved.length,0);
});
