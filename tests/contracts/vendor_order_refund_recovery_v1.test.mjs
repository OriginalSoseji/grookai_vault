import test from 'node:test';
import assert from 'node:assert/strict';
import {refundFixture} from '../helpers/vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {readVerifiedCheckoutEvidence} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
const service=f=>createOrderRefundService(f.admin,f.stripe,f.config,{enabled:true,now:()=>f.now});
async function uncertain(mode='lost') {
 const f=refundFixture();f.postMode=mode;
 await assert.rejects(service(f).create(f.command,f.order.seller.ownerId),/order_refund_provider_uncertain/);
 f.now+=24*3600;return f;
}
async function proof(f) {
 const binding=structuredClone(f.order),evidence=await readVerifiedCheckoutEvidence(f.stripe,f.config,binding,()=>f.now);
 return {binding,evidence};
}
const recover=(f,p,revision=f.order.revision)=>createOrderRefundService(f.admin,f.stripe,f.config,{now:()=>f.now}).recoverVerified(p.binding,p.evidence,revision);
const writes=f=>f.rpcCalls.filter(x=>/recovery|bind/.test(x.name));
for(const status of ['succeeded','pending','requires_action','failed','canceled'])test(`automatic GET-proof recovery records ${status} after original creation window`,async()=>{
 const f=await uncertain();f.refunds.data[0].status=status;f.charge.amount_refunded=status==='succeeded'?1000:0;
 const p=await proof(f),calls=f.calls.length;
 assert.deepEqual(await recover(f,p),{recovered:1,unresolved:0});assert.equal(f.requests[0].status,status);
 assert.equal(f.calls.length,calls,'reuses sealed proof without extra provider requests');assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
 assert.deepEqual(await recover(f,p),{recovered:0,unresolved:0});
});
test('absent outcome stays unresolved and never retries provider creation',async()=>{
 const f=await uncertain('absent'),p=await proof(f);assert.deepEqual(await recover(f,p),{recovered:0,unresolved:1});
 assert.equal(writes(f).length,0);assert.equal(f.requests[0].status,'unbound');assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
});
for(const [name,mutate,pattern] of [
 ['amount mismatch',f=>{f.refunds.data[0].amount=999;f.charge.amount_refunded=999;},/binding_mismatch/],
 ['predates command',f=>f.refunds.data[0].created-=6,/binding_mismatch/],
 ['duplicate match',f=>f.addRefund(),/ambiguous_match/],
 ['foreign retained seller',f=>f.requests[0].connected_account_id='acct_other',/storage_invalid/],
])test(`${name} cannot acquire or bind a recovery lease`,async()=>{
 const f=await uncertain();mutate(f);const p=await proof(f);await assert.rejects(recover(f,p),pattern);assert.equal(writes(f).length,0);
});
test('serialized proof and expired proof cannot access storage',async()=>{
 const f=await uncertain(),p=await proof(f),before=f.rpcCalls.length;
 await assert.rejects(recover(f,{...p,evidence:structuredClone(p.evidence)}),/proof_invalid_or_stale/);
 f.now+=60;await assert.rejects(recover(f,p),/proof_invalid_or_stale/);assert.equal(f.rpcCalls.length,before);
});
test('current revision mismatch requires fresh reconciliation',async()=>{
 const f=await uncertain(),p=await proof(f);f.order.revision++;
 await assert.rejects(recover(f,p,p.binding.revision),/revision_conflict/);assert.equal(writes(f).length,0);
});
test('changed order identity cannot be hidden by matching current revision',async()=>{
 const f=await uncertain(),p=await proof(f);f.order.buyerId='55555555-5555-4555-8555-555555555555';
 await assert.rejects(recover(f,p),/binding_mismatch/);assert.equal(writes(f).length,0);
});
test('proof expiring while lease is acquired never reaches bind',async()=>{
 const f=await uncertain(),p=await proof(f);f.onRpc=(name)=>{if(name==='vendor_order_refund_recovery_v1')f.now+=60;};
 await assert.rejects(recover(f,p),/proof_invalid_or_stale/);assert.equal(f.rpcCalls.some(c=>c.name==='vendor_order_refund_bind_v1'),false);
});
test('active competing lease remains fenced',async()=>{
 const f=await uncertain();f.requests[0].lease_expires_at=new Date((f.now+120)*1000).toISOString();const p=await proof(f);
 await assert.rejects(recover(f,p),/order_refund_busy/);assert.equal(f.requests[0].refund_id,null);
});
for(const status of ['failed','canceled'])test(`verified ${status} permits only operator review, never hold clearance or fulfillment`,async()=>{
 const f=refundFixture();f.refundStatus=status;await service(f).create(f.command,f.order.seller.ownerId);
 const before=structuredClone(f.requests),n=f.rpcCalls.length,result=await service(f).reviewResolution(f.order.orderId,f.order.seller.ownerId);
 assert.equal(result.decision,'operator_review_required');assert.equal(result.clearsFinancialHolds,false);assert.equal(result.permitsFulfillment,false);
 assert.deepEqual(f.requests,before);assert.deepEqual(f.rpcCalls.slice(n).map(c=>c.name),['vendor_order_refund_context_v1']);
 assert.doesNotMatch(JSON.stringify(result),/acct_|re_1|pi_|ch_|lease|buyerId/);
});
for(const status of ['succeeded','pending','requires_action'])test(`${status} remains held for separate resolution`,async()=>{
 const f=refundFixture();f.refundStatus=status;await service(f).create(f.command,f.order.seller.ownerId);
 const r=await service(f).reviewResolution(f.order.orderId,f.order.seller.ownerId);assert.equal(r.decision,'held');assert.equal(r.permitsFulfillment,false);
});
test('empty inventory is not a negative refund confirmation',async()=>{
 const f=await uncertain('absent'),r=await service(f).reviewResolution(f.order.orderId,f.order.seller.ownerId);
 assert.equal(r.decision,'held');assert.ok(r.reasons.includes('unbound_request'));assert.ok(r.reasons.includes('no_terminal_refund_evidence'));
});
test('changed retained status and foreign actor cannot obtain a clearance result',async()=>{
 const f=refundFixture();f.refundStatus='failed';await service(f).create(f.command,f.order.seller.ownerId);f.requests[0].status='pending';
 assert.ok((await service(f).reviewResolution(f.order.orderId,f.order.seller.ownerId)).reasons.includes('retained_refund_differs'));
 const n=f.calls.length;await assert.rejects(service(f).reviewResolution(f.order.orderId,f.order.buyerId),/unavailable/);assert.equal(f.calls.length,n);
});
