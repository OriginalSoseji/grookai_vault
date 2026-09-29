import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {verifySellerAdoption,sellerOwnerEmailHash} from '../../apps/web/src/lib/payments/vendorSellerAdoption.ts';
import {createSellerAdoptionService} from '../../apps/web/src/lib/payments/vendorSellerAdoptionService.ts';
import {createSellerAdoptionHandlers} from '../../apps/web/src/lib/payments/vendorSellerAdoptionHttp.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const now=1800000000,ownerId='11111111-1111-4111-8111-111111111111';
const scope={accountId:'acct_platform',livemode:true};
function fixture(){
 const owner={id:ownerId,email:'vendor@example.invalid',emailConfirmed:true};
 const grant={id:'22222222-2222-4222-8222-222222222222',ownerId,storeId:'33333333-3333-4333-8333-333333333333',
  platformAccountId:'acct_platform',connectedAccountId:'acct_seller',livemode:true,
  ownerEmailSha256:sellerOwnerEmailHash(owner.email),createdAt:now-60,expiresAt:now+600};
 const account={object:'account',id:'acct_seller',email:owner.email,created:now-86400,metadata:{},
  controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}}};
 const bodies=[{object:'account',id:'acct_platform'},{object:'balance',livemode:true},account,{object:'balance',livemode:true}];
 const calls=[],expected=['/v1/account','/v1/balance','/v1/accounts/acct_seller','/v1/balance'];
 const stripe=new Stripe(['sk','test','syntheticOnly'].join('_'),{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,
  httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
   const index=calls.length;assert.equal(String(url),'https://api.stripe.com'+expected[index]);assert.equal(options.method,'GET');
   const headers=new Headers(options.headers);assert.equal(headers.get('stripe-account'),index===3?'acct_seller':null);
   assert.equal(headers.get('stripe-version'),STRIPE_BILLING_API_VERSION);calls.push({method:options.method,path:expected[index]});
   return new Response(JSON.stringify(bodies[index]),{status:bodies[index]?.error?403:200,headers:{'content-type':'application/json'}});
  })});
 let clock=()=>now;
 return {owner,grant,account,bodies,calls,stripe,setClock(fn){clock=fn},run(){return verifySellerAdoption(stripe,scope,grant,owner,clock)}};
}
test('existing older account verifies with GETs and separate provenance, without invented creation attempts',async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.connectedAccountId,'acct_seller');assert.equal(result.providerCreatedAt,now-86400);
 assert.equal(result.version,'vendor-seller-adoption-v1');assert.match(result.sha256,/^[0-9a-f]{64}$/);assert.equal(f.calls.length,4);
 assert.ok(!JSON.stringify(result).includes(f.owner.email));assert.equal(result.attemptId,undefined);
});
for(const [name,mutate,count] of [
 ['foreign owner',f=>f.owner.id='44444444-4444-4444-8444-444444444444',0],
 ['unconfirmed app email',f=>f.owner.emailConfirmed=false,0],
 ['changed app email',f=>f.owner.email='other@example.invalid',0],
 ['missing owner email',f=>f.owner.email='',0],
 ['bad email hash',f=>f.grant.ownerEmailSha256='bad',0],
 ['foreign platform grant',f=>f.grant.platformAccountId='acct_foreign',0],
 ['wrong grant mode',f=>f.grant.livemode=false,0],
 ['platform as seller',f=>f.grant.connectedAccountId='acct_platform',0],
 ['expired approval',f=>f.grant.expiresAt=now,0],
 ['future approval',f=>f.grant.createdAt=now+1,0],
 ['unbounded approval',f=>f.grant.expiresAt=now+8*86400,0],
 ['wrong actual platform',f=>f.bodies[0].id='acct_foreign',1],
 ['wrong actual platform mode',f=>f.bodies[1].livemode=false,2],
 ['missing platform mode',f=>delete f.bodies[1].livemode,2],
 ['foreign account response',f=>f.account.id='acct_foreign',3],
 ['different Stripe email',f=>f.account.email='other@example.invalid',3],
 ['missing Stripe email',f=>f.account.email=null,3],
 ['absent metadata evidence',f=>delete f.account.metadata,3],
 ['existing Grookai binding',f=>f.account.metadata.grookai_seller_binding='already',3],
 ['existing Grookai attempt',f=>f.account.metadata.grookai_seller_attempt='already',3],
 ['future account',f=>f.account.created=now+6,3],
 ['missing created date',f=>delete f.account.created,3],
 ['not platform controlled',f=>f.account.controller.is_controller=false,3],
 ['foreign controller',f=>f.account.controller.type='account',3],
 ['different fees payer',f=>f.account.controller.fees.payer='application',3],
 ['different loss liability',f=>f.account.controller.losses.payments='application',3],
 ['different requirement collector',f=>f.account.controller.requirement_collection='application',3],
 ['different dashboard',f=>f.account.controller.stripe_dashboard.type='express',3],
 ['seller wrong actual mode',f=>f.bodies[3].livemode=false,4],
 ['seller missing mode',f=>delete f.bodies[3].livemode,4],
])test('adoption rejects '+name,async()=>{const f=fixture();mutate(f);await assert.rejects(f.run());assert.equal(f.calls.length,count);});
test('provider failure emits no provider payload',async()=>{const f=fixture();f.bodies[2]={error:{message:'secret provider detail',type:'invalid_request_error'}};
 await assert.rejects(f.run(),e=>e.message==='Seller adoption provider unavailable'&&!e.message.includes('secret'));});
