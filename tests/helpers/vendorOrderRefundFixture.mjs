import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {checkoutFixture} from './vendorCheckoutFixture.mjs';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const iso=n=>new Date(n*1000).toISOString();
// Service orchestration fixture only. SQL authorization and contention need the
// dedicated real-database runner; this adapter cannot prove those boundaries.
export function refundFixture(){
 const f=checkoutFixture();f.order.stockState='consumed';f.requests=[];f.rpcCalls=[];
 f.command={orderId:f.order.orderId,requestId:'88888888-8888-4888-8888-888888888888',amountMinor:1000,reason:'requested_by_customer'};
 f.postMode='success';f.refundStatus='succeeded';f.onRpc=null;f.onPost=null;
 f.addRefund=(requestId=f.command.requestId,amount=f.command.amountMinor)=>{
  const r={object:'refund',id:`re_${f.refunds.data.length+1}`,charge:f.charge.id,payment_intent:f.intent.id,amount,currency:'usd',created:f.now,
   status:f.refundStatus,balance_transaction:null,failure_balance_transaction:null,failure_reason:null,pending_reason:null,
   source_transfer_reversal:null,transfer_reversal:null,metadata:{grookai_refund_request_id:requestId}};
  f.refunds.data.push(r);f.charge.amount_refunded=f.refunds.data.filter(r=>r.status==='succeeded').reduce((n,r)=>n+r.amount,0);
  f.charge.refunded=f.charge.amount_refunded===f.charge.amount;return r;
 };
 f.admin={async rpc(name,p){
  f.rpcCalls.push({name,params:structuredClone(p)});if(f.onRpc){const result=await f.onRpc(name,p);if(result)return result;}
  assert.equal(p.p_order_id,f.order.orderId);let result;
  const fail=message=>({data:null,error:{message}});
  const observe=()=>{for(const r of f.requests.filter(r=>r.refund_id)){
   const row=p.p_inventory.rows.find(x=>x.id===r.refund_id);assert.ok(row);r.status=row.status;
  }};
  if(name==='vendor_order_refund_context_v1')result=p.p_actor_id===f.order.seller.ownerId||p.p_actor_id===null?{binding:f.order,paid:true,requests:f.requests}:null;
  else if(name==='vendor_order_refund_observe_v1'){observe();result=null;}
  else if(name==='vendor_order_refund_prepare_v1'){
   let r=f.requests.find(x=>x.id===p.p_request_id);
   if(r&&f.now>=Date.parse(r.creation_started_at)/1000+23*3600)return fail('order_refund_recovery_required');
   if(r&&Date.parse(r.lease_expires_at)/1000>f.now)return fail('order_refund_busy');
   if(!r&&f.requests.some(x=>!x.refund_id))return fail('order_refund_unresolved_request');
   if(!r&&p.p_amount>5900-p.p_inventory.succeededMinor-p.p_inventory.pendingMinor)return fail('order_refund_amount_unavailable');
   if(!r){r={id:p.p_request_id,request_version:'v1',order_id:f.order.orderId,actor_id:p.p_actor_id,amount_minor:p.p_amount,reason:p.p_reason,
    charge_id:f.charge.id,payment_intent_id:f.intent.id,platform_account_id:f.config.scope.accountId,connected_account_id:f.order.seller.connectedAccountId,
    livemode:false,creation_started_at:iso(f.now+0.321),lease_fence:0,refund_id:null,status:'unbound'};f.requests.push(r);}
   Object.assign(r,{lease_token:p.p_token,lease_fence:r.lease_fence+1,lease_expires_at:iso(f.now+120)});result=r;
  }else if(name==='vendor_order_refund_recovery_v1'){
   const r=f.requests.find(x=>x.id===p.p_request_id);assert.ok(r);
   if(Date.parse(r.lease_expires_at)/1000>f.now)return fail('order_refund_busy');
   Object.assign(r,{lease_token:p.p_token,lease_fence:r.lease_fence+1,lease_expires_at:iso(f.now+120)});result=r;
  }else if(name==='vendor_order_refund_bind_v1'){
   const r=f.requests.find(x=>x.id===p.p_request_id);assert.ok(r);assert.equal(p.p_token,r.lease_token);assert.equal(p.p_fence,r.lease_fence);
   if(Date.parse(r.lease_expires_at)/1000<=f.now)return fail('order_refund_lease_lost');
   const row=p.p_inventory.rows.find(x=>x.id===p.p_refund_id);assert.ok(row);assert.equal(row.requestId,r.id);assert.equal(row.amountMinor,r.amount_minor);
   r.refund_id=row.id;r.status=row.status;observe();result=r;
  }else assert.fail(`Unexpected RPC ${name}`);
  return {data:structuredClone(result),error:null};
 }};
 f.stripe=new Stripe(f.config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
  const u=new URL(url),h=new Headers(options.headers);assert.equal(u.origin,'https://api.stripe.com');assert.equal(h.get('stripe-version'),STRIPE_BILLING_API_VERSION);
  const c={method:options.method,path:u.pathname,scope:h.get('stripe-account'),body:options.body??null,key:h.get('idempotency-key')};f.calls.push(c);
  if(f.onCall)await f.onCall(c);let body;
  if(c.method==='POST'){
   assert.equal(c.path,'/v1/refunds');assert.equal(c.scope,f.order.seller.connectedAccountId);
   const p=new URLSearchParams(c.body);assert.equal(p.get('charge'),f.charge.id);
   if(f.postMode==='absent')return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE ERROR'}}),{status:500});
   body=f.addRefund(p.get('metadata[grookai_refund_request_id]'),Number(p.get('amount')));if(f.onPost)await f.onPost(body);
   if(f.postMode==='lost')return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE ERROR'}}),{status:500});
  }else{
   assert.equal(c.method,'GET');
   if(c.path==='/v1/account'){assert.equal(c.scope,null);body=f.platform;}
   else if(c.path===`/v1/accounts/${f.account.id}`){assert.equal(c.scope,null);body=f.account;}
   else if(c.path==='/v1/balance'){assert.ok(c.scope===null||c.scope===f.account.id);body=c.scope?f.balance:f.platformBalance;}
   else {assert.equal(c.scope,f.account.id);
    const routes={[`/v1/checkout/sessions/${f.order.sessionId}`]:f.session,[`/v1/checkout/sessions/${f.order.sessionId}/line_items`]:f.lines,
     [`/v1/payment_intents/${f.intent.id}`]:f.intent,[`/v1/charges/${f.charge.id}`]:f.charge};
    if(c.path==='/v1/disputes'){assert.equal(u.searchParams.get('charge'),f.charge.id);assert.equal(u.searchParams.get('limit'),'100');body=f.disputes;}
    else if(c.path==='/v1/refunds'){assert.equal(u.searchParams.get('charge'),f.charge.id);assert.equal(u.searchParams.get('limit'),'100');body=f.refunds;}
    else {body=routes[c.path];assert.ok(body,'Unexpected provider read');}
   }
  }
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 })});return f;
}
