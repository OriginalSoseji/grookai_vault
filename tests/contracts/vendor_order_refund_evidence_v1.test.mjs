import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
import {readVerifiedCheckoutEvidence,requireVerifiedCheckoutEvidence} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
import {verifyCheckoutSignal} from '../../apps/web/src/lib/payments/vendorCheckoutSignals.ts';

const run=f=>readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,()=>f.now);
const row=(f,overrides={})=>({object:'refund',id:'re_partial',charge:f.charge.id,payment_intent:f.intent.id,
 amount:1000,currency:'usd',created:f.now-5,status:'succeeded',balance_transaction:'txn_refund',
 failure_balance_transaction:null,failure_reason:null,pending_reason:null,source_transfer_reversal:null,transfer_reversal:null,
 metadata:{owner:'PRIVATE ID'},instructions_email:'PRIVATE EMAIL',destination_details:{card:{reference:'PRIVATE BANK REF'}},...overrides});
const setup=()=>{const f=checkoutFixture();f.refunds.data=[row(f)];f.charge.amount_refunded=1000;return f;};

test('a partial refund is verified through charge-filtered scoped GETs and retains stock for review',async()=>{
 const f=setup(),r=await run(f);assert.equal(r.payment,'paid');assert.equal(r.stockAction,'retain');
 assert.deepEqual(r.reviewReasons,['refund_requires_reconciliation']);
 assert.equal(f.calls.filter(c=>c.path==='/v1/refunds').length,2);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE|re_partial|txn_refund|destination_details/);
 requireVerifiedCheckoutEvidence(r,f.order,f.config.scope,f.now);
});
test('full refund never releases a claim or restores consumed inventory',async()=>{
 for(const state of ['payment_pending','consumed','released']){
  const f=setup();f.order.stockState=state;f.refunds.data[0].amount=5900;f.charge.amount_refunded=5900;f.charge.refunded=true;
  const r=await run(f);assert.equal(r.payment,'paid');assert.equal(r.stockAction,state==='consumed'?'none':'retain');
  assert.ok(r.reviewReasons.includes('refund_requires_reconciliation'));
 }
});
for(const [status,reason] of [['pending','refund_pending'],['requires_action','refund_action_required'],['failed','refund_failed'],['canceled','refund_requires_reconciliation']])
 test(`${status} refund remains visible even when charge.amount_refunded is zero`,async()=>{
  const f=setup();f.charge.amount_refunded=0;Object.assign(f.refunds.data[0],{status,balance_transaction:null});
  const r=await run(f);assert.equal(r.payment,'paid');assert.equal(r.stockAction,'retain');assert.ok(r.reviewReasons.includes(reason));
 });
test('successful and failed refunds are not netted; a later failed refund changes observation identity',async()=>{
 const f=setup(),first=await run(f);f.refunds.data.push(row(f,{id:'re_failed',status:'failed',failure_reason:'declined',failure_balance_transaction:'txn_failed'}));
 const second=await run(f);assert.notEqual(first.evidenceHash,second.evidenceHash);assert.ok(second.reviewReasons.includes('refund_failed'));
});
for(const [label,change] of [
 ['wrong parent charge',r=>r.charge='ch_other'],['wrong intent',r=>r.payment_intent='pi_other'],['wrong currency',r=>r.currency='eur'],
 ['wrong object',r=>r.object='charge'],['invalid ID',r=>r.id='other'],['expanded intent',r=>r.payment_intent={id:'pi_order'}],
 ['unknown status',r=>r.status='complete'],['missing status',r=>delete r.status],['negative amount',r=>r.amount=-1],
 ['fractional amount',r=>r.amount=1.25],['over capture',r=>r.amount=5901],['future time',r=>r.created=1800000001],
 ['before charge',r=>r.created=0],['wrong balance transaction',r=>r.balance_transaction='po_other'],
 ['unsafe reason',r=>r.failure_reason='PRIVATE ERROR'],['destination charge',r=>r.transfer_reversal='trr_other']])
 test(`invalid refund evidence rejects ${label}`,async()=>{const f=setup();change(f.refunds.data[0]);await assert.rejects(run(f),/order_refund_evidence_invalid/);});
for(const [label,change] of [
 ['missing list',f=>f.refunds={object:'list',has_more:false}],['empty continuing page',f=>f.refunds.has_more=true],
 ['duplicate ID',f=>{f.refunds.data=[row(f),row(f)];}],['nonboolean has_more',f=>f.refunds.has_more='false'],
 ['oversize page',f=>f.refunds.data=Array.from({length:101},(_,i)=>row(f,{id:`re_${i}`,amount:1}))]])
 test(`malformed pagination rejects ${label}`,async()=>{const f=checkoutFixture();change(f);await assert.rejects(run(f),/order_refund_evidence_invalid/);});
