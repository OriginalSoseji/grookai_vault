import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {checkoutFixture} from './vendorCheckoutFixture.mjs';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
export function creationFixture(preparation=null){
 const f=checkoutFixture(),b=f.order;
 b.shippingAmountMinor=0;b.taxAmountMinor=0;b.paymentIntentId=null;
 const iso=n=>new Date(n*1000).toISOString();
 f.preparation=preparation??{order:{id:b.orderId,reservation_id:b.reservationId,buyer_id:b.buyerId,owner_id:b.seller.ownerId,seller:b.seller,
  quantity:b.quantity,unit_amount_minor:b.unitAmountMinor,shipping_amount_minor:0,tax_amount_minor:0,currency:'usd',fulfillment:'pickup',
  quote_reference:'99999999-9999-4999-8999-999999999999',created_at:iso(b.createdAt),revision:0,paid:false,review_reasons:[]},
  attempt:{id:b.attemptId,order_id:b.orderId,stripe_account_id:b.seller.platformAccountId,connected_account_id:b.seller.connectedAccountId,livemode:false,
   creation_started_at:iso(b.creationStartedAt),session_id:null,session_created_at:null,payment_intent_id:null,lease_token:null,lease_fence:0,lease_expires_at:null},stockState:'payment_pending'};
 const p=f.preparation,o=p.order,a=p.attempt;
 Object.assign(b.seller,o.seller);Object.assign(b,{orderId:o.id,reservationId:o.reservation_id,attemptId:a.id,buyerId:o.buyer_id,revision:o.revision,
  createdAt:Math.floor(Date.parse(o.created_at)/1000),creationStartedAt:Math.floor(Date.parse(a.creation_started_at)/1000),
  sessionId:a.session_id??'cs_test_'+o.id.replaceAll('-',''),sessionCreatedAt:Math.floor(Date.parse(a.session_created_at??a.creation_started_at)/1000),
  unitAmountMinor:o.unit_amount_minor,quantity:o.quantity,shippingAmountMinor:o.shipping_amount_minor,taxAmountMinor:o.tax_amount_minor,stockState:p.stockState});
 f.config.scope={accountId:b.seller.platformAccountId,livemode:b.seller.livemode};f.platform.id=b.seller.platformAccountId;f.account.id=b.seller.connectedAccountId;
 const metadata={grookai_order_id:b.orderId,grookai_attempt_id:b.attemptId,grookai_reservation_id:b.reservationId};
 const total=b.unitAmountMinor*b.quantity;
 Object.assign(f.session,{id:b.sessionId,created:b.sessionCreatedAt,client_reference_id:b.orderId,metadata,payment_intent:null,status:'open',payment_status:'unpaid',
  ui_mode:'hosted_page',url:`https://checkout.stripe.com/c/pay/${b.sessionId}#synthetic`,expires_at:b.sessionCreatedAt+86400,
  success_url:`http://127.0.0.1:20040/account/orders/${b.orderId}?checkout=returned`,cancel_url:`http://127.0.0.1:20040/account/orders/${b.orderId}?checkout=returned`,
  automatic_tax:{enabled:false},adaptive_pricing:{enabled:false},allow_promotion_codes:false,invoice_creation:{enabled:false},customer:null,
  customer_creation:'if_required',shipping_address_collection:null,shipping_options:[],amount_subtotal:total,amount_total:total,
  total_details:{amount_discount:0,amount_shipping:0,amount_tax:0}});
 Object.assign(f.lines.data[0],{quantity:b.quantity,amount_subtotal:total,amount_total:total,amount_tax:0});f.lines.data[0].price.unit_amount=b.unitAmountMinor;
 Object.assign(f.intent,{id:'pi_'+o.id.replaceAll('-',''),created:b.sessionCreatedAt,metadata,amount:total,amount_received:total,latest_charge:'ch_'+o.id.replaceAll('-','')});
 Object.assign(f.charge,{id:f.intent.latest_charge,payment_intent:f.intent.id,created:b.sessionCreatedAt,amount:total,amount_captured:total});
 Object.assign(f.account,{details_submitted:true,charges_enabled:true,payouts_enabled:true,capabilities:{card_payments:'active',transfers:'active'},
  controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}},
  requirements:{currently_due:[],past_due:[],pending_verification:[],eventually_due:[],disabled_reason:null}});
 f.repoCalls=[];f.failPost=false;f.created=Boolean(a.session_id);f.onRepo=null;let request=null;
 f.repo={
  async prepare(id,buyer,token){f.repoCalls.push('prepare');assert.equal(id,o.id);if(buyer!==o.buyer_id)throw Error('order_checkout_unavailable');
   if(f.onRepo)await f.onRepo('prepare');
   if(!a.session_id){if(a.lease_token&&a.lease_token!==token&&Date.parse(a.lease_expires_at)>f.now*1000)throw Error('order_claim_busy');
    if(!a.lease_token||Date.parse(a.lease_expires_at)<=f.now*1000){a.lease_token=token;a.lease_fence++;a.lease_expires_at=iso(f.now+120);}}
   return structuredClone(p);},
  async recovery(id,token){f.repoCalls.push('recovery');assert.equal(id,o.id);if(f.onRepo)await f.onRepo('recovery');
   if(!a.session_id){a.lease_token=token;a.lease_fence++;a.lease_expires_at=iso(f.now+120);}return structuredClone(p);},
  async bind(id,token,fence,session,created){f.repoCalls.push('bind');assert.equal(id,o.id);assert.equal(token,a.lease_token);assert.equal(fence,a.lease_fence);
   if(f.onRepo)await f.onRepo('bind');a.session_id=session;a.session_created_at=iso(created);a.lease_token=null;a.lease_expires_at=null;},
  async reconcile(id){f.repoCalls.push('reconcile');assert.equal(id,o.id);if(f.onRepo)await f.onRepo('reconcile');},
 };
 f.stripe=new Stripe(f.config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
  const u=new URL(url),h=new Headers(options.headers);assert.equal(u.origin,'https://api.stripe.com');assert.equal(h.get('stripe-version'),STRIPE_BILLING_API_VERSION);
  const call={method:options.method,path:u.pathname,query:u.search,scope:h.get('stripe-account'),key:h.get('idempotency-key'),body:options.body??null};f.calls.push(call);
  if(f.onCall)await f.onCall(call);
  let body;
  if(call.method==='POST'){
   assert.equal(call.path,'/v1/checkout/sessions','No other provider mutation allowed');assert.equal(call.scope,b.seller.connectedAccountId);
   const next=JSON.stringify({body:call.body,key:call.key});if(request!==null)assert.equal(next,request,'Retry must preserve exact parameters and key');request=next;f.created=true;
   if(f.failPost)return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE AMBIGUOUS RESPONSE'}}),{status:500});body=f.session;
  }else{
   assert.equal(call.method,'GET');
   if(call.path==='/v1/account'){assert.equal(call.scope,null);body=f.platform;}
   else if(call.path===`/v1/accounts/${b.seller.connectedAccountId}`){assert.equal(call.scope,null);body=f.account;}
   else if(call.path==='/v1/balance'){assert.ok(call.scope===null||call.scope===b.seller.connectedAccountId);body=call.scope?f.balance:f.platformBalance;}
   else{assert.equal(call.scope,b.seller.connectedAccountId);
    if(call.path==='/v1/checkout/sessions'){
     assert.equal(u.searchParams.get('limit'),'100');
     assert.equal(Number(u.searchParams.get('created[gte]')),Math.max(0,b.creationStartedAt-5));
     assert.equal(Number(u.searchParams.get('created[lt]')),b.creationStartedAt+23*3600);
     assert.equal(u.searchParams.has('status'),false);
     body=f.discoveryPages?.[u.searchParams.get('starting_after')??'first']??{object:'list',url:'/v1/checkout/sessions',has_more:false,data:[f.session]};
    }
    else if(call.path===`/v1/checkout/sessions/${b.sessionId}`)body=f.session;
    else if(call.path===`/v1/checkout/sessions/${b.sessionId}/line_items`){assert.equal(u.searchParams.get('limit'),'2');body=f.lines;}
    else if(call.path===`/v1/payment_intents/${f.intent.id}`)body=f.intent;
    else if(call.path===`/v1/charges/${f.charge.id}`)body=f.charge;
    else if(call.path==='/v1/disputes'){
     assert.equal(u.searchParams.get('charge'),f.charge.id);assert.equal(u.searchParams.get('limit'),'100');
     body=f.disputes??{object:'list',has_more:false,data:[]};
    }
    else if(call.path==='/v1/refunds'){
     assert.equal(u.searchParams.get('charge'),f.charge.id);assert.equal(u.searchParams.get('limit'),'100');
     body=f.refunds??{object:'list',has_more:false,data:[]};
    }
    else assert.fail('Unexpected scoped provider request');
   }
  }
  if(f.fail===call.path)return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE ERROR'}}),{status:500});
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 })});return f;
}
