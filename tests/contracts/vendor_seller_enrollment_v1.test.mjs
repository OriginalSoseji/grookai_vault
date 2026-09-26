import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createSellerAccount,recoverSellerAccount,createSellerOnboardingLink,SELLER_CONTROLLER,sellerReturnOrigin} from '../../apps/web/src/lib/payments/vendorSellerEnrollment.ts';
import {createVendorSellerService} from '../../apps/web/src/lib/payments/vendorSellerService.ts';
import {SellerError} from '../../apps/web/src/lib/payments/vendorSellerRepository.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const now=1800000000,owner='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',store='33333333-3333-4333-8333-333333333333',attemptId='44444444-4444-4444-8444-444444444444',token='55555555-5555-4555-8555-555555555555';
const config={secretKey:['sk','test','syntheticOnly'].join('_'),webhookSecret:['whsec','syntheticOnlyNeverRealSecret'].join('_'),scope:{accountId:'acct_platform',livemode:false}};
function fixture(){
 const attempt={id,ownerId:owner,storeId:store,platformAccountId:'acct_platform',livemode:false,controller:{...SELLER_CONTROLLER},attemptId,startedAt:now};
 const account={object:'account',id:'acct_seller',created:now,metadata:{grookai_seller_version:'vendor-seller-v1',grookai_seller_binding:id,grookai_seller_attempt:attemptId},
  controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}},
  charges_enabled:false,payouts_enabled:false,details_submitted:false,capabilities:{card_payments:'inactive',transfers:'inactive'},
  requirements:{currently_due:['business_profile.url'],past_due:[],eventually_due:[],pending_verification:[],disabled_reason:null}};
 const f={attempt,account,calls:[],platform:{object:'account',id:'acct_platform'},platformBalance:{object:'balance',livemode:false},balance:{object:'balance',livemode:false},
  link:{object:'account_link',created:now,expires_at:now+300,url:'https://connect.stripe.com/setup/synthetic'},fail:null,onCall:null};
 f.stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,
  httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
   assert.equal(new URL(url).origin,'https://api.stripe.com');const path=new URL(url).pathname,headers=new Headers(options.headers),body=new URLSearchParams(options.body??'');
   const call={path,method:options.method,key:headers.get('idempotency-key'),scope:headers.get('stripe-account'),body};f.calls.push(call);
   assert.equal(headers.get('stripe-version'),STRIPE_BILLING_API_VERSION);
   if(f.onCall)await f.onCall(call);
   if(f.fail===path)return new Response(JSON.stringify({error:{message:'PRIVATE PROVIDER DETAIL',type:'api_error'}}),{status:500});
   let result;
   if(path==='/v1/account'&&call.method==='GET')result=f.platform;
   else if(path==='/v1/balance'&&call.method==='GET'){
    assert.ok(call.scope===null||call.scope==='acct_seller');result=call.scope?f.balance:f.platformBalance;
   }else if(path==='/v1/accounts'&&call.method==='POST')result=f.account;
   else if(path==='/v1/accounts/acct_seller'&&call.method==='GET')result=f.account;
   else if(path==='/v1/account_links'&&call.method==='POST')result=f.link;
   else assert.fail(`Unexpected offline provider call ${call.method} ${path}`);
   return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
  })});
 return f;
}
test('creation verifies platform mode before POST and independently reads incomplete account before binding',async()=>{
 const f=fixture();assert.equal(await createSellerAccount(f.stripe,config,f.attempt,owner,()=>now),'acct_seller');
 assert.deepEqual(f.calls.map(c=>c.path),['/v1/account','/v1/balance','/v1/accounts','/v1/accounts/acct_seller','/v1/balance']);
 const post=f.calls[2];assert.equal(post.scope,null);assert.equal(post.key,`grookai-seller:acct_platform:test:${attemptId}`);
 assert.deepEqual(Object.fromEntries(post.body),{'controller[fees][payer]':'account','controller[losses][payments]':'stripe',
  'controller[requirement_collection]':'stripe','controller[stripe_dashboard][type]':'full',
  'metadata[grookai_seller_version]':'vendor-seller-v1','metadata[grookai_seller_binding]':id,'metadata[grookai_seller_attempt]':attemptId});
 assert.equal(f.calls.at(-1).scope,'acct_seller');
});
test('retry is byte-for-byte same provider parameters and key',async()=>{
 const f=fixture();await createSellerAccount(f.stripe,config,f.attempt,owner,()=>now);
 await createSellerAccount(f.stripe,config,f.attempt,owner,()=>now+30);
 const posts=f.calls.filter(c=>c.method==='POST');assert.equal(posts.length,2);assert.equal(posts[0].key,posts[1].key);assert.equal(posts[0].body.toString(),posts[1].body.toString());
});
for(const [name,mutate] of [
 ['platform identity',f=>f.platform.id='acct_other'],['platform mode',f=>f.platformBalance.livemode=true],
 ['missing platform balance mode',f=>delete f.platformBalance.livemode],['owner',f=>f.attempt.ownerId=store],
 ['wrong stored scope',f=>f.attempt.platformAccountId='acct_other'],['controller',f=>f.attempt.controller.feesPayer='application'],
 ['extra controller input',f=>f.attempt.controller.injected=true],['attempt ID',f=>f.attempt.attemptId='client'],
 ['future start',f=>f.attempt.startedAt++],['expired attempt',f=>f.attempt.startedAt-=23*3600],
])test(`creation refuses ${name} before provider mutation`,async()=>{const f=fixture();mutate(f);await assert.rejects(createSellerAccount(f.stripe,config,f.attempt,owner,()=>now));assert.equal(f.calls.filter(c=>c.method==='POST').length,0);});
for(const [name,mutate] of [
 ['wrong account',f=>f.account.id='acct_platform'],['wrong object',f=>f.account.object='customer'],
 ['missing creation time',f=>delete f.account.created],['earlier creation',f=>f.account.created--],['future creation',f=>f.account.created++],
 ['missing metadata',f=>delete f.account.metadata],['foreign attempt',f=>f.account.metadata.grookai_seller_attempt=store],
 ['foreign binding',f=>f.account.metadata.grookai_seller_binding=store],['wrong version',f=>f.account.metadata.grookai_seller_version='other'],
 ['wrong controller type',f=>f.account.controller.type='account'],['not controller',f=>f.account.controller.is_controller=false],
 ['fees',f=>f.account.controller.fees.payer='application'],['losses',f=>f.account.controller.losses.payments='application'],
 ['requirements',f=>f.account.controller.requirement_collection='application'],['dashboard',f=>f.account.controller.stripe_dashboard.type='express'],
 ['seller mode',f=>f.balance.livemode=true],['missing seller balance',f=>f.balance.object='account'],
])test(`created account cannot bind with ${name}`,async()=>{const f=fixture();mutate(f);await assert.rejects(createSellerAccount(f.stripe,config,f.attempt,owner,()=>now));});
test('provider delays crossing creation deadline stop before POST',async()=>{const f=fixture();let call=0;await assert.rejects(createSellerAccount(f.stripe,config,f.attempt,owner,()=>now+(call++?60:0)));assert.equal(f.calls.some(c=>c.method==='POST'),false);});
test('provider failures are sanitized',async()=>{const f=fixture();f.fail='/v1/accounts';await assert.rejects(createSellerAccount(f.stripe,config,f.attempt,owner,()=>now),e=>e.message==='Seller provider unavailable'&&!e.cause);});
test('old attempt recovery is read only and retains its original creation window',async()=>{const f=fixture();assert.equal(await recoverSellerAccount(f.stripe,config,f.attempt,owner,'acct_seller',now+30*86400),'acct_seller');assert.ok(f.calls.every(c=>c.method==='GET'));f.account.created=now+86400;await assert.rejects(recoverSellerAccount(f.stripe,config,f.attempt,owner,'acct_seller',now+30*86400));});
test('hosted link fixes return/refresh and asks owner to supply identity through Stripe',async()=>{
 const f=fixture();assert.equal(await createSellerOnboardingLink(f.stripe,config,f.attempt,owner,'acct_seller','http://127.0.0.1:18840',()=>now),f.link.url);
 const post=f.calls.at(-1);assert.equal(post.path,'/v1/account_links');assert.deepEqual(Object.fromEntries(post.body),{account:'acct_seller',type:'account_onboarding','collection_options[fields]':'eventually_due',return_url:'http://127.0.0.1:18840/account/store/payments?onboarding=returned',refresh_url:'http://127.0.0.1:18840/account/store/payments?onboarding=refresh'});
});
for(const url of ['https://evil.test/link','https://connect.stripe.com.evil.test/link','https://user@connect.stripe.com/link','https://connect.stripe.com/link#secret','javascript:alert(1)'])test(`reject unsafe onboarding destination ${url}`,async()=>{const f=fixture();f.link.url=url;await assert.rejects(createSellerOnboardingLink(f.stripe,config,f.attempt,owner,'acct_seller','https://grookaivault.com',()=>now));});
for(const [field,value] of [['expires_at',now],['created',now+1],['object','account']])test(`reject invalid link ${field}`,async()=>{const f=fixture();f.link[field]=value;await assert.rejects(createSellerOnboardingLink(f.stripe,config,f.attempt,owner,'acct_seller','https://grookaivault.com',()=>now));});
for(const [origin,live] of [['http://grookaivault.com',false],['http://127.0.0.1:18840',true],['https://grookaivault.com/path',false],['https://x@grookaivault.com',false],['https://grookaivault.com/',false]])test(`reject return origin ${origin} live=${live}`,()=>assert.throws(()=>sellerReturnOrigin(origin,live)));

