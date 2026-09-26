import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createVendorBillingService} from '../../apps/web/src/lib/billing/vendorBillingService.ts';
import {BillingError} from '../../apps/web/src/lib/billing/vendorBillingRepository.ts';
import {createVendorBillingHandlers} from '../../apps/web/src/lib/billing/vendorBillingHandlers.ts';
import {createVendorBillingPortal} from '../../apps/web/src/lib/billing/vendorStripePortal.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const owner='a4000000-0000-4000-8000-000000000001',attemptId='b4000000-0000-4000-8000-000000000001';
const scope={accountId:'acct_fixture',livemode:false},catalog={store_app:'price_app',store_web:'price_web'};
const config={scope,catalog,siteOrigin:'http://127.0.0.1:17640',secretKey:['sk','test','fixtureOnly'].join('_'),webhookSecret:['whsec','fixtureOnlyNotARealSecret'].join('_')};
const clone=x=>structuredClone(x);
function setup(){
 const calls=[],now=Math.floor(Date.now()/1000),events=new Map();
 let account={owner_id:owner,stripe_account_id:scope.accountId,livemode:false,customer_id:null,customer_attempt_id:attemptId,customer_attempt_created_at:new Date((now-10)*1000).toISOString(),current_subscription_id:null,subscription_status:'none',lease_token:null,lease_fence:0};
 let attempt=null,projection=null,blocked=null,bindCrash=false;
 const session={id:'cs_test_fixture',object:'checkout.session',mode:'subscription',livemode:false,customer:'cus_fixture',client_reference_id:attemptId,recovered_from:null,status:'open',subscription:null,url:'https://checkout.stripe.com/c/pay/test_fixture'};
 const price={id:catalog.store_web,livemode:false,active:true,currency:'usd',unit_amount:5000,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
 const sub={id:'sub_fixture',customer:'cus_fixture',livemode:false,status:'active',collection_method:'charge_automatically',pause_collection:null,cancel_at:null,cancel_at_period_end:false,latest_invoice:'in_fixture',items:{has_more:false,data:[{id:'si_fixture',quantity:1,current_period_start:now-10,current_period_end:now+3600,price}]}};
 const invoice={id:'in_fixture',customer:'cus_fixture',livemode:false,status:'paid',collection_method:'charge_automatically',currency:'usd',status_transitions:{paid_at:now-9},parent:{subscription_details:{subscription:'sub_fixture'}},lines:{has_more:false,data:[{period:{start:now-10,end:now+3600},quantity:1,pricing:{price_details:{price:catalog.store_web}},parent:{subscription_item_details:{subscription_item:'si_fixture',subscription:'sub_fixture'}}}]}};
 const provider=(name,work)=>async(...args)=>{calls.push({name,args});assert.ok(account.lease_token,`Provider ${name} called without lease`);return clone(await work(...args));};
 const stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,httpClient:Stripe.createFetchHttpClient(async()=>{throw new Error('NETWORK_FORBIDDEN');})});
 stripe.accounts.retrieve=provider('stripe.account',()=>({id:scope.accountId}));
 stripe.customers.create=provider('stripe.customer',()=>({id:'cus_fixture',livemode:false}));
 stripe.prices.retrieve=provider('stripe.price',()=>price);
 stripe.checkout.sessions.create=provider('stripe.checkout',()=>session);
 stripe.checkout.sessions.retrieve=provider('stripe.session',()=>session);
 stripe.checkout.sessions.listLineItems=provider('stripe.lines',()=>({has_more:false,data:[{quantity:1,price}]}));
 stripe.subscriptions.retrieve=provider('stripe.subscription',()=>sub);
 stripe.invoices.retrieve=provider('stripe.invoice',()=>invoice);
 const assertLease=l=>{assert.equal(l.ownerId,owner);if(l.token!==account.lease_token||l.fence!==account.lease_fence)throw new BillingError('billing_lease_lost');};
 const repo={
  async account(id,s){assert.equal(id,owner);assert.deepEqual(s,scope);return clone(account);},
  async customer(id,s){assert.deepEqual(s,scope);return id===account.customer_id?clone(account):null;},
  async reserve(id,s){calls.push({name:'reserve'});assert.equal(id,owner);assert.deepEqual(s,scope);return clone(account);},
  async claim(id,token){calls.push({name:'claim'});assert.equal(id,owner);if(account.lease_token)return null;account.lease_token=token;account.lease_fence++;return clone(account);},
  async release(l){calls.push({name:'release'});assertLease(l);account.lease_token=null;},
  async prepare(l){calls.push({name:'prepare'});assertLease(l);if(blocked)throw new BillingError(blocked);return clone(account);},
  async bindCustomer(l,id){assertLease(l);account.customer_id=id;return clone(account);},
  async noteCustomerCreation(l){assertLease(l);calls.push({name:'customer-intent'});},
  async pending(){return attempt&&['creating','open','completed'].includes(attempt.state)?clone(attempt):null;},
  async beginCheckout(l,plan){assertLease(l);if(!attempt)attempt={id:attemptId,owner_id:owner,customer_id:account.customer_id,requested_plan:plan,created_at:new Date((now-5)*1000).toISOString(),session_id:null,subscription_id:null,state:'creating'};if(attempt.requested_plan!==plan)throw new BillingError('billing_checkout_already_pending');return clone(attempt);},
  async bindCheckout(l,a,id,state,subId){assertLease(l);assert.equal(a.id,attempt.id);if(bindCrash){bindCrash=false;throw new BillingError('billing_unavailable');}Object.assign(attempt,{session_id:id,state,subscription_id:subId});return clone(attempt);},
  async commit(l,p,id,event){calls.push({name:'commit'});assertLease(l);if(id)assert.equal(id,attempt.id);projection=clone(p);account.current_subscription_id=p.subscriptionId;attempt.state='enrolled';if(event)events.set(event,{state:'processed'});account.lease_token=null;},
  async enqueue(s,e){assert.deepEqual(s,scope);if(!events.has(e.id))events.set(e.id,{state:'pending'});return events.get(e.id);},
  async ignore(l,id){assertLease(l);events.set(id,{state:'ignored'});account.lease_token=null;},
  async fail(l,id,code){assertLease(l);events.set(id,{state:'pending',code});account.lease_token=null;},
  async defer(l,code){assertLease(l);calls.push({name:'defer',code});account.lease_token=null;},
 };
 const service=createVendorBillingService({repo,stripe,config,checkoutEnabled:true,now:()=>now});
 return {calls,now,account,session,price,sub,invoice,stripe,repo,service,events,config,
  block:code=>{blocked=code;},crashBind:()=>{bindCrash=true;},attempt:()=>attempt,projection:()=>projection,
  event:()=>({id:'evt_fixture',type:'invoice.paid',customerId:'cus_fixture',subscriptionId:'sub_fixture',created:now}),
  async complete(){await service.checkout(owner,'store_web');session.status='complete';session.subscription='sub_fixture';session.url=null;},
 };
}
test('checkout eligibility precedes every provider call and grants nothing',async()=>{
 const x=setup();const r=await x.service.checkout(owner,'store_web');assert.equal(r.url,x.session.url);assert.equal(x.projection(),null);
 assert.ok(x.calls.findIndex(c=>c.name==='prepare')<x.calls.findIndex(c=>c.name==='stripe.customer'));assert.equal(x.account.lease_token,null);
});
for(const code of ['billing_entitlement_inactive','billing_entitlement_binding_required','billing_store_unavailable'])test(`${code} blocks before Stripe`,async()=>{
 const x=setup();x.block(code);await assert.rejects(x.service.checkout(owner,'store_web'),e=>e.code===code);assert.equal(x.calls.filter(c=>c.name.startsWith('stripe.')).length,0);
});
test('checkout kill switch blocks new checkout while existing reconciliation remains possible',async()=>{
 const x=setup();const service=createVendorBillingService({...x,now:()=>x.now,checkoutEnabled:false});await assert.rejects(service.checkout(owner,'store_web'),e=>e.code==='billing_checkout_disabled');assert.equal(x.calls.length,0);
 await x.complete();await service.reconcile(owner);assert.equal(x.projection().features.store_web,true);
});
test('lost session-binding response retries the same durable key and recovers one checkout',async()=>{
 const x=setup();x.crashBind();await assert.rejects(x.service.checkout(owner,'store_web'));await x.service.checkout(owner,'store_web');
 const requests=x.calls.filter(c=>c.name==='stripe.checkout');assert.equal(requests.length,2);assert.equal(requests[0].args[1].idempotencyKey,requests[1].args[1].idempotencyKey);
 assert.equal(x.calls.filter(c=>c.name==='stripe.customer').length,1);assert.equal(x.projection(),null);
});
test('known sessions resume without creating another provider checkout',async()=>{
 const x=setup();await x.service.checkout(owner,'store_web');await x.service.checkout(owner,'store_web');assert.equal(x.calls.filter(c=>c.name==='stripe.checkout').length,1);
});
test('ambiguous old customer attempt stops before any provider request',async()=>{
 const x=setup();x.account.customer_attempt_created_at=new Date((x.now-23*3600)*1000).toISOString();await assert.rejects(x.service.checkout(owner,'store_web'),e=>e.code==='billing_recovery_required');assert.equal(x.calls.filter(c=>c.name.startsWith('stripe.')).length,0);
});
test('complete checkout alone stays pending, reconciliation retrieves payment before commit',async()=>{
 const x=setup();await x.complete();const r=await x.service.checkout(owner,'store_web');assert.equal(r.state,'pending');assert.equal(x.projection(),null);
 await x.service.reconcile(owner);assert.equal(x.projection().features.store_web,true);assert.ok(x.calls.findIndex(c=>c.name==='stripe.invoice')<x.calls.findIndex(c=>c.name==='commit'));
});
test('unpaid current invoice commits no paid capabilities',async()=>{
 const x=setup();await x.complete();x.invoice.status='open';await x.service.reconcile(owner);assert.equal(x.projection().features.store_app,false);
});
test('duplicate signed event processes once and does not re-fetch subscription state',async()=>{
 const x=setup();await x.complete();await x.service.acceptEvent(x.event());await x.service.acceptEvent(x.event());assert.equal(x.calls.filter(c=>c.name==='stripe.subscription').length,1);assert.equal(x.events.get('evt_fixture').state,'processed');
});
test('provider failure is retained as a retryable event without losing the lease',async()=>{
 const x=setup();await x.complete();x.stripe.subscriptions.retrieve=async()=>{throw new Error('synthetic provider failure');};await assert.rejects(x.service.acceptEvent(x.event()));assert.deepEqual(x.events.get('evt_fixture'),{state:'pending',code:'reconciliation_failed'});assert.equal(x.account.lease_token,null);assert.equal(x.projection(),null);
});
test('scheduled reconciliation failure persists backoff without a webhook event',async()=>{
 const x=setup();await x.complete();x.stripe.subscriptions.retrieve=async()=>{throw new Error('synthetic provider failure');};
 await assert.rejects(x.service.reconcile(owner));assert.equal(x.calls.at(-1).name,'defer');assert.equal(x.calls.at(-1).code,'reconciliation_failed');assert.equal(x.account.lease_token,null);assert.equal(x.projection(),null);
});
test('an open hosted checkout defers periodic polling without granting access',async()=>{
 const x=setup();await x.service.checkout(owner,'store_web');await assert.rejects(x.service.reconcile(owner),e=>e.code==='billing_checkout_pending');
 assert.equal(x.calls.at(-1).code,'checkout_pending');assert.equal(x.account.lease_token,null);assert.equal(x.projection(),null);
});
test('busy callback remains pending for Stripe retry',async()=>{
 const x=setup();await x.complete();x.account.lease_token='busy';await assert.rejects(x.service.acceptEvent(x.event()),e=>e.code==='billing_busy');assert.equal(x.events.get('evt_fixture').state,'pending');
});
test('late event for a different subscription cannot revoke current access',async()=>{
 const x=setup();await x.complete();await x.service.reconcile(owner);const before=x.calls.length;await x.service.acceptEvent({...x.event(),subscriptionId:'sub_old'});assert.equal(x.events.get('evt_fixture').state,'ignored');assert.equal(x.projection().features.store_web,true);assert.equal(x.calls.slice(before).some(c=>c.name.startsWith('stripe.')),false);
});
test('unrelated existing Stripe customer cannot select an owner from event metadata',async()=>{
 const x=setup();await x.service.acceptEvent({...x.event(),customerId:'cus_other',ownerId:owner});assert.equal(x.events.size,0);assert.equal(x.calls.length,0);
});

