import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {creationFixture} from './vendorCheckoutCreationFixture.mjs';
import {createOrderHttpRuntime} from '../../apps/web/src/lib/payments/vendorOrderRuntimeService.ts';
import {createVendorOrderHandlers} from '../../apps/web/src/lib/payments/vendorOrderHttp.ts';
import {createCheckoutRepository,createVendorCheckoutService} from '../../apps/web/src/lib/payments/vendorCheckoutCreation.ts';
export async function proveCheckoutDiscovery({db,admin,anon,buyerApi,buyer,owner,ids,copies,create,checks,binding,registry}) {
 const fixtures=[];
 for(const copy of copies.slice(20,24)){
  const x=await create(copy),token=randomUUID();
  assert.equal((await admin.rpc('vendor_order_checkout_prepare_v1',{p_order_id:x.o.id,p_buyer_id:buyer,p_token:token})).error,null);
  // Fixed synthetic fixture only. Production timestamps remain immutable. Move
  // the fixture into the closed creation window without waiting a real day.
  await db.query('begin');await db.query('set local session_replication_role=replica');
  await db.query("update vendor_orders set created_at=clock_timestamp()-interval '25 hours' where id=$1",[x.o.id]);
  await db.query("update vendor_order_attempts set creation_started_at=clock_timestamp()-interval '24 hours',lease_expires_at=clock_timestamp()-interval '1 second' where order_id=$1",[x.o.id]);
  await db.query('commit');
  const p=await admin.rpc('vendor_order_checkout_recovery_v1',{p_order_id:x.o.id,p_token:token});assert.equal(p.error,null);
  const f=creationFixture(p.data);f.now=Math.floor(Date.now()/1000);
  const repo=createCheckoutRepository(admin,f.stripe,f.config),service=createVendorCheckoutService({repo,stripe:f.stripe,config:f.config,token:()=>token});
  fixtures.push({x,token,f,repo,service});
 }
 const features=(await db.query('select features from user_entitlements where user_id=$1',[owner])).rows[0].features;
 try{
  await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
  await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);
  const first=fixtures[0];
  for(const client of [anon,buyerApi])assert.match((await client.rpc('vendor_order_checkout_recovery_v1',{p_order_id:first.x.o.id,p_token:randomUUID()})).error?.message??'',/permission denied/);
  assert.match((await admin.rpc('vendor_order_checkout_recovery_v1',{p_order_id:first.x.o.id,p_token:randomUUID()})).error?.message??'',/order_claim_busy/);
  assert.deepEqual(await first.service.discover(first.x.o.id),{orderId:first.x.o.id,state:'reconciled'});
  assert.equal((await binding(first.x.o.id)).stockState,'payment_pending');
  assert.equal((await binding(first.x.o.id)).sessionId,first.f.session.id);
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:first.x.o.id})).data.paid,false);
  checks.push('closed-window discovery uses actual service-only recovery fence and GET verification after downgrade/unpublication/acquisition shutdown; buyer/anon and concurrent fence denied');
  // The operator HTTP path retries the retained binding without re-listing it.
  first.f.session.status='complete';first.f.session.payment_status='paid';first.f.session.payment_intent=first.f.intent.id;
  const runtime=createOrderHttpRuntime(admin,first.f.stripe,first.f.config),operator='cd'.repeat(32);
  const h=createVendorOrderHandlers({authenticate:async()=>buyer,origin:()=> 'http://127.0.0.1:21240',runtime:()=>runtime,reconcileToken:()=>operator});
  const post=headers=>h.reconcile(new Request('http://127.0.0.1:21240/api/vendor-orders/reconcile',{method:'POST',headers,body:JSON.stringify({discoverOrderId:first.x.o.id})}));
  assert.equal((await post({cookie:'buyer'})).status,401);
  const before=first.f.calls.filter(c=>c.path==='/v1/checkout/sessions').length;
  const r=await post({authorization:`Bearer ${operator}`});assert.equal(r.status,200,await r.clone().text());
  assert.equal(first.f.calls.filter(c=>c.path==='/v1/checkout/sessions').length,before);
  assert.equal((await binding(first.x.o.id)).stockState,'consumed');
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:first.x.o.id})).data.paid,true);
  checks.push('operator-only discovery retry reconciles retained binding with current synthetic capture evidence; one durable attempt and no provider POST');
  const missing=fixtures[1];missing.f.discoveryPages={first:{object:'list',url:'/v1/checkout/sessions',has_more:false,data:[]}};
  assert.equal((await missing.service.discover(missing.x.o.id)).reason,'not_found');assert.equal(await binding(missing.x.o.id),null);
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:missing.x.o.id})).data.stockState,'payment_pending');
  assert.match((await admin.rpc('vendor_order_cancel_unstarted_v1',{p_order_id:missing.x.o.id,p_buyer_id:buyer})).error?.message??'',/order_checkout_started/);
  const duplicate=fixtures[2];duplicate.f.discoveryPages={first:{object:'list',url:'/v1/checkout/sessions',has_more:false,data:[duplicate.f.session,{...duplicate.f.session,id:'cs_test_duplicate'}]}};
  assert.equal((await duplicate.service.discover(duplicate.x.o.id)).reason,'conflicting_sessions');assert.equal(await binding(duplicate.x.o.id),null);
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:duplicate.x.o.id})).data.stockState,'payment_pending');
  checks.push('missing and duplicate discovered sessions retain actual unbound stock with no observation or cancellation; elapsed time never releases');
  const expired=fixtures[3];expired.f.session.status='expired';expired.f.session.payment_status='unpaid';
  await expired.service.discover(expired.x.o.id);assert.equal((await binding(expired.x.o.id)).stockState,'released');
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:expired.x.o.id})).data.paid,false);
  checks.push('only freshly verified terminal-unpaid provider fixture releases discovered stock through the existing order ledger');
  // The following legacy HTTP sweep must also know the newly bound SDK fixtures.
  registry.set(first.f.session.id,first.f);registry.set(expired.f.session.id,expired.f);
  for(const {x,f} of fixtures){assert.ok(f.calls.every(c=>c.method==='GET'));assert.equal((await db.query('select count(*) n from vendor_order_attempts where order_id=$1',[x.o.id])).rows[0].n,'1');}
 }finally{
  await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
  await db.query('update user_entitlements set features=$2 where user_id=$1',[owner,features]);await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 }
}
