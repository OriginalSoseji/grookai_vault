import assert from 'node:assert/strict';
import http from 'node:http';
import {checkoutFixture} from './vendorCheckoutFixture.mjs';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
export function boundRefundProvider(b){
 const f=checkoutFixture();Object.assign(f.order.seller,b.seller);Object.assign(f.order,{...b,seller:f.order.seller});
 f.config.scope={accountId:b.seller.platformAccountId,livemode:b.seller.livemode};
 f.platform.id=b.seller.platformAccountId;f.account.id=b.seller.connectedAccountId;f.now=Math.floor(Date.now()/1000);
 const pi=b.paymentIntentId,ch='ch_'+b.orderId.replaceAll('-',''),subtotal=b.unitAmountMinor*b.quantity,total=subtotal+b.shippingAmountMinor+b.taxAmountMinor;
 const metadata={grookai_order_id:b.orderId,grookai_attempt_id:b.attemptId,grookai_reservation_id:b.reservationId};
 Object.assign(f.session,{id:b.sessionId,created:b.sessionCreatedAt,client_reference_id:b.orderId,metadata,payment_intent:pi,amount_subtotal:subtotal,amount_total:total,
  total_details:{amount_discount:0,amount_shipping:b.shippingAmountMinor,amount_tax:b.taxAmountMinor},expires_at:f.now+1800});
 Object.assign(f.lines.data[0],{quantity:b.quantity,amount_subtotal:subtotal,amount_total:subtotal+b.taxAmountMinor,amount_tax:b.taxAmountMinor});f.lines.data[0].price.unit_amount=b.unitAmountMinor;
 Object.assign(f.intent,{id:pi,created:b.sessionCreatedAt,amount:total,amount_received:total,metadata,latest_charge:ch});
 Object.assign(f.charge,{id:ch,payment_intent:pi,created:b.sessionCreatedAt,amount:total,amount_captured:total});
 return f;
}
export function refundBrowserProvider(registry){
 const calls=[],errors=[],keys=new Map();let lost=false;
 const server=http.createServer(async(req,res)=>{try{
  assert.equal(req.headers['stripe-version'],STRIPE_BILLING_API_VERSION);
  assert.equal(req.headers.authorization,'Bearer sk_test_refundBrowserSyntheticOnly');
  const u=new URL(req.url,'http://127.0.0.1:22845'),scope=req.headers['stripe-account']??null;
  const list=[...registry.values()],sample=list[0];assert.ok(sample);
  let raw='';for await(const chunk of req){raw+=chunk;assert.ok(raw.length<=8192);}
  const call={method:req.method,path:u.pathname,scope,key:req.headers['idempotency-key']??null,body:raw};calls.push(call);
  let body,status=200;
  if(req.method==='POST'){
   assert.equal(u.pathname,'/v1/refunds');const p=new URLSearchParams(raw),f=list.find(x=>x.charge.id===p.get('charge'));assert.ok(f);assert.equal(scope,f.account.id);
   const id=p.get('metadata[grookai_refund_request_id]');assert.match(id,/^[a-f0-9-]{36}$/);assert.equal(call.key,'grookai-refund-v1-'+id);
   assert.equal(p.get('refund_application_fee'),'false');assert.equal(p.get('reverse_transfer'),'false');
   const amount=Number(p.get('amount'));assert.ok(Number.isSafeInteger(amount)&&amount>0);
   const previous=keys.get(call.key);
   if(previous){assert.equal(previous.raw,raw);assert.equal(previous.scope,scope);({body,status}=previous);}
   else {
    assert.ok(amount<=f.charge.amount_captured-f.charge.amount_refunded);
    const r={object:'refund',id:'re_'+id.replaceAll('-',''),charge:f.charge.id,payment_intent:f.intent.id,amount,currency:'usd',created:Math.floor(Date.now()/1000),
     status:'succeeded',balance_transaction:null,failure_balance_transaction:null,failure_reason:null,pending_reason:null,source_transfer_reversal:null,transfer_reversal:null,
     metadata:{grookai_refund_request_id:id}};
    f.refunds.data.push(r);f.charge.amount_refunded+=amount;f.charge.refunded=f.charge.amount_refunded===f.charge.amount_captured;
    if(lost){body={error:{type:'api_error',message:'Synthetic lost provider response'}};status=500;lost=false;}else body=r;
    keys.set(call.key,{raw,scope,body,status});
   }
  } else {
   assert.equal(req.method,'GET');assert.equal(raw,'');
   if(u.pathname==='/v1/account'){assert.equal(scope,null);body=sample.platform;}
   else if(u.pathname==='/v1/balance'){assert.ok(scope===null||list.some(f=>f.account.id===scope));body=sample.balance;}
   else if(u.pathname.startsWith('/v1/accounts/')){assert.equal(scope,null);body=list.find(f=>u.pathname==='/v1/accounts/'+f.account.id)?.account;}
   else {
    const f=list.find(f=>f.account.id===scope&&(u.pathname.includes(f.session.id)||u.pathname.endsWith(f.intent.id)||u.pathname.endsWith(f.charge.id)||u.searchParams.get('charge')===f.charge.id));assert.ok(f);
    const routes={[`/v1/checkout/sessions/${f.session.id}`]:f.session,[`/v1/checkout/sessions/${f.session.id}/line_items`]:f.lines,
     [`/v1/payment_intents/${f.intent.id}`]:f.intent,[`/v1/charges/${f.charge.id}`]:f.charge};
    if(u.pathname==='/v1/disputes'){assert.equal(u.searchParams.get('limit'),'100');body=f.disputes??{object:'list',has_more:false,data:[]};}
    else if(u.pathname==='/v1/refunds'){assert.equal(u.searchParams.get('limit'),'100');body=f.refunds;}else body=routes[u.pathname];
   }
   assert.ok(body,'Unexpected provider read');
  }
  res.writeHead(status,{'content-type':'application/json','request-id':'req_refundBrowserSynthetic'});res.end(JSON.stringify(body));
 }catch(error){errors.push(error.message);res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{type:'api_error',message:'Fixture rejected provider request'}}));}});
 return {server,calls,errors,keys,loseNextResponse(){lost=true;}};
}
