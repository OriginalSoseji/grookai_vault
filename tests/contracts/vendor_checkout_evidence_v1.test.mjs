import test from 'node:test';
import assert from 'node:assert/strict';
import {readVerifiedCheckoutEvidence,requireVerifiedCheckoutEvidence} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
const run=f=>readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,()=>f.now);
const valid=(f,result)=>requireVerifiedCheckoutEvidence(result,f.order,f.config.scope,f.now);
test('exact captured payment yields one private consume recommendation through scoped SDK GETs',async()=>{
 const f=checkoutFixture(),r=await run(f);assert.equal(r.payment,'paid');assert.equal(r.stockAction,'consume');assert.equal(r.amountMinor,5900);assert.deepEqual(r.reviewReasons,[]);valid(f,r);
 assert.equal(f.calls.length,16);assert.equal(f.calls.filter(x=>x.path.endsWith('/line_items')).length,2);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE|customer_details|client_secret|billing_details/);assert.match(r.evidenceHash,/^[a-f0-9]{64}$/);
});
test('live and test objects cannot cross modes; live uses the same read-only verification',async()=>{const f=checkoutFixture({live:true});assert.equal((await run(f)).payment,'paid');});
test('disabling seller charges/payouts does not hide an existing paid obligation',async()=>{const f=checkoutFixture();assert.equal(f.account.charges_enabled,false);assert.equal((await run(f)).payment,'paid');});

for(const [field,value] of Object.entries({orderId:'forged',reservationId:null,attemptId:'',buyerId:'11111111-1111-4111-8111-111111111111',revision:-1,createdAt:1800000001,creationStartedAt:1800000001,sessionCreatedAt:1800000001,
 sessionId:'cs_live_foreign',paymentIntentId:{id:'pi_order'},currency:'jpy',unitAmountMinor:1.25,quantity:101,shippingAmountMinor:-1,taxAmountMinor:NaN,stockState:'paid'}))
 test(`server binding rejects ${field} before provider access`,async()=>{const f=checkoutFixture();f.order[field]=value;await assert.rejects(run(f));assert.equal(f.calls.length,0);});
test('overflow and Stripe maximum are rejected before provider access',async()=>{for(const n of [Number.MAX_SAFE_INTEGER,100000000]){const f=checkoutFixture();f.order.unitAmountMinor=n;await assert.rejects(run(f));assert.equal(f.calls.length,0);}});
test('provider attempt cannot be silently recreated beyond the idempotency window',async()=>{const f=checkoutFixture();f.order.createdAt-=86400;f.order.creationStartedAt-=86400;await assert.rejects(run(f));assert.equal(f.calls.length,0);});
for(const field of ['platformAccountId','connectedAccountId','livemode','ownerId','storeId'])test(`server seller binding rejects forged ${field}`,async()=>{const f=checkoutFixture();f.order.seller[field]=field==='livemode'?true:'invalid';await assert.rejects(run(f));assert.equal(f.calls.length,0);});

for(const [field,value] of Object.entries({object:'invoice',id:'cs_test_foreign',livemode:true,created:1,mode:'subscription',currency:'eur',client_reference_id:'forged',subscription:'sub_foreign',setup_intent:'seti_foreign',payment_link:'plink_foreign',recovered_from:'cs_test_old',
 payment_method_types:['card','link'],status:'unknown',payment_status:'unknown',amount_subtotal:5001,amount_total:5901,payment_intent:'pi_foreign',expires_at:0,metadata:{}}))
 test(`session evidence rejects ${field}`,async()=>{const f=checkoutFixture();f.session[field]=value;await assert.rejects(run(f));});
for(const field of ['amount_discount','amount_shipping','amount_tax'])test(`checkout total cannot alter ${field}`,async()=>{const f=checkoutFixture();f.session.total_details[field]++;await assert.rejects(run(f));});
test('automatic session recovery cannot resurrect a released stock claim',async()=>{const f=checkoutFixture();f.session.after_expiration={recovery:{enabled:true}};await assert.rejects(run(f));});
for(const field of ['grookai_order_id','grookai_attempt_id','grookai_reservation_id'])for(const object of ['session','intent'])test(`${object} metadata must match persisted ${field}`,async()=>{const f=checkoutFixture();f[object].metadata[field]='forged';await assert.rejects(run(f));});

