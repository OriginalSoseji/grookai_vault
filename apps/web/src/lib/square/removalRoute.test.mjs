import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const owner='ee000000-0000-4000-8000-000000000001',instance='ee000000-0000-4000-8000-000000000002';
function route({signedIn=true,originAllowed=true,error}={}){
 const calls=[];
 const sandbox={exports:{},process:{env:{}},require:name=>{
  if(name==='next/server')return{};
  if(name==='@/lib/square/http')return{
   squareOwner:async()=>signedIn?{actorId:owner}:null,
   squareOriginAllowed:()=>originAllowed,squareBody:async request=>request.body,
   squareReply:(body,status=200)=>({body,status}),squareFailure:()=>({status:503}),
   squareId:value=>{if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value))throw Error('invalid');return value;},
   squareBackend:()=>({commerce:{prepareVaultRemoval:async(...args)=>{calls.push(args);if(error)throw error;return{status:'ready_to_archive',instanceId:instance,gvvi:'GVVI-EE000000-000001'};}}}),
  };
  throw Error('Unexpected import '+name);
 }};
 const source=fs.readFileSync(new URL('../../app/api/square/route.ts',import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 return{post:body=>sandbox.exports.POST({body}),calls};
}
test('removal uses the authenticated owner and exact copy; client owner and connection are ignored',async()=>{
 const h=route(),r=await h.post({action:'prepareRemoval',instanceId:instance,ownerId:'attacker',connectionId:'attacker'});
 assert.equal(r.status,200);assert.deepEqual(h.calls,[[owner,instance]]);
});
test('signed-out, invalid-origin and malformed-copy requests cannot prepare provider withdrawal',async()=>{
 for(const [options,body,status]of [[{signedIn:false},{action:'prepareRemoval',instanceId:instance},401],
  [{originAllowed:false},{action:'prepareRemoval',instanceId:instance},403],[{},{action:'prepareRemoval',instanceId:'invalid'},503]]){
  const h=route(options);assert.equal((await h.post(body)).status,status);assert.equal(h.calls.length,0);
 }
});
test('unconfirmed backend result never becomes a successful removal response',async()=>{
 const h=route({error:Error('provider uncertainty')});assert.equal((await h.post({action:'prepareRemoval',instanceId:instance})).status,503);assert.equal(h.calls.length,1);
});
