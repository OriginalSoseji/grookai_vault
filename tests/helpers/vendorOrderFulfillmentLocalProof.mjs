import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFulfillment, fulfillmentService, fulfillmentHandler } from '../../apps/web/src/lib/orders/orderFulfillment.ts';

export async function proveOrderFulfillment({notifications=false,db,admin,anon,buyerApi,ownerApi,owner,buyer,other,ids,copies,create,bind,binding,provider,observe,applyParams,applySql,race,checks}) {
 const pickup=(await db.query("select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id where o.paid and cardinality(o.review_reasons)=0 and r.state='consumed' and o.fulfillment='pickup'"+(notifications?" and not public.vendor_order_notification_pending_v1(o.id)":"")+" limit 1")).rows[0].id;
 const statement='select vendor_order_fulfillment_record_v1($1,$2,$3,$4,$5,$6,$7) value';
 const args=(order,sequence,action,carrier=null,tracking=null,request=randomUUID(),actor=owner)=>[order,actor,request,sequence,action,carrier,tracking];
 const record=async params=>(await db.query(statement,params)).rows[0].value;
 const initial=await readFulfillment(ownerApi,pickup);assert.equal(initial.state,'unfulfilled');assert.equal(initial.canManage,false);
 const request=args(pickup,0,'ready_pickup');
 await assert.rejects(record(request),/order_fulfillment_disabled/);
 await db.query('begin');await db.query('delete from vendor_order_fulfillment_control');await assert.rejects(record(request),/order_fulfillment_disabled/);await db.query('rollback');
 for(const client of [anon,buyerApi,ownerApi]) {
  assert.ok((await client.rpc('vendor_order_fulfillment_record_v1',{p_order_id:pickup,p_actor_id:owner,p_request_id:randomUUID(),p_expected_sequence:0,p_action:'ready_pickup'})).error);
  for(const table of ['vendor_order_fulfillment_events','vendor_order_fulfillment_control'])assert.ok((await client.from(table).select('*')).error);
 }
 assert.ok((await admin.from('vendor_order_fulfillment_events').insert({})).error);
 assert.ok((await admin.from('vendor_order_fulfillment_control').update({enabled:true}).eq('singleton',true)).error);
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select vendor_order_fulfillment_status_v1($1) value',[pickup])).rows[0].value,null);await db.query('rollback');
 checks.push('fulfillment defaults off, missing control fails closed, base-table/client mutation denied, and foreign participant reads return no data');
 await db.query('update vendor_order_fulfillment_control set enabled=true');
 for(const actor of [buyer,other])await assert.rejects(record(args(pickup,0,'ready_pickup',null,null,randomUUID(),actor)),/order_fulfillment_unavailable/);
 for(const [action,carrier,tracking] of [['collect',null,null],['ship','ups','12345'],['ready_pickup','ups','12345']])await assert.rejects(record(args(pickup,0,action,carrier,tracking)),/order_fulfillment_conflict|order_fulfillment_invalid/);
 const blocked=(await db.query("select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id where not o.paid or cardinality(o.review_reasons)>0 or r.state<>'consumed'")).rows;
 for(const row of blocked)await assert.rejects(record(args(row.id,0,'ready_pickup')),/order_fulfillment_payment_unresolved/);
 const financial=async()=>JSON.stringify((await db.query('select o.*,r.state stock_state from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id order by o.id')).rows);
 const before=await financial(),holds=(await db.query('select count(*) n from vendor_account_financial_holds')).rows[0].n;
 const [a,b]=await race(statement,request,statement,request);assert.deepEqual(a.rows[0].value,b.rows[0].value);
 assert.equal((await readFulfillment(ownerApi,pickup)).state,'ready_pickup');assert.equal((await readFulfillment(buyerApi,pickup)).canManage,false);
 const collect=args(pickup,1,'collect');await race(statement,collect,statement,args(pickup,1,'collect'),{error:/order_fulfillment_conflict/});
 assert.deepEqual(await record(request),a.rows[0].value);
 assert.equal((await readFulfillment(buyerApi,pickup)).state,'collected');
 await assert.rejects(record(args(pickup,0,'ready_pickup',null,null,request[2],buyer)),/order_fulfillment_unavailable/);
 assert.equal(await financial(),before);assert.equal((await db.query('select count(*) n from vendor_account_financial_holds')).rows[0].n,holds);
 checks.push('paid pickup lifecycle after downgrade/unpublication; exact concurrent retries append once, stale competing updates fail, buyers cannot manage, payment/stock/holds remain unchanged');

 // Create a shipping-mode order through the existing governed order creator and
 // actual settlement adapter, with synthetic provider evidence and zero fees/tax.
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update public_profiles set public_profile_enabled=true,vault_sharing_enabled=true where user_id=$1',[owner]);
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 const shipping=await create(copies[25],{fulfillment:'shipping'}),bound=await bind(shipping),f=provider(bound);
 await db.query(applySql,applyParams(bound,await observe(f)));
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
 await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);
 const shippingId=shipping.o.id,shippingBefore=await financial(),service=fulfillmentService(admin);
 const http=actor=>fulfillmentHandler({origin:()=> 'http://127.0.0.1:22440',authenticate:async()=>actor,service:()=>service});
 const command={orderId:shippingId,requestId:randomUUID(),expectedSequence:0,action:'ship',carrier:'ups',tracking:'1Z SYNTHETIC 001'};
 const post=(actor,body)=>http(actor)(new Request('http://127.0.0.1:22440/api/vendor-orders/fulfillment',{method:'POST',headers:{origin:'http://127.0.0.1:22440'},body:JSON.stringify(body)}));
 assert.equal((await post(buyer,command)).status,503);assert.equal((await post(other,command)).status,503);assert.equal((await post(owner,{...command,actorId:owner})).status,400);
 for(const tracking of ['https://example.invalid','<script>',' x ','a'.repeat(101)])await assert.rejects(record(args(shippingId,0,'ship','ups',tracking)),/order_fulfillment_invalid/);
 const responses=await Promise.all([post(owner,command),post(owner,command)]);for(const r of responses)assert.equal(r.status,200);assert.deepEqual(await responses[0].json(),await responses[1].json());
 for(let seq=1;seq<=22;seq++)await service({...command,requestId:randomUUID(),expectedSequence:seq,action:'update_tracking',tracking:`SYNTHETIC ${seq}`},owner);
 const progress=await readFulfillment(buyerApi,shippingId);assert.equal(progress.events.length,20);assert.equal(progress.sequence,23);assert.equal(progress.tracking,'SYNTHETIC 22');assert.equal(progress.events.at(-1).sequence,4);
 const delivery=args(shippingId,23,'deliver');await record(delivery);assert.equal((await readFulfillment(buyerApi,shippingId)).state,'delivered');
 await assert.rejects(record(args(shippingId,24,'update_tracking','ups','SYNTHETIC 23')),/order_fulfillment_conflict/);
 assert.equal(await financial(),shippingBefore);
 await assert.rejects(db.query('update vendor_order_fulfillment_events set tracking=$1 where id=$2',['FAKE',command.requestId]),/order_fulfillment_history_retained/);
 await assert.rejects(db.query('delete from vendor_order_fulfillment_events where id=$1',[command.requestId]),/order_fulfillment_history_retained/);
 checks.push('actual owner service/HTTP records a shipping order, immutable tracking corrections and delivery; bounded buyer timeline; forged identities, unsafe tracking and terminal edits denied without financial mutation');
 // Existing order lock serializes a fresh review observation against a seller
 // command. Retained completed receipts stay readable; no review hold is erased.
 const current=await binding(shippingId),review=provider(current);review.charge.disputed=true;
 await race(applySql,applyParams(current,await observe(review)),statement,args(shippingId,24,'update_tracking','ups','SYNTHETIC BLOCKED'),{error:/order_fulfillment_payment_unresolved/});
 assert.equal((await readFulfillment(ownerApi,shippingId)).canManage,false);
 await db.query('update vendor_order_fulfillment_control set enabled=false');
 assert.deepEqual(await record(delivery),(await db.query(statement,delivery)).rows[0].value);
 assert.equal((await readFulfillment(buyerApi,shippingId)).state,'delivered');
 checks.push('payment-review contention blocks new fulfillment, while exact receipt recovery and participant history survive review and pause');
}