test('refunds beyond the first page are included, with exact cursors on both scans',async()=>{
 const f=setup(),a=row(f),b=row(f,{id:'re_second',amount:500});f.charge.amount_refunded=1500;
 f.refundPages={first:{object:'list',has_more:true,data:[a]},re_partial:{object:'list',has_more:false,data:[b]}};
 assert.deepEqual((await run(f)).reviewReasons,['refund_requires_reconciliation']);
 assert.deepEqual(f.calls.filter(c=>c.path==='/v1/refunds').map(c=>c.query.starting_after),[undefined,'re_partial',undefined,'re_partial']);
});
test('duplicate across pages cannot inflate totals or advance forever',async()=>{
 const f=setup(),a=row(f);f.refundPages={first:{object:'list',has_more:true,data:[a]},re_partial:{object:'list',has_more:false,data:[a]}};
 await assert.rejects(run(f),/order_refund_evidence_invalid/);
});
test('five-page bound records incomplete review instead of inventing a zero remaining obligation',async()=>{
 const f=checkoutFixture();f.refundPages={};let key='first';
 for(let p=0;p<5;p++){const data=Array.from({length:100},(_,i)=>row(f,{id:`re_${p*100+i}`,amount:1,status:'failed'}));
  f.refundPages[key]={object:'list',has_more:true,data};key=data.at(-1).id;}
 const r=await run(f);assert.ok(r.reviewReasons.includes('refund_inventory_incomplete'));assert.equal(r.stockAction,'retain');
 assert.equal(f.calls.filter(c=>c.path==='/v1/refunds').length,10);
});
test('partial/full aggregate mismatches remain explicit review evidence',async()=>{
 for(const n of [0,999,1001,5900]){const f=setup();f.charge.amount_refunded=n;f.charge.refunded=n===5900;
  const r=await run(f);assert.ok(r.reviewReasons.includes('refund_amount_mismatch'));assert.equal(r.stockAction,'retain');}
});
test('pending aggregate is never interpreted as succeeded; overcommitted refunds stay blocked',async()=>{
 const f=setup();f.refunds.data[0].status='pending';assert.ok((await run(f)).reviewReasons.includes('refund_pending'));
 f.refunds.data.push(row(f,{id:'re_excess',amount:5900}));assert.ok((await run(f)).reviewReasons.includes('refund_amount_mismatch'));
});
test('a refund created or changing status during the scan cannot produce stable evidence',async()=>{
 const f=setup();let scans=0;f.onCall=c=>{if(c.path==='/v1/refunds'&&++scans===2)f.refunds.data[0].status='failed';};
 await assert.rejects(run(f),/checkout_evidence_changed/);
});
test('provider errors stay redacted and never become empty refund history',async()=>{
 const f=setup();f.fail='/v1/refunds';await assert.rejects(run(f),e=>e.message==='checkout_provider_unavailable');
});
test('refund lookup uses the same deadline and scope-mutation protection',async()=>{
 for(const change of [f=>f.now+=60,f=>f.config.scope.accountId='acct_other',f=>f.order.seller.connectedAccountId='acct_other']){
  const f=setup();f.onCall=c=>{if(c.path==='/v1/refunds')change(f);};await assert.rejects(run(f));
 }
});

const types=['refund.created','refund.updated','refund.failed','charge.refunded','charge.dispute.created','charge.dispute.updated',
 'charge.dispute.closed','charge.dispute.funds_withdrawn','charge.dispute.funds_reinstated'];
function event(f,type){const e=f.event(type);e.data.object=type.startsWith('refund.')?row(f):type==='charge.refunded'?structuredClone(f.charge):
 {object:'dispute',id:'du_order',charge:f.charge.id,payment_intent:f.intent.id,livemode:f.config.scope.livemode};return e;}
function signal(f,e){const s=f.sign(e);return verifyCheckoutSignal(f.stripe,f.config,s.payload,s.signature,f.now*1000);}
for(const type of types)test(`${type} wakes only the bound intent and never trusts its status or metadata`,()=>{
 const f=checkoutFixture(),e=event(f,type);e.data.object.metadata={orderId:'VICTIM',paid:true};e.data.object.status='not_payment_proof';e.data.object.amount=99999999;
 const s=signal(f,e);assert.equal(s.kind,'payment_intent');assert.equal(s.resourceId,f.intent.id);assert.equal(f.calls.length,0);
 assert.doesNotMatch(JSON.stringify(s),/VICTIM|paid|amount|status/);
});
test('refund envelope verifies mode and signature although Refund V1 has no livemode field',()=>{
 for(const live of [false,true]){const f=checkoutFixture({live}),e=event(f,'refund.created');assert.equal(e.data.object.livemode,undefined);
  assert.equal(signal(f,e).livemode,live);e.livemode=!live;assert.throws(()=>signal(f,e),/checkout_signal_scope_invalid/);}
});
for(const type of ['refund.created','charge.refunded','charge.dispute.created'])test(`${type} rejects malformed identity and cannot fall back to metadata`,()=>{
 for(const value of [undefined,'pi_invalid-id',{id:'pi_order'},42]){const f=checkoutFixture(),e=event(f,type);e.data.object.payment_intent=value;
  assert.throws(()=>signal(f,e),/checkout_signal_resource_invalid/);}
 const f=checkoutFixture(),e=event(f,type);e.data.object.payment_intent=null;assert.equal(signal(f,e),null);
 e.data.object.payment_intent=f.intent.id;e.data.object.id='bad';assert.throws(()=>signal(f,e));
});
test('dispute and charge resource modes must also match their envelope',()=>{
 for(const type of ['charge.refunded','charge.dispute.created']){const f=checkoutFixture(),e=event(f,type);e.data.object.livemode=true;
  assert.throws(()=>signal(f,e),/checkout_signal_resource_invalid/);}
});
