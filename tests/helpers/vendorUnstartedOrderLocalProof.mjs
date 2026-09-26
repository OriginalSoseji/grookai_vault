import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {cancellationService,cancellationHandler} from '../../apps/web/src/lib/orders/orderCancellation.ts';
export async function proveUnstartedCancellation({db,admin,anon,buyerApi,ownerApi,buyer,owner,other,ids,copies,create,race,checks}) {
 const first=await create(copies[16]),cancelSql='select public.vendor_order_cancel_unstarted_v1($1,$2) as value',claimSql='select public.vendor_order_checkout_prepare_v1($1,$2,$3)';
 for(const client of [anon,buyerApi,ownerApi]){
  assert.match((await client.rpc('vendor_order_cancel_unstarted_v1',{p_order_id:first.o.id,p_buyer_id:buyer})).error?.message??'',/permission denied/);
  assert.ok((await client.from('vendor_order_cancellations').select('*')).error);
 }
 for(const op of ['insert','update','delete']){const q=admin.from('vendor_order_cancellations');const result=op==='insert'?await q.insert({order_id:first.o.id}):op==='update'?await q.update({reason:'forged'}).eq('order_id',first.o.id):await q.delete().eq('order_id',first.o.id);assert.ok(result.error);}
 const status=client=>client.rpc('vendor_order_cancellation_status_v1',{p_order_id:first.o.id});
 assert.deepEqual((await status(buyerApi)).data,{canCancel:true,canceledAt:null});assert.deepEqual((await status(ownerApi)).data,{canCancel:false,canceledAt:null});assert.ok((await status(anon)).error);
 await assert.rejects(db.query(cancelSql,[first.o.id,other]),/order_cancellation_unavailable/);
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);assert.equal((await db.query('select vendor_order_cancellation_status_v1($1) value',[first.o.id])).rows[0].value,null);await db.query('rollback');
 let client=ownerApi;const origin='http://127.0.0.1:21240',handler=cancellationHandler({origin:()=>origin,authenticate:async()=>{const r=await client.auth.getUser();return r.data.user?.id??null;},service:()=>cancellationService(admin)});
 const post=()=>handler(new Request(origin+'/api/vendor-orders/cancel',{method:'POST',headers:{origin},body:JSON.stringify({orderId:first.o.id})}));
 assert.equal((await post()).status,503);client=buyerApi;
 const responses=await Promise.all([post(),post()]);for(const r of responses)assert.equal(r.status,200,await r.clone().text());
 assert.deepEqual(await responses[0].json(),await responses[1].json());
 assert.equal((await db.query('select count(*) n from vendor_order_cancellations where order_id=$1',[first.o.id])).rows[0].n,'1');
 assert.equal((await db.query('select state,release_reason from vendor_stock_reservations where id=$1',[first.r.id])).rows[0].release_reason,'order_canceled_unstarted');
 assert.equal((await db.query('select count(*) n from vendor_order_observations where order_id=$1',[first.o.id])).rows[0].n,'0');
 assert.equal((await db.query('select paid from vendor_orders where id=$1',[first.o.id])).rows[0].paid,false);
 assert.equal((await db.query('select archived_at from vault_item_instances where id=$1',[copies[16]])).rows[0].archived_at,null);
 for(const query of ['update vendor_order_cancellations set canceled_at=now() where order_id=$1','delete from vendor_order_cancellations where order_id=$1'])await assert.rejects(db.query(query,[first.o.id]),/order_cancellation_retained/);
 const replacement=await create(copies[16]);await db.query(cancelSql,[replacement.o.id,buyer]);
 checks.push('actual buyer Auth/participant status and service-only ACLs; seller/foreign/anonymous denied; concurrent cancellation retains one immutable receipt, releases copy without fake payment/refund/observation and permits a new hold');
 const cancelWins=await create(copies[17]);
 await race(cancelSql,[cancelWins.o.id,buyer],claimSql,[cancelWins.o.id,buyer,randomUUID()],{error:/order_checkout_unavailable/});
 assert.equal((await db.query('select creation_started_at from vendor_order_attempts where order_id=$1',[cancelWins.o.id])).rows[0].creation_started_at,null);
 const claimWins=await create(copies[18]);
 await race(claimSql,[claimWins.o.id,buyer,randomUUID()],cancelSql,[claimWins.o.id,buyer],{error:/order_checkout_started/});
 await db.query("update vendor_order_attempts set lease_expires_at=clock_timestamp()-interval '1 second' where order_id=$1",[claimWins.o.id]);
 await assert.rejects(db.query(cancelSql,[claimWins.o.id,buyer]),/order_checkout_started/);
 assert.equal((await db.query('select state from vendor_stock_reservations where id=$1',[claimWins.r.id])).rows[0].state,'payment_pending');
 assert.equal((await db.query('select count(*) n from vendor_order_cancellations where order_id=$1',[claimWins.o.id])).rows[0].n,'0');
 checks.push('real overlapping locks prove both cancellation/checkout-creation commit orders; creation winner keeps stock even with missing session and expired lease');
 const guarded=await create(copies[19]);
 for(const statement of ["update vendor_orders set paid=true where id=$1","update vendor_orders set review_reasons=array['manual_review'] where id=$1"]){await db.query('begin');await db.query(statement,[guarded.o.id]);await assert.rejects(db.query(cancelSql,[guarded.o.id,buyer]),/order_cancellation_unavailable/);await db.query('rollback');}
 await assert.rejects(db.query("update vendor_stock_reservations set state='released',released_at=now(),release_reason='order_canceled_unstarted' where id=$1",[guarded.r.id]),/stock_reservation_immutable/);
 await db.query('begin isolation level repeatable read');await assert.rejects(db.query(cancelSql,[guarded.o.id,buyer]),/stock_requires_read_committed/);await db.query('rollback');
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=false where id=$1',[ids.store]);
 const closed=(await db.query(cancelSql,[guarded.o.id,buyer])).rows[0].value;assert.equal(closed.state,'canceled');assert.deepEqual((await db.query(cancelSql,[guarded.o.id,buyer])).rows[0].value,closed);
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 checks.push('paid/review/higher-isolation and forged stock release fail closed; cancellation and retry survive acquisition shutdown, downgrade and unpublication');
 // Replenish this synthetic custom fixture after earlier settlement consumed it.
 // Cancellation must only remove its claim, never decrement or add stock units.
 await db.query('update vendor_store_custom_products set available_quantity=2,published=true,version=version+1 where id=$1',[ids.product]);
 const custom=await create(null,{quantity:2,product:ids.product});await db.query(cancelSql,[custom.o.id,buyer]);
 assert.equal((await db.query('select available_quantity from vendor_store_custom_products where id=$1',[ids.product])).rows[0].available_quantity,2);
 const fresh=randomUUID(),reserve=await admin.rpc('vendor_stock_reserve_v1',{p_id:fresh,p_buyer_id:other,p_store_id:ids.store,p_instance_id:null,p_product_id:ids.product,p_quantity:2});assert.equal(reserve.error,null,reserve.error?.message);
 assert.equal((await admin.rpc('vendor_stock_release_v1',{p_id:fresh,p_buyer_id:other})).error,null);
 checks.push('custom cancellation releases precisely two claimed units without changing available quantity; another buyer can reserve those units');
}