for(const [label,mutate] of [
 ['truncated lines',f=>f.lines.has_more=true],['empty lines',f=>f.lines.data=[]],['extra item',f=>f.lines.data.push(structuredClone(f.lines.data[0]))],
 ['quantity',f=>f.lines.data[0].quantity=1],['discount',f=>f.lines.data[0].amount_discount=1],['line currency',f=>f.lines.data[0].currency='eur'],
 ['wrong unit price',f=>f.lines.data[0].price.unit_amount=2501],['recurring price',f=>f.lines.data[0].price.recurring={}],
 ['malformed price',f=>f.lines.data[0].price=null],['tax arithmetic',f=>f.lines.data[0].amount_total++],
 ['fractional tax',f=>f.lines.data[0].amount_tax=0.5],['unsupported price tiers',f=>f.lines.data[0].price.billing_scheme='tiered'],
 ])test(`line-item proof rejects ${label}`,async()=>{const f=checkoutFixture();mutate(f);await assert.rejects(run(f));});

for(const [field,value] of Object.entries({object:'invoice',id:'pi_foreign',livemode:true,currency:'eur',amount:5899,capture_method:'manual',transfer_data:{destination:'acct_other'},on_behalf_of:'acct_other',application_fee_amount:100,
 payment_method_types:['us_bank_account'],status:'unknown',created:1800000001,amount_received:-1,amount_capturable:0.5,canceled_at:1800000000,latest_charge:{id:'ch_order'}}))
 test(`PaymentIntent evidence rejects ${field}`,async()=>{const f=checkoutFixture();f.intent[field]=value;await assert.rejects(run(f));});
for(const [field,value] of Object.entries({object:'payout',id:'ch_foreign',payment_intent:'pi_foreign',livemode:true,currency:'eur',amount:5901,on_behalf_of:'acct_other',transfer_data:{destination:'acct_other'},application_fee_amount:100,
 status:'unknown',paid:'true',captured:'true',refunded:true,disputed:null,amount_captured:5901,amount_refunded:5901,created:1800000001}))
 test(`captured charge proof rejects ${field}`,async()=>{const f=checkoutFixture();f.charge[field]=value;await assert.rejects(run(f));});

for(const [label,change] of [
 ['checkout completion alone',f=>{f.order.paymentIntentId=null;f.session.payment_intent=null;}],
 ['success page without settled funds',f=>f.pending()],
 ['authorized but uncaptured',f=>{f.pending('requires_capture');f.intent.amount_capturable=5900;}],
 ['successful intent without charge',f=>f.intent.latest_charge=null],
 ['partial capture',f=>f.charge.amount_captured=100],
 ['charge not captured',f=>f.charge.captured=false],
 ['zero received',f=>f.intent.amount_received=0],
 ['payment not required',f=>{f.pending();f.session.payment_status='no_payment_required';}],
 ])test(`${label} cannot consume or release stock`,async()=>{const f=checkoutFixture();change(f);const r=await run(f);assert.equal(r.payment,'pending');assert.equal(r.stockAction,'retain');});
for(const status of ['requires_payment_method','requires_confirmation','requires_action','processing'])test(`nonterminal ${status} retains stock even after the local hold deadline`,async()=>{const f=checkoutFixture();f.pending(status);f.session.expires_at=f.now-1;const r=await run(f);assert.equal(r.stockAction,'retain');});
test('manual expiration without any PaymentIntent proves unpaid even before the original expiry time',async()=>{const f=checkoutFixture();f.expire();const r=await run(f);assert.equal(r.payment,'unpaid');assert.equal(r.stockAction,'release');assert.equal(r.paymentIntentId,null);assert.equal(f.calls.length,8);valid(f,r);});
test('expired session and canceled empty intent prove unpaid',async()=>{const f=checkoutFixture();f.expire(true);const r=await run(f);assert.equal(r.payment,'unpaid');assert.equal(r.stockAction,'release');});
test('failed uncaptured charge can accompany terminal unpaid evidence',async()=>{const f=checkoutFixture();f.expire(true);f.intent.latest_charge='ch_order';Object.assign(f.charge,{status:'failed',paid:false,captured:false,amount_captured:0});assert.equal((await run(f)).stockAction,'release');});
test('expired checkout with a retryable intent cannot release stock',async()=>{const f=checkoutFixture();f.expire(true);f.intent.status='requires_payment_method';f.intent.canceled_at=null;assert.equal((await run(f)).stockAction,'retain');});
test('canceled intent on an open checkout cannot release stock',async()=>{const f=checkoutFixture();f.expire(true);f.session.status='open';assert.equal((await run(f)).stockAction,'retain');});
test('a missing previously bound intent is never proof of no payment',async()=>{const f=checkoutFixture();f.expire();f.order.paymentIntentId='pi_order';await assert.rejects(run(f));});
test('canceled intent with received money cannot release stock',async()=>{const f=checkoutFixture();f.expire(true);f.intent.amount_received=100;assert.equal((await run(f)).stockAction,'retain');});

