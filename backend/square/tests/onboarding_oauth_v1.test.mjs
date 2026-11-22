import test from 'node:test';
import assert from 'node:assert/strict';
import {SquareCatalogService} from '../service_v1.mjs';
import {openSquareCredential,sealSquareCredential} from '../credential_envelope_v1.mjs';
const owner='10000000-0000-4000-8000-000000000001';
const key=Buffer.alloc(32,7).toString('base64');
const config={environment:'sandbox',linkingEnabled:true,appId:'fixture-app',appSecret:'fixture-secret',encryptionKey:key,callbackUrl:'https://example.invalid/api/square/oauth/callback'};
test('return context is bound inside the encrypted one-time launch, including old web attempts',async()=>{
 for(const clientReturn of['native','web']){
  let saved,providerState;
  const service=new SquareCatalogService({config,rpc:async(action,data)=>{
   if(action==='oauth_start'){saved=data;return{};}
   assert.equal(action,'oauth_launch');return{id:saved.attemptId,ownerId:owner,environment:'sandbox',state_ciphertext:saved.stateCiphertext};
  },clientFactory:()=>({authorizationUrl:input=>{providerState=input.state;return'https://connect.squareupsandbox.com/oauth2/authorize';}})});
  const start=await service.start(owner,{clientReturn});
  assert.equal(start.launchUrl.includes('native'),false);assert.equal(start.launchUrl.includes('fixture-secret'),false);
  const launch=await service.launch(new URL(start.launchUrl).searchParams.get('capability'));
  assert.equal(launch.clientReturn,clientReturn);assert.match(providerState,/^[A-Za-z0-9_-]{43}$/);
  const context={purpose:'launch',environment:'sandbox',ownerId:owner,connectionId:saved.attemptId,bindingId:saved.attemptId};
  assert.equal(openSquareCredential(saved.stateCiphertext,key,context).clientReturn,clientReturn);
  saved.stateCiphertext=sealSquareCredential({state:providerState},key,context);
  assert.equal((await service.launch(new URL(start.launchUrl).searchParams.get('capability'))).clientReturn,'web');
 }
});
test('denied native consent is consumed and failed without exchanging a code',async()=>{
 const calls=[];let consumed=false;
 const service=new SquareCatalogService({config,rpc:async(action)=>{
  calls.push(action);if(action==='oauth_consume'){if(consumed)throw Error('consumed');consumed=true;return{id:owner,ownerId:owner,environment:'sandbox',clientReturn:'native'};}return{};
 },clientFactory:()=>{throw Error('No provider request is permitted');}});
 const input={state:'a'.repeat(43),browserNonce:'b'.repeat(43),denied:true};
 await assert.rejects(service.callback(input),{code:'square_authorization_denied'});
 assert.deepEqual(calls,['oauth_consume','oauth_fail']);
 await assert.rejects(service.callback(input),/consumed/);
 assert.deepEqual(calls,['oauth_consume','oauth_fail','oauth_consume']);
});