for(const finish of [now-1,now+60,now+601])test('elapsed time and approval expiry reject '+finish,async()=>{
 const f=fixture();let calls=0;f.setClock(()=>calls++===0?now:finish);await assert.rejects(f.run());});
test('case/outer whitespace normalize without provider data disclosure',async()=>{const f=fixture();f.account.email=' Vendor@Example.Invalid ';assert.equal((await f.run()).ownerEmailSha256,f.grant.ownerEmailSha256);});
function serviceFixture(){const f=fixture();let binding=null,grant=f.grant,writes=0;
 const repo={async binding(){return binding},async grant(){return grant},async adopt(owner,id,evidence){
  assert.equal(owner,ownerId);assert.equal(id,f.grant.id);assert.equal(evidence.connectedAccountId,'acct_seller');writes++;
  binding={adoptionGrantId:id,state:'bound',platformAccountId:scope.accountId,livemode:true};return binding;}};
 const service=createSellerAdoptionService({repo,stripe:f.stripe,scope,now:()=>now});
 return {...f,service,repo,get writes(){return writes},setBinding(v){binding=v},setGrant(v){grant=v}};}
test('connection consumes reviewed grant once; lost response retry never recreates provider account',async()=>{
 const f=serviceFixture();assert.equal(await f.service.available(ownerId),true);
 assert.deepEqual(await f.service.connect(f.owner),{connected:true});assert.deepEqual(await f.service.connect(f.owner),{connected:true});
 assert.equal(f.writes,1);assert.equal(f.calls.length,4);assert.equal(await f.service.available(ownerId),false);
});
test('no operator grant gives no connection and no provider calls',async()=>{const f=serviceFixture();f.setGrant(null);assert.equal(await f.service.available(ownerId),false);await assert.rejects(f.service.connect(f.owner));assert.equal(f.calls.length,0);});
for(const state of ['closing','deauthorized','reserved','creating'])test('retained '+state+' never reopens',async()=>{
 const f=serviceFixture();f.setBinding({state,adoptionGrantId:f.grant.id,platformAccountId:scope.accountId,livemode:true});await assert.rejects(f.service.connect(f.owner));assert.equal(f.calls.length,0);
});
test('retained binding cannot cross provider modes',async()=>{const f=serviceFixture();f.setBinding({state:'bound',adoptionGrantId:f.grant.id,platformAccountId:scope.accountId,livemode:false});await assert.rejects(f.service.connect(f.owner));});
test('concurrent deauthorization at database consume rejects success',async()=>{const f=serviceFixture();f.repo.adopt=async()=>({state:'deauthorized'});await assert.rejects(f.service.connect(f.owner));});
function httpFixture(){const f=serviceFixture();let owner=f.owner,enabled=true;
 const handlers=createSellerAdoptionHandlers({authenticate:async()=>owner,origin:()=> 'https://grookaivault.com',service:()=>enabled?f.service:null});
 const post=(body={action:'connect'},origin='https://grookaivault.com')=>handlers.POST(new Request('https://grookaivault.com/api/vendor-payments/adoption',{
  method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)}));
 return {...f,handlers,post,signOut(){owner=null},disable(){enabled=false}};}
test('HTTP derives owner and hides provider identifiers',async()=>{const f=httpFixture();const get=await f.handlers.GET();assert.deepEqual(await get.json(),{available:true});
 const result=await f.post();assert.equal(result.status,200);assert.deepEqual(await result.json(),{connected:true});assert.match(result.headers.get('cache-control'),/private, no-store/);});
for(const body of [{action:'connect',account:'acct_seller'},{action:'connect',ownerId},{action:'connect',evidence:{}},{action:'connect',grantId:'x'},[],null,{action:'onboarding'}])
 test('HTTP rejects caller authority '+JSON.stringify(body),async()=>{const f=httpFixture();assert.equal((await f.post(body)).status,400);assert.equal(f.calls.length,0);});
test('HTTP rejects cross-origin and signed-out requests before provider work',async()=>{const f=httpFixture();assert.equal((await f.post(undefined,'https://evil.invalid')).status,403);f.signOut();assert.equal((await f.handlers.GET()).status,401);assert.equal((await f.post()).status,401);assert.equal(f.calls.length,0);});
test('disabled rollout exposes no pending account and cannot connect',async()=>{const f=httpFixture();f.disable();assert.deepEqual(await (await f.handlers.GET()).json(),{available:false});assert.equal((await f.post()).status,503);assert.equal(f.calls.length,0);});
