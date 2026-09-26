import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCheckoutSignal} from '../../apps/web/src/lib/payments/vendorCheckoutSignals.ts';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
function run(f,event=f.event()){const s=f.sign(event);return verifyCheckoutSignal(f.stripe,f.config,s.payload,s.signature,f.now*1000);}
for(const type of ['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed',
 'payment_intent.succeeded','payment_intent.canceled','payment_intent.processing','payment_intent.payment_failed','payment_intent.amount_capturable_updated'])
 test(`${type} is only a verified resource lookup signal`,()=>{const f=checkoutFixture(),r=run(f,f.event(type));assert.equal(r.eventId,'evt_checkout');assert.equal(r.resourceId,type.startsWith('checkout')?f.order.sessionId:'pi_order');assert.deepEqual(Object.keys(r).sort(),['connectedAccountId','createdAt','eventId','kind','livemode','resourceId']);assert.equal(f.calls.length,0);});
test('metadata cannot route attribution or confirm payment',()=>{const f=checkoutFixture(),e=f.event();e.data.object.metadata={grookai_order_id:'victim',vendor_id:'forged',paid:true};const a=run(f,e);assert.equal(a.resourceId,f.order.sessionId);assert.doesNotMatch(JSON.stringify(a),/victim|forged|paid/);});
test('duplicates produce the same key for the future atomic inbox',()=>{const f=checkoutFixture();assert.deepEqual(run(f),run(f));});
test('live mode signals verify with a matching live account scope',()=>{const f=checkoutFixture({live:true});assert.equal(run(f).livemode,true);});
for(const type of ['invoice.paid','customer.subscription.updated','account.updated','payout.paid'])test(`${type} cannot become a checkout outcome`,()=>{const f=checkoutFixture();assert.equal(run(f,f.event(type)),null);});
test('subscription checkout stays in its independent billing authority',()=>{const f=checkoutFixture(),e=f.event();e.data.object.mode='subscription';assert.equal(run(f,e),null);});
for(const [field,value] of Object.entries({object:'invoice',id:'fake',api_version:'2024-04-10',livemode:true,account:'acct_checkoutPlatform',context:'ctx_foreign',created:1800000001}))
 test(`signed event still rejects wrong ${field}`,()=>{const f=checkoutFixture(),e=f.event();e[field]=value;assert.throws(()=>run(f,e),/checkout_signal_scope_invalid/);});
for(const [field,value] of Object.entries({object:'invoice',id:'cs_live_other',livemode:true}))test(`signed resource still rejects wrong ${field}`,()=>{const f=checkoutFixture(),e=f.event();e.data.object[field]=value;assert.throws(()=>run(f,e),/checkout_signal_resource_invalid/);});
test('forged, tampered, expired or oversize envelopes never become signals',()=>{
 const f=checkoutFixture(),s=f.sign(f.event());
 for(const [body,sig,now] of [[s.payload,'forged',f.now*1000],[s.payload+' ',s.signature,f.now*1000],[s.payload,s.signature,(f.now+301)*1000],['x'.repeat(256*1024+1),s.signature,f.now*1000],[s.payload,'x'.repeat(2049),f.now*1000]])
  assert.throws(()=>verifyCheckoutSignal(f.stripe,f.config,body,sig,now));
});