for(const [label,change,reason] of [
 ['partial refund',f=>f.charge.amount_refunded=100,'refund_requires_reconciliation'],
 ['full refund',f=>{f.charge.amount_refunded=5900;f.charge.refunded=true;},'refund_requires_reconciliation'],
 ['dispute',f=>f.charge.disputed=true,'dispute_requires_reconciliation'],
 ['late success after stock release',f=>f.order.stockState='released','paid_after_stock_release'],
 ['contradictory expired session',f=>{f.session.status='expired';f.session.payment_status='unpaid';},'checkout_payment_conflict'],
 ])test(`${label} records the paid fact but requires review and no stock consumption`,async()=>{const f=checkoutFixture();change(f);const r=await run(f);assert.equal(r.payment,'paid');assert.equal(r.stockAction,'retain');assert.ok(r.reviewReasons.includes(reason));});
test('previously consumed stock never receives a second consume recommendation',async()=>{const f=checkoutFixture();f.order.stockState='consumed';assert.equal((await run(f)).stockAction,'none');});
test('previously released stock never receives a second release recommendation',async()=>{const f=checkoutFixture();f.expire();f.order.stockState='released';assert.equal((await run(f)).stockAction,'none');});
test('stale unpaid outcome cannot restore already-consumed stock',async()=>{const f=checkoutFixture();f.expire();f.order.stockState='consumed';const r=await run(f);assert.equal(r.stockAction,'none');assert.deepEqual(r.reviewReasons,['unpaid_after_stock_consumption']);});

for(const [path,field] of [['platform','id'],['account','id'],['platformBalance','livemode'],['balance','livemode']])test(`actual ${path} scope is verified`,async()=>{const f=checkoutFixture();f[path][field]=field==='id'?'acct_other':true;await assert.rejects(run(f));});
for(const segment of ['account','accounts/acct_checkoutSeller','balance','checkout/sessions/cs_test_order','checkout/sessions/cs_test_order/line_items','payment_intents/pi_order','charges/ch_order'])
 test(`provider failure at ${segment} cannot issue proof or leak private details`,async()=>{const f=checkoutFixture();f.fail='/v1/'+segment;await assert.rejects(run(f),e=>e.code==='checkout_provider_unavailable'&&!e.message.includes('PRIVATE'));});
for(const [target,field,value] of [['session','payment_status','unpaid'],['intent','amount_received',0],['charge','amount_refunded',100],['lines','has_more',true]])
 test(`changing ${target} during verification produces no usable proof`,async()=>{const f=checkoutFixture();f.onCall=()=>{if(f.calls.length===9)f[target][field]=value;};await assert.rejects(run(f));});
test('changing the order while awaiting provider data is rejected',async()=>{const f=checkoutFixture();f.onCall=()=>{f.order.revision++;};await assert.rejects(run(f));});
test('changing configured scope while awaiting provider data is rejected',async()=>{const f=checkoutFixture();f.onCall=()=>{f.config.scope.accountId='acct_other';};await assert.rejects(run(f));});
test('deadline checked between requests; slow verification cannot reuse evidence',async()=>{const f=checkoutFixture();f.onCall=()=>{f.now+=10;};await assert.rejects(run(f),/checkout_observation_expired/);assert.ok(f.calls.length<=6);});
test('clock reversal is rejected',async()=>{const f=checkoutFixture();f.onCall=()=>{f.now--;};await assert.rejects(run(f),/checkout_observation_expired/);});
test('only original unmodified fresh evidence can reach a future ledger consumer',async()=>{
 const f=checkoutFixture(),r=await run(f);valid(f,r);
 for(const copy of [{...r},structuredClone(r),JSON.parse(JSON.stringify(r))])assert.throws(()=>valid(f,copy),/checkout_proof_invalid_or_stale/);
 r.stockAction='release';assert.throws(()=>valid(f,r));
});
test('evidence is bound to exact persisted order revision, scope and freshness',async()=>{
 for(const mutate of [f=>f.order.revision++,f=>f.order.stockState='consumed',f=>f.now+=60,f=>f.now--,f=>f.config.scope.accountId='acct_other']){
  const f=checkoutFixture(),r=await run(f);mutate(f);assert.throws(()=>valid(f,r));
 }
});
