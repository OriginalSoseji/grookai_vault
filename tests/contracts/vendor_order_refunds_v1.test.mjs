import test from 'node:test';
import assert from 'node:assert/strict';
import {refundFixture} from '../helpers/vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
const service=(f,options={})=>createOrderRefundService(f.admin,f.stripe,f.config,{enabled:true,now:()=>f.now,...options});
const create=f=>service(f).create(f.command,f.order.seller.ownerId);
const posts=f=>f.calls.filter(c=>c.method==='POST');
test('partial refund persists before POST and verifies current evidence before binding',async()=>{
 const f=refundFixture();f.onPost=()=>assert.equal(f.requests.length,1);const result=await create(f);
 assert.deepEqual(result,{orderId:f.order.orderId,requestId:f.command.requestId,amountMinor:1000,status:'succeeded'});
 const [p]=posts(f),body=new URLSearchParams(p.body);assert.equal(posts(f).length,1);
 assert.equal(p.key,`grookai-refund-v1-${f.command.requestId}`);assert.equal(body.get('amount'),'1000');
 assert.equal(body.get('reason'),'requested_by_customer');assert.equal(body.get('refund_application_fee'),'false');assert.equal(body.get('reverse_transfer'),'false');
 assert.equal(f.rpcCalls.at(-1).name,'vendor_order_refund_bind_v1');assert.equal(f.requests[0].refund_id,'re_1');
 assert.equal(f.order.stockState,'consumed');assert.doesNotMatch(JSON.stringify(result),/acct_|ch_|pi_|re_1|lease|PRIVATE/);
});
test('default disabled performs no storage or provider action',async()=>{const f=refundFixture();await assert.rejects(service(f,{enabled:undefined}).create(f.command,f.order.seller.ownerId),/order_refunds_disabled/);assert.equal(f.calls.length,0);assert.equal(f.rpcCalls.length,0);});
test('foreign owner receives no provider reads',async()=>{const f=refundFixture();await assert.rejects(service(f).create(f.command,f.order.buyerId),/order_refund_unavailable/);assert.equal(f.calls.length,0);});
test('fresh fractional SQL timestamps allow immediate creation',async()=>{const f=refundFixture();await create(f);assert.match(f.requests[0].creation_started_at,/\.321Z$/);assert.equal(posts(f).length,1);});
for(const [label,mutate] of [['negative',c=>c.amountMinor=-1],['zero',c=>c.amountMinor=0],['fractional',c=>c.amountMinor=1.2],['huge',c=>c.amountMinor=100000000],['fraudulent',c=>c.reason='fraudulent'],['invalid request',c=>c.requestId='bad']])
 test(`invalid command ${label} does not reach storage`,async()=>{const f=refundFixture();mutate(f.command);await assert.rejects(create(f),/order_refund_invalid/);assert.equal(f.rpcCalls.length,0);});
test('full refund uses explicit amount and retains stock',async()=>{const f=refundFixture();f.command.amountMinor=5900;await create(f);assert.equal(f.charge.refunded,true);assert.equal(f.order.stockState,'consumed');});
for(const status of ['pending','requires_action','failed','canceled'])test(`${status} is never displayed as succeeded`,async()=>{const f=refundFixture();f.refundStatus=status;assert.equal((await create(f)).status,status);});
test('exact request retry reads retained evidence without another POST',async()=>{const f=refundFixture();await create(f);assert.equal((await create(f)).status,'succeeded');assert.equal(posts(f).length,1);});
test('changed request amount cannot reuse a durable command',async()=>{const f=refundFixture();await create(f);f.command.amountMinor++;await assert.rejects(create(f),/order_refund_request_conflict/);assert.equal(posts(f).length,1);});
test('lost response is recovered by scoped GET evidence after lease expiry, with issuance disabled',async()=>{
 const f=refundFixture();f.postMode='lost';await assert.rejects(create(f),/order_refund_provider_uncertain/);assert.equal(f.requests[0].refund_id,null);
 f.now+=121;assert.equal((await service(f,{enabled:false}).refresh(f.command.orderId,f.command.requestId,f.order.seller.ownerId)).status,'succeeded');assert.equal(posts(f).length,1);
});
test('unknown creation retains request and retry uses byte-identical body and key',async()=>{
 const f=refundFixture();f.postMode='absent';await assert.rejects(create(f),/order_refund_provider_uncertain/);f.now+=121;f.postMode='success';await create(f);
 assert.equal(posts(f).length,2);assert.equal(posts(f)[0].body,posts(f)[1].body);assert.equal(posts(f)[0].key,posts(f)[1].key);assert.equal(f.requests.length,1);
});
test('past creation window with no provider match never reissues or clears uncertainty',async()=>{
 const f=refundFixture();f.postMode='absent';await assert.rejects(create(f));f.now+=24*3600;
 await assert.rejects(create(f),/order_refund_recovery_required/);assert.equal(posts(f).length,1);
 const r=await service(f,{enabled:false}).refresh(f.command.orderId,f.command.requestId,f.order.seller.ownerId);assert.equal(r.status,'unbound');
});
test('late provider match recovers after 24 hours without another POST',async()=>{
 const f=refundFixture();f.postMode='lost';await assert.rejects(create(f));f.now+=24*3600;
 assert.equal((await service(f,{enabled:false}).refresh(f.command.orderId,f.command.requestId,f.order.seller.ownerId)).status,'succeeded');assert.equal(posts(f).length,1);
});
test('metadata mismatch after POST never binds a different command',async()=>{const f=refundFixture();f.onPost=r=>r.metadata={};await assert.rejects(create(f),/order_refund_binding_mismatch/);assert.equal(f.requests[0].refund_id,null);});
test('multiple provider matches retain ambiguous request',async()=>{const f=refundFixture();f.postMode='lost';await assert.rejects(create(f));f.addRefund();f.now+=121;await assert.rejects(create(f),/order_refund_ambiguous_match/);assert.equal(posts(f).length,1);assert.equal(f.requests[0].refund_id,null);});
test('unresolved request prevents a new request key',async()=>{const f=refundFixture();f.postMode='absent';await assert.rejects(create(f));f.command.requestId='99999999-9999-4999-8999-999999999999';await assert.rejects(create(f),/order_refund_unresolved_request/);assert.equal(posts(f).length,1);});
test('preview separates pending and succeeded and reports available amount',async()=>{const f=refundFixture();f.refundStatus='pending';await create(f);const p=await service(f,{enabled:false}).preview(f.order.orderId,f.order.seller.ownerId);assert.equal(p.succeededMinor,0);assert.equal(p.pendingMinor,1000);assert.equal(p.availableMinor,4900);assert.equal(posts(f).length,1);});
test('wrong provider mode prevents creation',async()=>{const f=refundFixture();f.balance.livemode=true;await assert.rejects(create(f));assert.equal(posts(f).length,0);});
test('over remaining amount is rejected before POST',async()=>{const f=refundFixture();f.command.amountMinor=5901;await assert.rejects(create(f),/order_refund_amount_unavailable/);assert.equal(posts(f).length,0);});
