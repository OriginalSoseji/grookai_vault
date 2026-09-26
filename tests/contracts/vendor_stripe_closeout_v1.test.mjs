import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {inspectVendorCloseout,closeVendorBillingAtProvider,readVendorCustomerRecovery} from '../../apps/web/src/lib/billing/vendorStripeCloseout.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const attemptId='a7000000-0000-4000-8000-000000000001',closeoutId='b7000000-0000-4000-8000-000000000001';
function setup(){
 const now=Math.floor(Date.now()/1000),calls=[];
 const config={scope:{accountId:'acct_fixture',livemode:false},catalog:{store_app:'price_app',store_web:'price_web'}};
 const customer={id:'cus_fixture',object:'customer',livemode:false,created:now-60,balance:0,invoice_credit_balance:{},cash_balance:null,metadata:{grookai_billing_version:'vendor-billing-v1',grookai_billing_customer_attempt:attemptId}};
 const sub={id:'sub_fixture',customer:'cus_fixture',livemode:false,status:'active'};
 const session={id:'cs_test_fixture',object:'checkout.session',mode:'subscription',customer:'cus_fixture',livemode:false,status:'open',subscription:null,client_reference_id:attemptId,recovered_from:null,url:'https://checkout.stripe.com/c/pay/test_fixture'};
 const price={id:'price_web',livemode:false,currency:'usd',unit_amount:5000,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
 const binding={closeoutId,customerId:'cus_fixture',subscriptionId:'sub_fixture',pendingCheckout:null,requestedAt:now,paidThrough:null};
 const subscriptions={data:[sub],has_more:false},open=[],draft=[],items=[];let more=false,expireRace=false,lostCancelResponse=false,leaseValid=true;
 const stripe=new Stripe(['sk','test','fixtureOnly'].join('_'),{apiVersion:STRIPE_BILLING_API_VERSION,httpClient:Stripe.createFetchHttpClient(async()=>{throw new Error('NETWORK_FORBIDDEN');})});
 const read=(name,fn)=>async(...args)=>{calls.push({name,args});return structuredClone(await fn(...args));};
 stripe.accounts.retrieve=read('account',()=>({id:config.scope.accountId}));
 stripe.customers.retrieve=read('customer',(id,params)=>{assert.equal(id,customer.id);if(params)assert.deepEqual(params,{expand:['cash_balance','invoice_credit_balance']});return customer;});
 stripe.subscriptions.list=read('subscriptions',params=>{assert.deepEqual(params,{customer:'cus_fixture',status:'all',limit:100});return subscriptions;});
 stripe.checkout.sessions.list=read('checkouts',params=>{assert.deepEqual(params,{customer:'cus_fixture',status:'open',limit:100});return {data:binding.pendingCheckout&&session.status==='open'?[session]:[],has_more:more};});
 stripe.checkout.sessions.retrieve=read('session',()=>session);
 stripe.checkout.sessions.listLineItems=read('lines',()=>({data:[{quantity:1,price}],has_more:false}));
 stripe.invoices.list=read('invoices',params=>({data:params.status==='open'?open:draft,has_more:false}));
 stripe.invoiceItems.list=read('items',params=>{assert.deepEqual(params,{customer:'cus_fixture',pending:true,limit:100});return {data:items,has_more:false};});
 stripe.checkout.sessions.expire=read('expire',()=>{assert.ok(leaseValid);if(expireRace){session.status='complete';session.subscription='sub_race';session.url=null;subscriptions.data.push({id:'sub_race',customer:'cus_fixture',livemode:false,status:'active'});throw new Error('already complete');}session.status='expired';session.url=null;return session;});
 stripe.subscriptions.cancel=read('cancel',(id,params)=>{assert.ok(leaseValid);assert.deepEqual(params,{invoice_now:false,prorate:false});const target=subscriptions.data.find(s=>s.id===id);assert.ok(target);target.status='canceled';if(lostCancelResponse){lostCancelResponse=false;throw new Error('response lost');}return target;});
 const assertLease=async()=>{calls.push({name:'lease'});if(!leaseValid)throw new Error('lease lost');};
 return {now,calls,config,stripe,customer,sub,session,binding,subscriptions,open,draft,items,assertLease,
  pending(){binding.pendingCheckout={attemptId,customerId:'cus_fixture',sessionId:'cs_test_fixture',plan:'store_web'};},
  race(){expireRace=true;},loseCancel(){lostCancelResponse=true;},loseLease(){leaseValid=false;},truncateCheckouts(){more=true;},
  close:()=>closeVendorBillingAtProvider(stripe,config,binding,assertLease),inspect:()=>inspectVendorCloseout(stripe,config,binding)};
}
test('closeout inspection is read-only and includes multi-currency/cash balance evidence',async()=>{const x=setup();const r=await x.inspect();assert.equal(r.providerClosed,false);assert.deepEqual(r.reviews,[]);assert.equal(x.calls.some(c=>['expire','cancel'].includes(c.name)),false);});
test('only the durable bound subscription is canceled; provider/customer records remain',async()=>{const x=setup();const r=await x.close();assert.equal(r.providerClosed,true);assert.deepEqual(r.reviewReasons,[]);assert.equal(x.calls.filter(c=>c.name==='cancel').length,1);assert.deepEqual(r.subscriptionIds,['sub_fixture']);const i=x.calls.findIndex(c=>c.name==='cancel');assert.equal(x.calls[i-1].name,'lease');assert.equal(x.calls.at(-1).name,'lease');});
test('cancellation and rerun do not produce another invoice, refund or cancellation',async()=>{const x=setup();await x.close();await x.close();assert.equal(x.calls.filter(c=>c.name==='cancel').length,1);});
test('lost cancellation response recovers from actual terminal state on retry',async()=>{const x=setup();x.loseCancel();await assert.rejects(x.close());await x.close();assert.equal(x.calls.filter(c=>c.name==='cancel').length,1);});
test('pending checkout is expired with a stable request key before cancellation',async()=>{const x=setup();x.pending();const r=await x.close();assert.equal(r.checkoutId,'cs_test_fixture');const e=x.calls.find(c=>c.name==='expire');assert.equal(e.args[2].idempotencyKey,`grookai-vendor-closeout:${closeoutId}:checkout`);assert.ok(x.calls.indexOf(e)<x.calls.findIndex(c=>c.name==='cancel'));});
test('checkout completion racing expiry is independently verified before canceling its subscription',async()=>{const x=setup();x.pending();x.race();const r=await x.close();assert.deepEqual(r.subscriptionIds,['sub_fixture','sub_race']);assert.equal(x.calls.filter(c=>c.name==='cancel').length,2);});
test('lost lease prevents all provider work at entry',async()=>{const x=setup();x.loseLease();await assert.rejects(x.close(),/lease lost/);assert.deepEqual(x.calls.map(c=>c.name),['lease']);});
test('lease loss after inspection prevents mutation',async()=>{const x=setup();let n=0;await assert.rejects(closeVendorBillingAtProvider(x.stripe,x.config,x.binding,async()=>{if(++n===2)throw new Error('lost');}));assert.equal(x.calls.some(c=>c.name==='cancel'),false);});
for(const [label,change] of [
 ['foreign customer',x=>{x.customer.livemode=true;}],
 ['unknown active subscription',x=>{x.subscriptions.data.push({...x.sub,id:'sub_unknown'});} ],
 ['foreign subscription customer',x=>{x.sub.customer='cus_other';}],
 ['unbounded subscriptions',x=>{x.subscriptions.has_more=true;}],
 ['unbounded checkout inventory',x=>x.truncateCheckouts()],
 ['missing bound subscription',x=>{x.subscriptions.data=[];}],
 ['unknown subscription status',x=>{x.sub.status='future_unknown';}],
])test(`${label} blocks mutation`,async()=>{const x=setup();change(x);await assert.rejects(x.close());assert.equal(x.calls.some(c=>['cancel','expire'].includes(c.name)),false);});
test('unknown open checkout blocks mutation even with no active subscription',async()=>{const x=setup();x.stripe.checkout.sessions.list=async()=>({has_more:false,data:[{...x.session,id:'cs_test_foreign'}]});await assert.rejects(x.close(),e=>e.code==='billing_closeout_unknown_checkout');assert.equal(x.calls.some(c=>c.name==='cancel'),false);});
test('settled unrelated historical subscriptions do not cause cancellation',async()=>{const x=setup();x.subscriptions.data.push({...x.sub,id:'sub_old',status:'canceled'});await x.close();assert.equal(x.calls.filter(c=>c.name==='cancel').length,1);});
test('remaining paid time and unresolved balances stop short of removal approval',async()=>{const x=setup();x.binding.paidThrough=x.now+3600;x.customer.invoice_credit_balance={usd:100};x.open.push({id:'in_open',customer:'cus_fixture',livemode:false,status:'open'});x.draft.push({id:'in_draft',customer:'cus_fixture',livemode:false,status:'draft'});x.items.push({id:'ii_fixture',customer:'cus_fixture',livemode:false});const r=await x.close();assert.equal(r.providerClosed,true);assert.deepEqual(r.reviewReasons,['open_invoices','draft_invoices','pending_invoice_items','customer_balance','remaining_paid_period']);});
test('missing expanded balance evidence is an explicit review reason',async()=>{const x=setup();delete x.customer.cash_balance;const r=await x.close();assert.ok(r.reviewReasons.includes('balance_evidence_missing'));});
test('foreign expanded cash balance fails identity validation',async()=>{const x=setup();x.customer.cash_balance={object:'cash_balance',customer:'cus_foreign',livemode:false,available:{usd:1}};await assert.rejects(x.close());assert.equal(x.calls.some(c=>c.name==='cancel'),false);});
test('customer recovery matches a retrieved opaque creation attempt, even after key retention',async()=>{const x=setup();const r=await readVendorCustomerRecovery(x.stripe,x.config,{customerId:x.customer.id,attemptId,attemptCreatedAt:x.now-120},x.now+86400);assert.deepEqual(r,{customerId:'cus_fixture',attemptId});assert.deepEqual(x.calls.map(c=>c.name),['account','customer']);});
for(const [label,change] of [
 ['missing marker',x=>{delete x.customer.metadata.grookai_billing_customer_attempt;}],
 ['wrong marker',x=>{x.customer.metadata.grookai_billing_customer_attempt='other';}],
 ['different mode',x=>{x.customer.livemode=true;}],
 ['creation outside original attempt window',x=>{x.customer.created=x.now+86400;}],
 ['deleted customer',x=>{x.customer.deleted=true;}],
])test(`customer recovery rejects ${label}`,async()=>{const x=setup();change(x);await assert.rejects(readVendorCustomerRecovery(x.stripe,x.config,{customerId:'cus_fixture',attemptId,attemptCreatedAt:x.now-120},x.now+172800));});
