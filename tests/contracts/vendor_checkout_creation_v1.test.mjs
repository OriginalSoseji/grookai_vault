import test from 'node:test';import assert from 'node:assert/strict';
import {creationFixture} from '../helpers/vendorCheckoutCreationFixture.mjs';
import {createVendorCheckoutService} from '../../apps/web/src/lib/payments/vendorCheckoutCreation.ts';
const token='88888888-8888-4888-8888-888888888888';
const service=(f,extra={})=>createVendorCheckoutService({repo:f.repo,stripe:f.stripe,config:f.config,enabled:true,now:()=>f.now,token:()=>token,...extra});
const checkout=f=>service(f).checkout(f.order.orderId,f.order.buyerId);
test('guarded direct checkout uses saved price, explicit capture, durable key, safe redirects and binds before returning link',async()=>{
 const f=creationFixture(),result=await checkout(f),posts=f.calls.filter(c=>c.method==='POST');assert.equal(posts.length,1);
 const body=new URLSearchParams(posts[0].body);assert.equal(posts[0].key,`grookai-order-v1:${f.order.attemptId}`);
 assert.equal(body.get('line_items[0][price_data][unit_amount]'),'2500');assert.equal(body.get('line_items[0][quantity]'),'2');
 assert.equal(body.get('payment_intent_data[capture_method]'),'automatic');assert.equal(body.get('mode'),'payment');assert.equal(body.get('ui_mode'),'hosted_page');
 assert.equal(body.get('payment_intent_data[metadata][grookai_order_id]'),f.order.orderId);
 assert.equal(body.get('adaptive_pricing[enabled]'),'false');assert.equal(body.get('automatic_tax[enabled]'),'false');
 assert.equal(body.get('after_expiration[recovery][enabled]'),'false');assert.equal(body.get('payment_method_types[0]'),'card');
 for(const key of ['customer','expires_at','payment_intent_data[application_fee_amount]','payment_intent_data[transfer_data][destination]'])assert.equal(body.has(key),false);
 assert.equal(f.repoCalls.filter(c=>c==='bind').length,1);assert.equal(result.url,f.session.url);assert.equal(f.created,true);
 assert.ok(f.repoCalls.indexOf('bind')<f.repoCalls.indexOf('reconcile'));
});
test('default disabled performs no storage or provider work',async()=>{const f=creationFixture();await assert.rejects(service(f,{enabled:undefined}).checkout(f.order.orderId,f.order.buyerId),/order_checkout_disabled/);assert.equal(f.calls.length,0);assert.equal(f.repoCalls.length,0);});
test('resuming bound checkout does GET verification and fresh authorization without a second POST',async()=>{const f=creationFixture();await checkout(f);f.calls.length=0;await checkout(f);assert.ok(f.calls.every(c=>c.method==='GET'));});
test('ambiguous creation retries byte-identical request and key with original attempt',async()=>{
 const f=creationFixture();f.failPost=true;await assert.rejects(checkout(f),/order_checkout_provider_unavailable/);assert.equal(f.preparation.attempt.session_id,null);
 f.failPost=false;f.now+=121;await checkout(f);assert.equal(f.calls.filter(c=>c.method==='POST').length,2);assert.equal(f.repoCalls.filter(c=>c==='bind').length,1);
});
test('binding failure retains provider attempt and supports a verified retry',async()=>{
 const f=creationFixture();f.onRepo=kind=>{if(kind==='bind')throw Error('order_claim_stale');};await assert.rejects(checkout(f),/order_claim_stale/);
 assert.equal(f.created,true);f.onRepo=null;f.now+=121;await checkout(f);assert.equal(f.calls.filter(c=>c.method==='POST').length,2);
});
for(const [label,mutate] of [
 ['foreign buyer',f=>f.preparation.order.buyer_id='77777777-7777-4777-8777-777777777778'],['shipping',f=>f.preparation.order.fulfillment='shipping'],
 ['tax',f=>f.preparation.order.tax_amount_minor=1],['shipping charge',f=>f.preparation.order.shipping_amount_minor=1],['paid',f=>f.preparation.order.paid=true],
 ['review',f=>f.preparation.order.review_reasons=['review']],['released',f=>f.preparation.stockState='released'],
 ['wrong seller scope',f=>f.preparation.attempt.connected_account_id='acct_foreign'],['wrong mode',f=>f.preparation.attempt.livemode=true],
 ['wrong attempt order',f=>f.preparation.attempt.order_id=token],['unready payouts',f=>f.account.payouts_enabled=false],
 ['unready card capability',f=>f.account.capabilities.card_payments='pending'],['unverified identity',f=>f.account.details_submitted=false],
 ['seller requirements',f=>f.account.requirements.currently_due=['business_profile.url']],['actual platform mode',f=>f.platformBalance.livemode=true],
 ['actual connected mode',f=>f.balance.livemode=true],['actual platform ID',f=>f.platform.id='acct_other'],['actual connected ID',f=>f.account.id='acct_other'],
 ['controller',f=>f.account.controller.fees.payer='application'],['over-age attempt',f=>f.now+=23*3600],
])test(`${label} prevents provider creation`,async()=>{const f=creationFixture();mutate(f);await assert.rejects(checkout(f));assert.equal(f.calls.filter(c=>c.method==='POST').length,0);});
for(const [label,mutate] of [
 ['unsafe host',f=>f.session.url='https://evil.invalid/c/pay/'+f.session.id],['foreign session path',f=>f.session.url='https://checkout.stripe.com/c/pay/cs_test_other'],
 ['redirect',f=>f.session.success_url='https://evil.invalid'],['metadata',f=>f.session.metadata.grookai_order_id=token],['wrong session mode',f=>f.session.livemode=true],
 ['wrong amount',f=>f.session.amount_total++],['adaptive pricing',f=>f.session.adaptive_pricing.enabled=true],['automatic tax',f=>f.session.automatic_tax.enabled=true],
 ['discounts',f=>f.session.allow_promotion_codes=true],['invoicing',f=>f.session.invoice_creation.enabled=true],['customer',f=>f.session.customer='cus_other'],
 ['shipping',f=>f.session.shipping_options=[{}]],['expired link',f=>f.session.expires_at=f.now],
])test(`${label} never delivers checkout URL`,async()=>{const f=creationFixture();mutate(f);await assert.rejects(checkout(f));});
for(const at of [2,3,4])test(`revoked database authorization at read ${at} never delivers URL`,async()=>{
 const f=creationFixture();let count=0;f.onRepo=k=>{if(k==='prepare'&&++count===at)throw Error('order_checkout_unavailable');};await assert.rejects(checkout(f),/order_checkout_unavailable/);
 if(at===2)assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
});
test('readiness timeout cannot create a session',async()=>{const f=creationFixture();f.onCall=c=>{if(c.path==='/v1/balance')f.now+=60;};await assert.rejects(checkout(f));assert.equal(f.calls.filter(c=>c.method==='POST').length,0);});
test('late GET-only recovery binds original session and reconciles without returning a payment link',async()=>{
 const f=creationFixture();f.now+=24*3600;f.account.charges_enabled=false;f.account.payouts_enabled=false;
 assert.deepEqual(await service(f,{enabled:false}).recover(f.order.orderId,f.session.id),{orderId:f.order.orderId,state:'reconciled'});
 assert.ok(f.calls.every(c=>c.method==='GET'));assert.equal(f.preparation.attempt.session_id,f.session.id);
});
test('recovery rejects another order, account, or attempt metadata before binding',async()=>{
 for(const key of ['grookai_order_id','grookai_attempt_id','grookai_reservation_id']){const f=creationFixture();f.session.metadata[key]=token;
  await assert.rejects(service(f).recover(f.order.orderId,f.session.id));assert.equal(f.repoCalls.includes('bind'),false);}
});
test('terminal session goes through ledger reconciliation without URL',async()=>{
 const f=creationFixture();f.session.status='complete';f.session.payment_status='paid';f.session.payment_intent=f.intent.id;
 assert.deepEqual(await checkout(f),{orderId:f.order.orderId,state:'reconciled'});assert.ok(f.repoCalls.includes('reconcile'));
});
test('provider readiness revoked after creation blocks link delivery',async()=>{
 const f=creationFixture();f.onRepo=kind=>{if(kind==='reconcile')f.account.charges_enabled=false;};
 await assert.rejects(checkout(f),/order_seller_not_ready/);assert.equal(f.preparation.attempt.session_id,f.session.id);
});
test('last session read cannot silently alter the quoted amount',async()=>{
 const f=creationFixture();let prepared=0;f.onRepo=kind=>{if(kind==='prepare'&&++prepared===3)f.session.amount_total++;};
 await assert.rejects(checkout(f));assert.equal(f.preparation.attempt.session_id,f.session.id);
});
