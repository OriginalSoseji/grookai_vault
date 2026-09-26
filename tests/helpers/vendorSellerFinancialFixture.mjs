import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
export const paths={paymentIntents:'/v1/payment_intents',refunds:'/v1/refunds',disputes:'/v1/disputes',payouts:'/v1/payouts',checkouts:'/v1/checkout/sessions',charges:'/v1/charges'};
export function financialFixture(now=1800000000){
 const config={secretKey:['sk','test','syntheticOnly'].join('_'),webhookSecret:['whsec','syntheticOnlyNeverRealSecret'].join('_'),scope:{accountId:'acct_reviewPlatform',livemode:false}};
 const binding={id:'22222222-2222-4222-8222-222222222222',ownerId:'11111111-1111-4111-8111-111111111111',storeId:'33333333-3333-4333-8333-333333333333',
  platformAccountId:config.scope.accountId,connectedAccountId:'acct_reviewSeller',livemode:false,controller:{feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'}};
 const f={now,config,binding,calls:[],platform:{object:'account',id:config.scope.accountId},platformBalance:{object:'balance',livemode:false},
  account:{object:'account',id:binding.connectedAccountId,controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}}},
  balance:{object:'balance',livemode:false,available:[{currency:'usd',amount:0,source_types:{card:0}}],pending:[]},balances:null,pages:{},fail:null,onCall:null};
 for(const k of Object.keys(paths))f.pages[k]=[{object:'list',data:[],has_more:false}];
 let reads=0;const pageCounts={};
 f.stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
  const u=new URL(url),headers=new Headers(options.headers);assert.equal(u.origin,'https://api.stripe.com');assert.equal(options.method,'GET','Financial review may never mutate Stripe');
  assert.equal(headers.get('stripe-version'),STRIPE_BILLING_API_VERSION);const call={path:u.pathname,scope:headers.get('stripe-account'),query:Object.fromEntries(u.searchParams)};f.calls.push(call);
  if(f.onCall)await f.onCall(call);
  if(f.fail===u.pathname)return new Response(JSON.stringify({error:{type:'api_error',message:'PRIVATE PROVIDER DETAIL'}}),{status:500});
  let body;if(u.pathname==='/v1/account'){assert.equal(call.scope,null);body=f.platform;}
  else if(u.pathname===`/v1/accounts/${binding.connectedAccountId}`){assert.equal(call.scope,null);body=f.account;}
  else if(u.pathname==='/v1/balance'){assert.ok(call.scope===null||call.scope===binding.connectedAccountId);body=call.scope?(f.balances?.[reads++]??f.balance):f.platformBalance;}
  else{
   const kind=Object.keys(paths).find(k=>paths[k]===u.pathname);assert.ok(kind);assert.equal(call.scope,binding.connectedAccountId);assert.equal(u.searchParams.get('limit'),'100');
   const cursor=u.searchParams.get('starting_after');let index=0;
   if(cursor){index=f.pages[kind].findIndex(p=>p.data.at(-1)?.id===cursor)+1;assert.ok(index>0,'Unknown cursor');}
   if(!cursor)pageCounts[kind]=0;else pageCounts[kind]++;
   body=f.pages[kind][index];assert.ok(body,'Unexpected extra page');
  }
  return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
 })});
 f.row=(kind,change={})=>({id:({paymentIntents:'pi',refunds:'re',disputes:'du',payouts:'po',checkouts:'cs',charges:'ch'})[kind]+'_fixture',
  object:({paymentIntents:'payment_intent',refunds:'refund',disputes:'dispute',payouts:'payout',checkouts:'checkout.session',charges:'charge'})[kind],
  created:now,livemode:false,status:({paymentIntents:'succeeded',refunds:'succeeded',disputes:'won',payouts:'paid',checkouts:'complete',charges:'succeeded'})[kind],
  amount:100,amount_received:100,amount_capturable:0,amount_total:100,currency:'usd',charge:'ch_charge',payment_intent:'pi_payment',paid:true,captured:true,disputed:false,amount_refunded:0,mode:'payment',payment_status:'paid',...change});
 return f;
}