function serviceFixture(){
 const f=fixture();let row={id,owner_id:owner,store_id:store,stripe_account_id:'acct_platform',livemode:false,controller:{...SELLER_CONTROLLER},
  connected_account_id:null,creation_attempt_id:attemptId,creation_started_at:null,state:'reserved',lease_token:null,lease_fence:0,lease_expires_at:null,closeout_id:null};
 const history=[];let allowed=true;const copy=()=>structuredClone(row),locked=l=>{if(row.lease_token!==l.token||row.lease_fence!==l.fence)throw new SellerError('seller_lease_lost');return copy();};
 const repo={account:async()=>copy(),store:async()=>store,reserve:async(...args)=>{history.push(['reserve',...args]);return copy();},
  claim:async(i,t)=>{if(row.lease_token)return null;row.lease_token=t;row.lease_fence++;return copy();},locked:async l=>locked(l),
  authorize:async()=>{if(!allowed)throw new SellerError('seller_onboarding_unavailable');},
  prepare:async l=>{locked(l);await repo.authorize();row.state='creating';row.creation_started_at??=new Date(now*1000).toISOString();history.push(['prepare']);return copy();},
  bind:async(l,a)=>{locked(l);row.connected_account_id=a;row.state=row.closeout_id?'closing':'bound';history.push(['bind',a]);return copy();},
  release:async l=>{locked(l);row.lease_token=null;history.push(['release']);}};
 const service=createVendorSellerService({repo,stripe:f.stripe,config,onboardingEnabled:true,origin:'https://grookaivault.com',now:()=>now,token:()=>token});
 return {...f,provider:f,repo,service,history,get row(){return row;},set row(v){row=v;},deny(){allowed=false;}};
}
test('orchestrator prepares before POST, binds before link and exposes no provider identity in status',async()=>{
 const f=serviceFixture();f.provider.onCall=call=>{if(call.path==='/v1/accounts')assert.equal(f.row.state,'creating');if(call.path==='/v1/account_links')assert.equal(f.row.state,'bound');};
 assert.equal((await f.service.onboarding(owner)).url,f.link.url);assert.equal(f.row.connected_account_id,'acct_seller');assert.equal(f.row.lease_token,null);
 const status=await f.service.status(owner);assert.equal(status.readiness,null);assert.equal(status.state,'bound');assert.equal(JSON.stringify(status).includes('acct_'),false);
 await f.service.onboarding(owner);assert.equal(f.calls.filter(c=>c.path==='/v1/accounts').length,1);
 const refreshed=await f.service.refresh(owner);assert.equal(refreshed.readiness.capabilitiesReady,false);assert.equal(JSON.stringify(refreshed).includes('acct_'),false);
});
test('lost bind response retries same account attempt without creating new identity',async()=>{
 const f=serviceFixture(),bind=f.repo.bind;let fails=true;f.repo.bind=async(...args)=>{if(fails){fails=false;throw new Error('offline');}return bind(...args);};
 await assert.rejects(f.service.onboarding(owner));assert.equal(f.row.state,'creating');await f.service.onboarding(owner);
 const posts=f.calls.filter(c=>c.path==='/v1/accounts');assert.equal(posts.length,2);assert.equal(posts[0].key,posts[1].key);
});
for(const state of ['closing','deauthorized'])test(`state ${state} prevents provider calls`,async()=>{const f=serviceFixture();f.row.state=state;await assert.rejects(f.service.onboarding(owner));assert.equal(f.calls.length,0);});
test('direct service call without database access performs no provider request',async()=>{const f=serviceFixture();f.deny();await assert.rejects(f.service.onboarding(owner));assert.equal(f.calls.length,0);});
test('foreign owner is rejected before provider access',async()=>{const f=serviceFixture();await assert.rejects(f.service.onboarding(store));assert.equal(f.calls.length,0);});
test('concurrent busy lease prevents provider requests',async()=>{const f=serviceFixture();f.row.lease_token=store;await assert.rejects(f.service.onboarding(owner),/seller_busy/);assert.equal(f.calls.length,0);});
test('deauthorization during link creation discards link and cannot release successor lease',async()=>{
 const f=serviceFixture();f.provider.onCall=c=>{if(c.path==='/v1/account_links'){f.row.state='deauthorized';f.row.lease_fence++;f.row.lease_token=store;}};
 await assert.rejects(f.service.onboarding(owner),/seller_lease_lost/);assert.equal(f.row.lease_token,store);
});
test('downgrade during link creation discards link',async()=>{const f=serviceFixture();f.provider.onCall=c=>{if(c.path==='/v1/account_links')f.deny();};await assert.rejects(f.service.onboarding(owner),/seller_onboarding_unavailable/);assert.equal(f.row.lease_token,null);});
test('readiness lost lease cannot report ready',async()=>{const f=serviceFixture();await f.service.onboarding(owner);f.provider.onCall=c=>{if(c.scope==='acct_seller'){f.row.lease_fence++;f.row.lease_token=null;}};await assert.rejects(f.service.refresh(owner),/seller_lease_lost/);});
test('private recovery can bind an earlier account while retaining closure',async()=>{const f=serviceFixture();f.row.creation_started_at=new Date(now*1000).toISOString();f.row.state='closing';f.row.closeout_id=store;await f.service.recover(owner,'acct_seller');assert.equal(f.row.state,'closing');assert.ok(f.calls.every(c=>c.method==='GET'));});
