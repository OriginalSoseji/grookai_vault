import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {acquisitionIds,createAcquisitionRepository,createAcquisitionService} from '../../apps/web/src/lib/orders/orderAcquisitionService.ts';
import {createAcquisitionHandlers} from '../../apps/web/src/lib/orders/orderAcquisitionHttp.ts';

// Existing guarded 200xx fixture owns all IDs and cleanup. No provider calls.
export async function proveOrderAcquisition({db,admin,buyerApi,ownerApi,buyer,owner,other,ids,copies,orderIds,checks}) {
 const repo=createAcquisitionRepository(admin),config={secret:'a'.repeat(64),platformAccountId:'acct_stockPlatform'};
 const service=createAcquisitionService(repo,config),origin='http://127.0.0.1:20040';let client=buyerApi;
 const handler=createAcquisitionHandlers({authenticate:async()=>{const r=await client.auth.getUser();return r.data.user?.id??null;},origin:()=>origin,service:()=>service});
 const post=body=>handler(new Request(origin+'/api/vendor-orders/acquire',{method:'POST',headers:{origin},body:JSON.stringify(body)}));
 const selection=n=>({storeId:ids.store,itemId:copies[n],kind:'copy',quantity:1,requestId:randomUUID()});
 const quote=async s=>{orderIds.push(acquisitionIds(buyer,s.requestId).order);const r=await post({action:'quote',...s});assert.equal(r.status,200,await r.clone().text());return r.json();};
 const first=selection(10),q=await quote(first),stable=acquisitionIds(buyer,first.requestId);
 assert.equal(q.totalAmountMinor,2500);assert.equal(q.state,'quoted');
 assert.equal((await db.query('select count(*) n from vendor_orders where id=$1',[stable.order])).rows[0].n,'0');
 assert.equal((await quote(first)).expiresAt,q.expiresAt);
 client=ownerApi;assert.equal((await post({action:'confirm',token:q.token})).status,400);client=buyerApi;
 const confirmed=await Promise.all([post({action:'confirm',token:q.token}),post({action:'confirm',token:q.token})]);
 for(const r of confirmed){assert.equal(r.status,200,await r.clone().text());assert.deepEqual(await r.json(),{state:'ordered',orderId:stable.order});}
 assert.equal((await db.query('select count(*) n from vendor_order_attempts where order_id=$1',[stable.order])).rows[0].n,'1');
 assert.equal((await quote(first)).orderId,stable.order);
 assert.equal((await post({action:'cancel',token:q.token})).status,200);
 assert.equal((await db.query('select state from vendor_stock_reservations where id=$1',[stable.reservation])).rows[0].state,'payment_pending');
 checks.push('acquisition actual Auth: private server-priced quote, no order before confirmation, stable deadline, foreign token denial and concurrent confirmation create one order/attempt');
 const canceled=selection(11),cq=await quote(canceled);
 assert.equal((await post({action:'cancel',token:cq.token})).status,200);
 assert.equal((await post({action:'confirm',token:cq.token})).status,409);
 const racing=selection(12),rq=await quote(racing),rid=acquisitionIds(buyer,racing.requestId);
 await Promise.all([post({action:'confirm',token:rq.token}),post({action:'cancel',token:rq.token})]);
 const result=(await db.query('select r.state,o.id from vendor_stock_reservations r left join vendor_orders o on o.reservation_id=r.id where r.id=$1',[rid.reservation])).rows[0];
 assert.ok(result.state==='released'&&result.id===null||result.state==='payment_pending'&&result.id===rid.order);
 checks.push('held cancellation cannot be resurrected; concurrent confirm/cancel leaves either released stock without order or one durable pending order');
 const selected=selection(13),sq=await quote(selected);
 for(const [label,apply,undo,args] of [
  ['privacy','update public_profiles set vault_sharing_enabled=false where user_id=$1','update public_profiles set vault_sharing_enabled=true where user_id=$1',[owner]],
  ['selection','delete from vendor_store_items where store_id=$1 and instance_id=$2','insert into vendor_store_items(store_id,instance_id) values($1,$2)',[ids.store,copies[13]]],
  ['publication','update vendor_stores set web_published=false where id=$1','update vendor_stores set web_published=true where id=$1',[ids.store]],
 ]){
  await db.query(apply,args);try{assert.notEqual((await post({action:'confirm',token:sq.token})).status,200);assert.equal((await db.query('select count(*) n from vendor_orders where id=$1',[acquisitionIds(buyer,selected.requestId).order])).rows[0].n,'0');}finally{await db.query(undo,args);}
  checks.push(`confirmation rechecks current ${label} after an otherwise valid quote`);
 }
 await post({action:'cancel',token:sq.token});
 // Expiry uses an injected clock only in this service instance. SQL still owns
 // its independent production expiry check; no immutable fixture rows changed.
 const expired=selection(14),eq=await quote(expired);
 await assert.rejects(createAcquisitionService(repo,config,()=>eq.expiresAt).confirm(buyer,eq.token),/quote_expired/);
 await post({action:'cancel',token:eq.token});
 const compete=selection(15),attempts=await Promise.allSettled([service.quote(buyer,compete),service.quote(other,{...compete,requestId:randomUUID()})]);
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 const winner=attempts[0].status==='fulfilled'?buyer:other,winning=attempts.find(r=>r.status==='fulfilled').value;
 await service.cancel(winner,winning.token);
 checks.push('expired unconfirmed quote denied without order; two authenticated account identities competing for one copy yield one hold');
}
