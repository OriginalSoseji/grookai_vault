import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {refundFixture} from './vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
import {readResolutions,resolutionHandler} from '../../apps/web/src/lib/orders/orderResolutions.ts';
import {readResolutionQueue} from '../../apps/web/src/lib/orders/orderResolutionQueue.ts';

export async function proveOrderResolutions({db,admin,anon,ownerApi,buyerApi,otherApi,owner,buyer,other,ids,copies,create,bind,provider,race,checks,signalIds}) {
 const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
 await db.query('update vendor_order_refunds_control set enabled=true');
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);
 const b=await bind(await create(copies[30])),source=provider(b),f=refundFixture(),id=b.orderId;
 for(const key of ['order','config','platform','account','session','lines','intent','charge','now','balance','platformBalance'])f[key]=source[key];
 const add=f.addRefund;f.addRefund=(...args)=>{const r=add(...args);r.id='re_'+id.replaceAll('-','')+f.refunds.data.length;return r;};
 const clock=()=>Math.floor(Date.now()/1000),service=createOrderRefundService(admin,f.stripe,f.config,{enabled:true,now:clock});
 await reconcileVendorOrder(admin,f.stripe,f.config,id,clock);
 f.refundStatus='failed';const refund=await service.create({orderId:id,requestId:randomUUID(),amountMinor:100,reason:'requested_by_customer'},owner);
 await reconcileVendorOrder(admin,f.stripe,f.config,id,clock);
 const baseline=async()=>JSON.stringify((await db.query(`select o.paid,o.review_reasons,r.state,r.quantity,v.user_id,v.archived_at,
  (select jsonb_agg(to_jsonb(h) order by h.id) from vendor_account_financial_holds h where h.reference_id=o.id) holds,
  (select count(*) from vendor_order_fulfillment_events where order_id=o.id) fulfillment,
  (select count(*) from vendor_order_observations where order_id=o.id) observations
  from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id join vault_item_instances v on v.id=r.instance_id where o.id=$1`,[id])).rows);
 const before=await baseline(),postCount=f.calls.filter(c=>c.method==='POST').length;
 const caseId=randomUUID();
 await assert.rejects(service.requestResolution(id,caseId,owner),/order_resolutions_disabled/);
 await assert.rejects(service.requestResolution(id,caseId,buyer),/unavailable/);
 await db.query('update vendor_order_resolutions_control set enabled=true');
 await service.requestResolution(id,caseId,owner);
 let state=await readResolutions(ownerApi,id),c=state.cases[0];assert.equal(c.state,'requested');assert.equal(c.basisCurrent,true);
 assert.equal((await readResolutions(buyerApi,id)).role,'buyer');assert.equal(await readResolutions(otherApi,id),null);
 assert.doesNotMatch(JSON.stringify(state),/acct_|pi_|ch_|re_|actor_id|owner_id|buyer_id|basis_hash|evidence_hash/);
 assert.equal(state.clearsFinancialHolds,false);assert.equal(state.permitsFulfillment,false);
 for(const client of [anon,ownerApi,buyerApi,otherApi]) {
  assert.ok((await client.from('vendor_order_resolution_cases').select('*')).error);
  assert.ok((await client.rpc('vendor_order_resolution_record_v1',{p_order_id:id,p_case_id:caseId,p_actor_id:buyer,p_request_id:randomUUID(),p_expected_sequence:1,p_action:'agree',p_terms_hash:c.termsHash})).error);
 }
 assert.ok((await admin.from('vendor_order_resolution_events').insert({})).error);
 checks.push('actual Auth exposes private participant resolution DTOs only; anonymous/foreign access and direct base-table/private RPC writes are denied');
 const sql='select vendor_order_resolution_record_v1($1,$2,$3,$4,$5,$6,$7) value';
 const args=(actor,action,sequence=1,requestId=randomUUID(),caseValue=c)=>[id,caseValue.caseId,actor,requestId,sequence,action,caseValue.termsHash];
 await assert.rejects(db.query(sql,args(owner,'agree')),/conflict/);
 await assert.rejects(db.query(sql,args(buyer,'accept')),/conflict/);
 await assert.rejects(db.query(sql,args(other,'accept')),/unavailable/);
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'founder_admin','founder','{\"order_resolution_operator\":true}')",[other]);
 await assert.rejects(db.query(sql,args(other,'accept')),/conflict/);
 const agree=args(buyer,'agree');await race(sql,agree,sql,args(buyer,'decline'),{error:/order_resolution_conflict/});
 assert.equal((await readResolutions(buyerApi,id)).cases[0].state,'agreed');
 assert.equal((await db.query(sql,agree)).rows[0].value,caseId);
 await assert.rejects(db.query(sql,[...agree.slice(0,5),'decline',agree[6]]),/conflict/);
 await assert.rejects(db.query(sql,args(buyer,'withdraw',1)),/conflict/);
 checks.push('seller cannot impersonate buyer consent; two actual buyer responses serialize to one event, exact retry recovers and changed or stale commands fail');
 const opState=await readResolutions(otherApi,id);assert.equal(opState.role,'operator');
 const queue=await readResolutionQueue(otherApi,other,()=>admin);assert.ok(queue.rows.some(x=>x.orderId===id));
 let adminTouched=false;assert.equal(await readResolutionQueue(buyerApi,buyer,()=>{adminTouched=true;return admin;}),null);assert.equal(adminTouched,false);
 await db.query("update user_entitlements set tier='founder_admin',role='founder',features='{\"order_resolution_operator\":true}' where user_id=$1",[owner]);
 await assert.rejects(db.query(sql,args(owner,'accept',2)),/conflict/);
 for(const grant of ["is_active=false","features='{\"order_resolution_operator\":\"true\"}'","tier='vendor'","role='vendor'"]) {
  await db.query(`update user_entitlements set is_active=true,tier='founder_admin',role='founder',features='{"order_resolution_operator":true}' where user_id=$1`,[other]);
  await db.query(`update user_entitlements set ${grant} where user_id=$1`,[other]);
  await assert.rejects(db.query(sql,args(other,'accept',2)),/unavailable/);
 }
 await db.query(`update user_entitlements set is_active=true,tier='founder_admin',role='founder',features='{"order_resolution_operator":true}' where user_id=$1`,[other]);
 await db.query(sql,args(other,'accept',2));
 state=await readResolutions(buyerApi,id);assert.equal(state.cases[0].state,'accepted');assert.equal(state.cases[0].events.length,3);
 assert.equal((await ownerApi.rpc('vendor_order_fulfillment_status_v1',{p_order_id:id})).data.paymentReady,false);
 assert.equal(await baseline(),before);
 checks.push('only explicit active user-bound operator grants can review; role/feature revocation and self-review fail, and acceptance never clears holds or permits fulfillment');
 await db.query(sql,args(buyer,'withdraw',3));
 assert.equal((await readResolutions(buyerApi,id)).cases[0].state,'withdrawn');
 for(const table of ['vendor_order_resolution_cases','vendor_order_resolution_events'])await assert.rejects(db.query(`delete from ${table} where id=$1`,[caseId]),/history_retained/);
 checks.push('buyer may withdraw after operator acceptance; all actor decisions are append-only and cannot be deleted');
 const second=randomUUID();await service.requestResolution(id,second,owner);c=(await readResolutions(ownerApi,id)).cases[0];
 const event='evt_resolution'+id.replaceAll('-','');signalIds.push(event);
 await ok(admin.rpc('vendor_order_signal_v1',{p_platform:f.config.scope.accountId,p_connected:f.account.id,p_live:false,p_event:event,p_kind:'payment_intent',p_resource:f.intent.id,p_created:new Date().toISOString()}));
 assert.equal((await readResolutions(buyerApi,id)).cases[0].basisCurrent,false);
 await assert.rejects(db.query(sql,args(buyer,'agree',1)),/changed/);
 await db.query(sql,args(buyer,'decline',1));
 checks.push('new signed-signal generation invalidates positive consent immediately while allowing an explicit negative response');
 await db.query('update vendor_order_resolutions_control set enabled=false');
 assert.deepEqual(await service.requestResolution(id,second,owner),{caseId:second});
 assert.equal((await readResolutions(ownerApi,id)).writesEnabled,false);
 assert.equal(await baseline(),before);assert.equal(f.calls.filter(c=>c.method==='POST').length,postCount);
 checks.push('paused resolution control retains participant history and exact request recovery without new Stripe POSTs, stock changes or paid/hold/history rewrites');
 const origin='http://127.0.0.1:24840';let runtimeCalls=0;
 const handler=resolutionHandler({origin:()=>origin,authenticate:async()=>buyer,enabled:()=>true,admin:()=>{runtimeCalls++;return admin;},refundService:()=>service});
 const forged=await handler(new Request(origin+'/api/vendor-orders/resolutions',{method:'POST',headers:{origin},body:JSON.stringify({action:'agree',orderId:id,caseId:second,requestId:randomUUID(),expectedSequence:1,termsHash:c.termsHash,actor:owner})}));
 assert.equal(forged.status,400);assert.equal(runtimeCalls,0);
 checks.push('application handler rejects caller-selected actors before privileged construction');
 await db.query('update vendor_order_refunds_control set enabled=false');
 assert.equal(refund.status,'failed');
}