function http(x,authenticated=owner){let mutations=0;const runtime={...x,status:async id=>{assert.equal(id,owner);return {enabled:true,checkoutEnabled:true,environment:'test'};},portal:async id=>{assert.equal(id,owner);mutations++;return 'https://billing.stripe.com/p/session/test';}};
 return {handlers:createVendorBillingHandlers({authenticate:async()=>authenticated,origin:()=>config.siteOrigin,runtime:()=>runtime}),mutations:()=>mutations};}
const post=body=>new Request(config.siteOrigin+'/api/vendor-billing/owner',{method:'POST',headers:{origin:config.siteOrigin,'content-type':'application/json'},body:JSON.stringify(body)});
test('unauthenticated owner request cannot reach billing mutations',async()=>{const x=setup(),h=http(x,null);assert.equal((await h.handlers.ownerPOST(post({action:'checkout',plan:'store_web'}))).status,401);assert.equal(x.calls.length,0);});
test('cross-origin owner mutation is rejected before provider work',async()=>{const x=setup(),h=http(x);const r=post({action:'portal'});r.headers.set('origin','https://attacker.invalid');assert.equal((await h.handlers.ownerPOST(r)).status,403);assert.equal(h.mutations(),0);});
for(const extra of ['ownerId','customerId','price','return_url','subscriptionId'])test(`owner cannot inject ${extra}`,async()=>{const x=setup(),h=http(x);assert.equal((await h.handlers.ownerPOST(post({action:'checkout',plan:'store_web',[extra]:'forged'}))).status,400);assert.equal(x.calls.length,0);});
test('owner responses are private and uncached, GET performs no provider mutation',async()=>{const x=setup(),h=http(x);const r=await h.handlers.ownerGET();assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(x.calls.length,0);});
test('oversized body without Content-Length is bounded',async()=>{const x=setup(),h=http(x);const r=new Request(config.siteOrigin,{method:'POST',headers:{origin:config.siteOrigin},body:'x'.repeat(1025)});assert.equal((await h.handlers.ownerPOST(r)).status,413);assert.equal(x.calls.length,0);});
function webhook(x,tamper=false){const envelope={id:'evt_fixture',object:'event',api_version:STRIPE_BILLING_API_VERSION,created:x.now,livemode:false,type:'invoice.paid',data:{object:{object:'invoice',id:'in_fixture',customer:'cus_fixture',parent:{subscription_details:{subscription:'sub_fixture'}}}}};const payload=JSON.stringify(envelope);const signature=x.stripe.webhooks.generateTestHeaderString({payload,secret:config.webhookSecret,timestamp:x.now});return new Request(config.siteOrigin+'/api/vendor-billing/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload+(tamper?' ':'')});}
test('actual SDK signature verification rejects tampering before inbox insertion',async()=>{const x=setup();await x.complete();const h=http(x);assert.equal((await h.handlers.webhook(webhook(x,true))).status,400);assert.equal(x.events.size,0);});
test('signed callback grants only through full provider retrieval and durable commit',async()=>{const x=setup();await x.complete();const h=http(x);assert.equal((await h.handlers.webhook(webhook(x))).status,200);assert.equal(x.events.get('evt_fixture').state,'processed');assert.equal(x.projection().features.store_web,true);});
test('callback returns retryable HTTP status when durable processing is unavailable',async()=>{const x=setup();await x.complete();x.stripe.subscriptions.retrieve=async()=>{throw new Error('offline');};assert.equal((await http(x).handlers.webhook(webhook(x))).status,503);assert.equal(x.events.get('evt_fixture').state,'pending');});
test('portal is scoped to the existing customer, explicit package configuration and return path',async()=>{
 const x=setup();x.account.lease_token='portal-test';let params;
 const settings={active:true,livemode:false,features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:true,default_allowed_updates:['price'],proration_behavior:'always_invoice',products:[{prices:Object.values(catalog),adjustable_quantity:{enabled:false}}]}}};
 const transport=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,httpClient:Stripe.createFetchHttpClient(async url=>{
  const request=new URL(url);assert.equal(request.pathname,'/v1/billing_portal/configurations/bpc_fixture');
  const response=clone(settings);
  if(request.searchParams.get('expand[0]')!=='features.subscription_update.products')delete response.features.subscription_update.products;
  return new Response(JSON.stringify(response),{status:200,headers:{'content-type':'application/json'}});
 })});
 x.stripe.billingPortal.configurations.retrieve=transport.billingPortal.configurations.retrieve.bind(transport.billingPortal.configurations);
 x.stripe.billingPortal.sessions.create=async p=>{params=p;return {customer:p.customer,livemode:false,url:'https://billing.stripe.com/p/session/test'};};
 assert.match(await createVendorBillingPortal(x.stripe,config,'cus_fixture','bpc_fixture'),/^https:\/\/billing\.stripe\.com\//);
 assert.deepEqual(params,{customer:'cus_fixture',configuration:'bpc_fixture',return_url:config.siteOrigin+'/account/store/billing'});
 settings.features.subscription_update.products[0].prices.push('price_foreign');await assert.rejects(createVendorBillingPortal(x.stripe,config,'cus_fixture','bpc_fixture'),/configuration/);
});
