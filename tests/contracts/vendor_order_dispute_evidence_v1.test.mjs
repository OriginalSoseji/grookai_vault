import test from 'node:test';
import assert from 'node:assert/strict';
import {checkoutFixture} from '../helpers/vendorCheckoutFixture.mjs';
import {readVerifiedCheckoutEvidence,requireVerifiedCheckoutDisputeInventory} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
const run=f=>readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,()=>f.now);
function fixture(){const f=checkoutFixture();f.disputes.data=[{object:'dispute',id:'du_one',charge:f.charge.id,payment_intent:f.intent.id,
 livemode:false,created:f.now-20,currency:'usd',amount:5900,status:'needs_response',reason:'fraudulent',is_charge_refundable:true,
 evidence_details:{due_by:f.now+86400,has_evidence:false,past_due:false,submission_count:0},balance_transactions:[],
 metadata:{owner:'FORGED'},evidence:{customer_email_address:'PRIVATE EMAIL',customer_name:'PRIVATE NAME'}}];return f;}
const inventory=(f,p)=>requireVerifiedCheckoutDisputeInventory(p,f.order,f.config.scope,f.now);
test('current disputes block stock consumption even when the charge disputed flag is false',async()=>{
 const f=fixture(),p=await run(f);assert.equal(p.payment,'paid');assert.equal(p.stockAction,'retain');
 assert.deepEqual(p.reviewReasons,['dispute_requires_reconciliation','dispute_action_required']);
 const d=inventory(f,p);assert.equal(d.rows[0].dueBy,f.now+86400);assert.equal(d.complete,true);
 assert.doesNotMatch(JSON.stringify(d),/PRIVATE|FORGED|customer|metadata/);
 const calls=f.calls.filter(c=>c.path==='/v1/disputes');assert.equal(calls.length,2);
 for(const c of calls){assert.equal(c.scope,f.order.seller.connectedAccountId);assert.deepEqual(c.query,{charge:f.charge.id,limit:'100'});}
});
for(const status of ['warning_needs_response','warning_under_review','warning_closed','needs_response','under_review','won','lost','prevented'])test(`dispute ${status} remains retained financial review`,async()=>{
 const f=fixture();f.disputes.data[0].status=status;f.disputes.data[0].evidence_details.due_by=null;
 const p=await run(f);assert.equal(p.stockAction,'retain');assert.ok(p.reviewReasons.includes('dispute_requires_reconciliation'));
 assert.equal(p.reviewReasons.includes('dispute_lost'),status==='lost');assert.equal(inventory(f,p).rows[0].status,status);
});
test('provider dispute amounts are not silently capped to charge amount or assumed to use charge currency',async()=>{
 const f=fixture();Object.assign(f.disputes.data[0],{amount:7100,currency:'eur'});const d=inventory(f,await run(f));assert.equal(d.rows[0].amountMinor,7100);assert.equal(d.rows[0].currency,'eur');
});
for(const [field,value]of Object.entries({charge:'ch_other',payment_intent:'pi_other',livemode:true,object:'refund',id:'du_bad-identifier',created:1800000001,amount:0,currency:'USD',status:'unknown',reason:'PRIVATE TEXT',is_charge_refundable:'true',evidence_details:null,balance_transactions:['txn_one']}))test(`dispute rejects malformed or foreign ${field}`,async()=>{
 const f=fixture();f.disputes.data[0][field]=value;await assert.rejects(run(f),/order_dispute_evidence_invalid/);
});
test('duplicate dispute IDs and transaction IDs cannot inflate evidence',async()=>{
 let f=fixture();f.disputes.data.push(structuredClone(f.disputes.data[0]));await assert.rejects(run(f));
 f=fixture();f.disputes.data[0].balance_transactions=[{object:'balance_transaction',id:'txn_one'},{object:'balance_transaction',id:'txn_one'}];await assert.rejects(run(f));
});
test('complete missing dispute list retains a charge/list mismatch',async()=>{
 const f=checkoutFixture();f.charge.disputed=true;const p=await run(f);assert.equal(p.stockAction,'retain');assert.ok(p.reviewReasons.includes('dispute_inventory_mismatch'));
});
test('bounded pagination uses exact cursor and sorts observed evidence',async()=>{
 const f=fixture(),first=structuredClone(f.disputes.data[0]),second={...structuredClone(first),id:'du_two'};
 f.disputePages={first:{object:'list',has_more:true,data:[first]},du_one:{object:'list',has_more:false,data:[second]}};
 const d=inventory(f,await run(f));assert.equal(d.complete,true);assert.deepEqual(d.rows.map(r=>r.id),['du_one','du_two']);
 assert.equal(f.calls.filter(c=>c.path==='/v1/disputes'&&c.query.starting_after==='du_one').length,2);
});
test('page cap never establishes an empty or complete financial inventory',async()=>{
 const f=fixture(),row=f.disputes.data[0];f.disputePages={};
 for(let i=0;i<5;i++)f.disputePages[i===0?'first':`du_${i-1}`]={object:'list',has_more:true,data:[{...structuredClone(row),id:`du_${i}`}]};
 const p=await run(f);assert.equal(inventory(f,p).complete,false);assert.ok(p.reviewReasons.includes('dispute_inventory_incomplete'));assert.equal(f.calls.filter(c=>c.path==='/v1/disputes').length,10);
});
test('changes between provider observations prevent a sealed proof',async()=>{
 const f=fixture();let count=0;f.onCall=c=>{if(c.path==='/v1/disputes'&&++count===2)f.disputes.data[0].evidence_details.submission_count++;};
 await assert.rejects(run(f),/checkout_evidence_changed/);
});
test('provider failure cannot turn disputed funds into cleared payment',async()=>{
 const f=fixture();f.fail='/v1/disputes';await assert.rejects(run(f),/checkout_provider_unavailable/);
});
test('only original fresh payment proof exposes a defensive dispute inventory copy',async()=>{
 const f=fixture(),p=await run(f),d=inventory(f,p);d.rows[0].status='won';assert.equal(inventory(f,p).rows[0].status,'needs_response');
 assert.throws(()=>inventory(f,structuredClone(p)),/checkout_proof_invalid_or_stale/);
 assert.throws(()=>requireVerifiedCheckoutDisputeInventory(p,f.order,f.config.scope,f.now+60),/checkout_proof_invalid_or_stale/);
});
test('failed-charge dispute cannot release a payment-pending stock claim',async()=>{
 const f=fixture();f.expire(true);f.intent.latest_charge=f.charge.id;Object.assign(f.charge,{status:'failed',paid:false,captured:false,amount_captured:0});
 const p=await run(f);assert.equal(p.stockAction,'retain');assert.equal(p.payment,'pending');
});
