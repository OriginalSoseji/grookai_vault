import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
export function checkoutFixture({live=false}={}){
 const now=1800000000,config={secretKey:['sk',live?'live':'test','syntheticOnly'].join('_'),webhookSecret:['whsec','checkoutSyntheticNeverRealSecret'].join('_'),scope:{accountId:'acct_checkoutPlatform',livemode:live}};
 const seller={id:'22222222-2222-4222-8222-222222222222',ownerId:'11111111-1111-4111-8111-111111111111',storeId:'33333333-3333-4333-8333-333333333333',platformAccountId:config.scope.accountId,connectedAccountId:'acct_checkoutSeller',livemode:live,
  controller:{feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'}};
 const order={orderId:'44444444-4444-4444-8444-444444444444',reservationId:'55555555-5555-4555-8555-555555555555',attemptId:'66666666-6666-4666-8666-666666666666',buyerId:'77777777-7777-4777-8777-777777777777',seller,revision:1,
  createdAt:now-120,creationStartedAt:now-110,sessionId:`cs_${live?'live':'test'}_order`,sessionCreatedAt:now-100,paymentIntentId:'pi_order',currency:'usd',unitAmountMinor:2500,quantity:2,shippingAmountMinor:500,taxAmountMinor:400,stockState:'payment_pending'};
 const metadata={grookai_order_id:order.orderId,grookai_attempt_id:order.attemptId,grookai_reservation_id:order.reservationId};
 const f={now,config,order,calls:[],fail:null,onCall:null,refunds:{object:'list',has_more:false,data:[]},refundPages:null,disputes:{object:"list",has_more:false,data:[]},disputePages:null,
  platform:{object:'account',id:config.scope.accountId},platformBalance:{object:'balance',livemode:live},
  account:{object:'account',id:seller.connectedAccountId,charges_enabled:false,payouts_enabled:false},balance:{object:'balance',livemode:live},
  session:{object:'checkout.session',id:order.sessionId,livemode:live,created:order.sessionCreatedAt,mode:'payment',currency:'usd',client_reference_id:order.orderId,metadata:{...metadata},subscription:null,setup_intent:null,payment_link:null,recovered_from:null,after_expiration:null,
   status:'complete',payment_status:'paid',payment_intent:'pi_order',payment_method_types:['card'],amount_subtotal:5000,amount_total:5900,total_details:{amount_discount:0,amount_shipping:500,amount_tax:400},expires_at:now+1800,
   customer_details:{email:'PRIVATE BUYER',address:{line1:'PRIVATE ADDRESS'}}},
  lines:{object:'list',has_more:false,data:[{object:'item',id:'li_order',quantity:2,currency:'usd',amount_subtotal:5000,amount_total:5400,amount_tax:400,amount_discount:0,
   price:{object:'price',id:'price_order',product:'prod_order',currency:'usd',unit_amount:2500,type:'one_time',recurring:null,billing_scheme:'per_unit'}}]},
  intent:{object:'payment_intent',id:'pi_order',livemode:live,created:now-95,currency:'usd',amount:5900,amount_received:5900,amount_capturable:0,status:'succeeded',capture_method:'automatic',payment_method_types:['card'],metadata:{...metadata},canceled_at:null,latest_charge:'ch_order',transfer_data:null,on_behalf_of:null,application_fee_amount:null,client_secret:'PRIVATE CLIENT SECRET'},
  charge:{object:'charge',id:'ch_order',payment_intent:'pi_order',livemode:live,created:now-90,currency:'usd',amount:5900,amount_captured:5900,amount_refunded:0,refunded:false,paid:true,captured:true,disputed:false,status:'succeeded',on_behalf_of:null,transfer_data:null,application_fee_amount:null,receipt_email:'PRIVATE RECEIPT',billing_details:{name:'PRIVATE NAME'}}};
 f.stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
  const u=new URL(url),headers=new Headers(options.headers);assert.equal(u.origin,'https://api.stripe.com');assert.equal(options.method,'GET','Evidence cannot mutate Stripe');assert.equal(headers.get('stripe-version'),STRIPE_BILLING_API_VERSION);
  const call={path:u.pathname,scope:headers.get('stripe-account'),query:Object.fromEntries(u.searchParams)};f.calls.push(call);if(f.onCall)await f.onCall(call);
  if(f.fail===call.path)return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE PROVIDER ERROR'}}),{status:500});
  let body;
  if(call.path==='/v1/account'){assert.equal(call.scope,null);body=f.platform;}
  else if(call.path===`/v1/accounts/${seller.connectedAccountId}`){assert.equal(call.scope,null);body=f.account;}
  else if(call.path==='/v1/balance'){assert.ok(call.scope===null||call.scope===seller.connectedAccountId);body=call.scope?f.balance:f.platformBalance;}
  else{
   assert.equal(call.scope,seller.connectedAccountId);
   if(call.path===`/v1/checkout/sessions/${order.sessionId}`)body=f.session;
   else if(call.path===`/v1/checkout/sessions/${order.sessionId}/line_items`){assert.equal(call.query.limit,'2');body=f.lines;}
   else if(call.path===`/v1/payment_intents/${f.intent.id}`)body=f.intent;
   else if(call.path===`/v1/charges/${f.charge.id}`)body=f.charge;
   else if(call.path==='/v1/disputes'){
    assert.equal(call.query.charge,f.charge.id);assert.equal(call.query.limit,'100');
    body=f.disputePages?f.disputePages[call.query.starting_after??'first']:f.disputes;assert.ok(body,'Unexpected dispute cursor');
   }
   else if(call.path==='/v1/refunds'){
    assert.equal(call.query.charge,f.charge.id);assert.equal(call.query.limit,'100');
    body=f.refundPages?f.refundPages[call.query.starting_after??'first']:f.refunds;
    assert.ok(body,'Unexpected refund pagination cursor');
   }
   else assert.fail('Unexpected provider request');
  }
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 })});
 f.expire=(withIntent=false)=>{f.session.status='expired';f.session.payment_status='unpaid';f.session.payment_intent=withIntent?'pi_order':null;f.order.paymentIntentId=withIntent?'pi_order':null;
  f.intent.status='canceled';f.intent.amount_received=0;f.intent.amount_capturable=0;f.intent.canceled_at=now-10;f.intent.latest_charge=null;};
 f.pending=(status='processing')=>{f.session.payment_status='unpaid';f.intent.status=status;f.intent.amount_received=0;f.intent.amount_capturable=0;f.intent.latest_charge=null;};
 f.event=(type='checkout.session.completed')=>({object:'event',id:'evt_checkout',api_version:STRIPE_BILLING_API_VERSION,livemode:live,account:seller.connectedAccountId,created:now-1,type,
  data:{object:structuredClone(type.startsWith('payment_intent.')?f.intent:f.session)}});
 f.sign=event=>{const payload=JSON.stringify(event);return {payload,signature:f.stripe.webhooks.generateTestHeaderString({payload,secret:config.webhookSecret,timestamp:now})};};
 return f;
}
