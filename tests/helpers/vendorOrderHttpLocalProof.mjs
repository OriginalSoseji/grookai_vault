import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {creationFixture} from './vendorCheckoutCreationFixture.mjs';
import {createVendorOrderHandlers} from '../../apps/web/src/lib/payments/vendorOrderHttp.ts';
import {createOrderHttpRuntime} from '../../apps/web/src/lib/payments/vendorOrderRuntimeService.ts';

// Called only inside the fixed 200xx guarded fixture. All generated IDs are owned
// by its existing cleanup. Real Auth, PostgREST and SQL; synthetic Stripe transport.
export async function proveOrderHttp({db,admin,buyerApi,ownerApi,create,copy,buyer,owner,ids,signalIds,checks,binding,registry,multi}) {
  const x=await create(copy),origin='http://127.0.0.1:20040',token=randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','');
  // Inspect the first preparation in a rollback transaction; the real HTTP
  // operation must acquire its own persisted lease with its own random token.
  await db.query('begin');
  const p=(await db.query('select vendor_order_checkout_prepare_v1($1,$2,$3) as p',[x.o.id,buyer,randomUUID()])).rows[0].p;
  await db.query('rollback');
  const f=creationFixture(p);f.now=Math.floor(Date.now()/1000);
  const runtime=createOrderHttpRuntime(admin,f.stripe,f.config,true);
  let client=ownerApi;
  const handlers=createVendorOrderHandlers({authenticate:async()=>{const {data,error}=await client.auth.getUser();return error?null:data.user?.id??null;},origin:()=>origin,runtime:()=>runtime,reconcileToken:()=>token});
  const request=(lane,body,headers={})=>new Request(origin+'/api/vendor-orders/'+lane,{method:'POST',headers,body:typeof body==='string'?body:JSON.stringify(body)});
  const start=()=>handlers.checkout(request('checkout',{orderId:x.o.id},{origin}));
  assert.equal((await start()).status,503);assert.equal(f.calls.length,0); // seller cannot impersonate buyer
  client=buyerApi;
  const event=f.event();event.id='evt_'+randomUUID().replaceAll('-','');event.created=Math.floor(Date.now()/1000);event.data.object.metadata={grookai_order_id:randomUUID()};signalIds.push(event.id);
  const payload=JSON.stringify(event),signature=f.stripe.webhooks.generateTestHeaderString({payload,secret:f.config.webhookSecret,timestamp:event.created});
  const signal=()=>handlers.webhook(request('webhook',payload,{'stripe-signature':signature}));
  assert.equal((await signal()).status,200);assert.equal(f.calls.length,0);assert.equal(await binding(x.o.id),null);
  const response=await start();assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).url,f.session.url);
  assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal((await start()).status,200);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  checks.push('HTTP checkout uses actual buyer Auth; seller denied before provider, immutable session creation and resume produce one synthetic POST');
  const before=f.calls.length;await Promise.all([signal(),signal()]).then(rs=>rs.forEach(r=>assert.equal(r.status,200)));
  assert.equal(f.calls.length,before);assert.equal((await db.query('select count(*) n from vendor_order_signals where event_id=$1',[event.id])).rows[0].n,'1');
  assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:x.o.id})).data.paid,false);
  const bad=await handlers.webhook(request('webhook',payload+' ',{'stripe-signature':signature}));assert.equal(bad.status,400);
  checks.push('signed pre-bind and concurrent duplicate HTTP notifications retain one scoped signal, ignore forged order metadata, and cannot mark payment paid');
  const reconcile=()=>handlers.reconcile(request('reconcile',{orderId:x.o.id},{authorization:`Bearer ${token}`}));
  assert.equal((await handlers.reconcile(request('reconcile',{orderId:x.o.id}))).status,401);assert.equal(f.calls.length,before);
  // Turn off acquisition and revoke package/publication while retaining orders.
  await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
  await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);
  assert.equal((await start()).status,503);assert.equal(f.calls.length,before);
  f.session.status='complete';f.session.payment_status='paid';f.session.payment_intent=f.intent.id;
  f.fail='/v1/account';assert.equal((await reconcile()).status,503);assert.equal((await buyerApi.rpc('vendor_order_status_v1',{p_order_id:x.o.id})).data.paid,false);f.fail=null;
  assert.equal((await reconcile()).status,200);assert.equal((await reconcile()).status,200);
  const saved=(await buyerApi.rpc('vendor_order_status_v1',{p_order_id:x.o.id})).data;assert.equal(saved.paid,true);assert.equal(saved.stockState,'consumed');
  assert.ok((await db.query('select archived_at from vault_item_instances where id=$1',[copy])).rows[0].archived_at);
  assert.equal((await db.query("select count(*) n from vendor_order_observations where order_id=$1 and applied_action='consume'",[x.o.id])).rows[0].n,'1');
  assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
  checks.push('operator-only HTTP retry rejects provider failure, then verifies and consumes once with packages/publication/acquisition off; no new Stripe mutation');
  registry.set(f.session.id,f);
  const sweep=createOrderHttpRuntime(admin,multi,f.config);
  const pageHandlers=createVendorOrderHandlers({authenticate:async()=>null,origin:()=>origin,runtime:()=>sweep,reconcileToken:()=>token});
  let after;const succeeded=[];
  do {const r=await pageHandlers.reconcile(request('reconcile',{...(after?{after}:{}),limit:2},{authorization:`Bearer ${token}`}));assert.equal(r.status,200,await r.clone().text());const body=await r.json();assert.deepEqual(body.failed,[]);succeeded.push(...body.succeeded);after=body.next;} while(after);
  assert.ok(succeeded.includes(x.o.id));assert.equal(new Set(succeeded).size,succeeded.length);
  checks.push('authenticated bounded HTTP sweep follows exact cursor across retained bindings after downgrade and reports completion without skipping IDs');
}
