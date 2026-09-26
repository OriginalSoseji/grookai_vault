import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {refundFixture} from './vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {readVerifiedCheckoutEvidence,requireVerifiedCheckoutRefundInventory} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';

export async function proveOrderRefundCommands({db,admin,anon,ownerApi,buyerApi,owner,buyer,other,binding,provider,race,checks}){
 const id=(await db.query(`select o.id from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id
  where o.paid and cardinality(o.review_reasons)=0 and r.state='consumed' order by o.id limit 1`)).rows[0]?.id;
 assert.ok(id);const b=await binding(id),source=provider(b),f=refundFixture();
 for(const key of ['order','config','platform','account','session','lines','intent','charge','now','balance','platformBalance'])f[key]=source[key];
 const clock=()=>Math.floor(Date.now()/1000),service=createOrderRefundService(admin,f.stripe,f.config,{enabled:true,now:clock});
 const command={orderId:id,requestId:randomUUID(),amountMinor:100,reason:'requested_by_customer'};
 const snapshot=async()=>JSON.stringify((await db.query('select o.*,r.state stock_state from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id where o.id=$1',[id])).rows);
 const before=await snapshot();
 const proof=async()=>{f.now=clock();const e=await readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,clock);return {e,inventory:requireVerifiedCheckoutRefundInventory(e,f.order,f.config.scope,clock())};};
 const status=async client=>{const r=await client.rpc('vendor_order_refund_status_v1',{p_order_id:id});assert.equal(r.error,null,r.error?.message);return r.data;};
 assert.equal((await status(ownerApi)).canRequest,false);
 await assert.rejects(service.create(command,owner),/order_refunds_disabled/);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
 for(const client of [anon,ownerApi,buyerApi]){
  for(const table of ['vendor_order_refund_requests','vendor_order_refund_observations','vendor_order_refunds_control'])assert.ok((await client.from(table).select('*')).error);
  assert.ok((await client.rpc('vendor_order_refund_context_v1',{p_order_id:id,p_actor_id:owner})).error);
 }
 assert.ok((await anon.rpc('vendor_order_refund_status_v1',{p_order_id:id})).error);
 assert.ok((await admin.from('vendor_order_refund_requests').insert({})).error);
 assert.ok((await admin.from('vendor_order_refunds_control').update({enabled:true}).eq('singleton',true)).error);
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select vendor_order_refund_status_v1($1) value',[id])).rows[0].value,null);await db.query('rollback');
 for(const actor of [buyer,other])await assert.rejects(service.create(command,actor),/order_refund_unavailable/);
 checks.push('refund table/client RPC isolation, real owner/buyer retained projection, foreign read denial, default-off issuance and service-role table-write denial');
 await db.query('update vendor_order_refunds_control set enabled=true');
 const prepare='select to_jsonb(vendor_order_refund_prepare_v1($1,$2,$3,$4,$5,$6,$7,$8,$9)) value';
 let p=await proof();const token=randomUUID(),args=[id,owner,command.requestId,100,command.reason,token,b.revision,p.e,p.inventory];
 for(const [key,value] of [['complete',null],['succeededMinor',null],['reviewReasons',[null]],['rows',[null]]]){
  await assert.rejects(db.query(prepare,[...args.slice(0,8),{...p.inventory,[key]:value}]),/order_refund_|cannot extract/);
 }
 const [first]=await race(prepare,args,prepare,[id,owner,randomUUID(),100,command.reason,randomUUID(),b.revision,p.e,p.inventory],{error:/order_refund_unresolved_request/});
 const saved=first.rows[0].value;assert.equal(saved.id,command.requestId);
 await db.query('update vendor_order_fulfillment_control set enabled=true');
 await assert.rejects(db.query('select vendor_order_fulfillment_record_v1($1,$2,$3,0,$4)',[id,owner,randomUUID(),'ready_pickup']),/order_fulfillment_payment_unresolved/);
 await assert.rejects(db.query('update vendor_order_refund_requests set amount_minor=1 where id=$1',[saved.id]),/order_refund_request_immutable/);
 await assert.rejects(db.query('delete from vendor_order_refund_requests where id=$1',[saved.id]),/order_refund_history_retained/);
 assert.equal((await status(ownerApi)).uncertain,true);
 checks.push('actual concurrent refund commands serialize under the order lock, unresolved amount blocks a new key and fulfillment, malformed evidence fails, immutable requests retain history');
 const row=f.addRefund(command.requestId,100);p=await proof();
 const bindArgs={p_order_id:id,p_request_id:saved.id,p_token:token,p_fence:saved.lease_fence,p_refund_id:row.id,p_revision:b.revision,p_evidence:p.e,p_inventory:p.inventory};
 assert.match((await admin.rpc('vendor_order_refund_bind_v1',{...bindArgs,p_token:randomUUID()})).error?.message??'',/order_refund_lease_lost/);
 let result=await admin.rpc('vendor_order_refund_bind_v1',bindArgs);assert.equal(result.error,null,result.error?.message);assert.equal(result.data.status,'succeeded');
 const second={...command,requestId:randomUUID(),amountMinor:200};
 assert.equal((await service.create(second,owner)).status,'succeeded');
 assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
 assert.equal((await service.create(second,owner)).status,'succeeded');assert.equal(f.calls.filter(c=>c.method==='POST').length,1);
 await assert.rejects(service.create({...second,amountMinor:201},owner),/order_refund_request_conflict/);
 const dto=await status(buyerApi);assert.equal(dto.succeededMinor,300);assert.equal(dto.canRequest,false);
 assert.doesNotMatch(JSON.stringify(dto),/acct_|pi_|ch_|lease_token|lease_fence|actor_id/);
 assert.equal(await snapshot(),before);
 await assert.rejects(db.query('delete from vendor_order_refund_observations where order_id=$1',[id]),/order_refund_history_retained/);
 checks.push('real SDK intercepted refund POST follows durable SQL command, scoped current inventory binds with a fence, exact retry is GET-only, buyer totals are retained without provider identities or stock mutation');
 const uncertain={...command,requestId:randomUUID(),amountMinor:50};f.postMode='absent';
 await assert.rejects(service.create(uncertain,owner),/order_refund_provider_uncertain/);
 const posts=f.calls.filter(c=>c.method==='POST').length;
 // Fixture-only age setup, retaining command identity and normal enforcement for
 // all assertions. The fixed dedicated DB and reserved synthetic ID are required.
 await db.query('begin');await db.query('set local session_replication_role=replica');
 await db.query("update vendor_order_refund_requests set creation_started_at=clock_timestamp()-interval '24 hours',lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[uncertain.requestId]);
 await db.query('set local session_replication_role=origin');await db.query('commit');
 await assert.rejects(service.create(uncertain,owner),/order_refund_recovery_required/);
 assert.equal((await service.refresh(id,uncertain.requestId,owner)).status,'unbound');
 assert.equal(f.calls.filter(c=>c.method==='POST').length,posts);
 f.refundStatus='pending';f.now=clock();f.addRefund(uncertain.requestId,50);
 await db.query('update vendor_order_refunds_control set enabled=false');
 assert.equal((await service.refresh(id,uncertain.requestId,owner)).status,'pending');
 assert.equal((await status(buyerApi)).pendingMinor,50);
 f.refunds.data.at(-1).status='failed';
 assert.equal((await service.refresh(id,uncertain.requestId,owner)).status,'failed');
 assert.equal((await status(buyerApi)).pendingMinor,0);
 assert.equal(f.calls.filter(c=>c.method==='POST').length,posts);assert.equal(await snapshot(),before);
 checks.push('actual expired creation window never reissues on absence; later scoped provider match recovers while issuance disabled, pending-to-failed refresh preserves paid stock and separates buyer totals');
 assert.equal((await service.refresh(id,second.requestId,owner)).status,'succeeded');assert.equal((await status(ownerApi)).canRequest,false);
 await db.query('update vendor_order_fulfillment_control set enabled=false');
 checks.push('refund receipt refresh and buyer history survive issuance pause and existing package/publication downgrade');
}
