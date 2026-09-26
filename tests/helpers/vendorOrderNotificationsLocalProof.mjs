import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reconcileVendorOrder} from '../../apps/web/src/lib/payments/vendorOrderService.ts';

export async function proveOrderNotifications({db,admin,anon,ownerApi,buyerApi,owner,ids,copies,create,bind,binding,provider,observe,applyParams,applySql,race,checks,signalIds}) {
 const platform='acct_stockPlatform',connected='acct_stockSeller';
 const scope={p_platform:platform,p_live:false};
 const signalSql='select vendor_order_signal_v1($1,$2,$3,$4,$5,$6,$7) value';
 const event=(resource,kind='checkout',seller=connected,account=platform)=>{
  const id='evt_'+randomUUID().replaceAll('-','');signalIds.push(id);
  return [account,seller,false,id,kind,resource,new Date().toISOString()];
 };
 const rpc=async(name,args={})=>{const r=await admin.rpc(name,{...scope,...args});assert.equal(r.error,null,r.error?.message);return r.data;};
 const pending=async id=>(await db.query('select vendor_order_notification_pending_v1($1) pending',[id])).rows[0].pending;
 const job=async id=>(await db.query('select * from vendor_order_reconcile_jobs where order_id=$1',[id])).rows[0];
 const fulfillSql='select vendor_order_fulfillment_record_v1($1,$2,$3,$4,$5,null,null) value';
 const request=(id,sequence=0,action='ready_pickup')=>[id,owner,randomUUID(),sequence,action];
 const finishArgs=(c,result)=>[platform,false,c.orderId,c.token,c.fence,result];
 const finishSql='select vendor_order_reconcile_finish_v1($1,$2,$3,$4,$5,$6) value';
 const finish=async(c,result='verified')=>(await db.query(finishSql,finishArgs(c,result))).rows[0].value;
 const focus=async id=>{
  await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()+interval '2 days',lease_token=null,lease_expires_at=null");
  await db.query("update vendor_order_reconcile_jobs set next_run_at=clock_timestamp()-interval '1 minute' where order_id=$1",[id]);
 };
 const claim=()=>rpc('vendor_order_reconcile_claim_v1',{p_token:randomUUID()});
 const reconcile=async(id,f)=>{f.now=Math.floor(Date.now()/1000);return reconcileVendorOrder(admin,f.stripe,f.config,id);};
 const financial=async()=>JSON.stringify((await db.query('select o.*,r.state stock_state from vendor_orders o join vendor_stock_reservations r on r.id=o.reservation_id order by o.id')).rows);
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update public_profiles set public_profile_enabled=true,vault_sharing_enabled=true where user_id=$1',[owner]);
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);
 await db.query('update vendor_stores set web_published=true where id=$1',[ids.store]);
 await db.query('update vendor_order_fulfillment_control set enabled=true');
 await db.query('update vendor_order_reconcile_control set enabled=false');

 // Authentic owner/buyer/anonymous tokens cannot enqueue or acknowledge work.
 for(const client of [anon,buyerApi,ownerApi]) {
  assert.ok((await client.from('vendor_order_signal_associations').select('*')).error);
  for(const [name,args] of [['lock',{p_platform:platform,p_live:false}],['associate',{p_platform:platform,p_live:false,p_order:null}],['pending',{p_order:randomUUID()}]])
   assert.ok((await client.rpc('vendor_order_notification_'+name+'_v1',args)).error);
  assert.ok((await client.rpc('vendor_order_signal_v1',{...scope,p_connected:connected,p_event:'evt_forged',p_kind:'checkout',p_resource:'cs_test_forged',p_created:new Date().toISOString()})).error);
 }
 assert.ok((await admin.from('vendor_order_signal_associations').insert({})).error);
 assert.ok((await admin.rpc('vendor_order_notification_associate_v1',{...scope,p_order:null})).error);
 checks.push('notification associations and helper RPCs deny anonymous/owner/buyer and direct service mutation; clients cannot forge event scheduling or acknowledgement');

 const first=await create(copies[26]),id=first.o.id,session='cs_test_'+id.replaceAll('-','');
 const early=event(session);
 assert.equal((await db.query(signalSql,early)).rows[0].value,null);
 assert.equal(await job(id),undefined);
 const bound=await bind(first),f=provider(bound);
 await db.query(applySql,applyParams(bound,await observe(f)));
 assert.equal(await pending(id),true);assert.equal(await job(id),undefined);
 const ready=request(id);
 await assert.rejects(db.query(fulfillSql,ready),/order_fulfillment_payment_unresolved/);
 assert.equal((await ownerApi.rpc('vendor_order_fulfillment_status_v1',{p_order_id:id})).data.canManage,false);
 assert.match((await admin.rpc('vendor_order_reconcile_claim_v1',{...scope,p_token:randomUUID()})).error?.message??'',/order_queue_disabled/);
 checks.push('pre-binding event survives queue pause; later exact session binding immediately holds new fulfillment and participant management before association');

 const initial=await financial(),duplicate=event(session);
 await race(signalSql,duplicate,signalSql,duplicate);
 assert.equal((await job(id)).requested_generation,'2');
 assert.equal((await db.query('select count(*) n from vendor_order_signal_associations where order_id=$1',[id])).rows[0].n,'2');
 const wrongSeller=event(session,'checkout','acct_foreignSeller'),wrongPlatform=event(session,'checkout',connected,'acct_foreignPlatform');
 await db.query(signalSql,wrongSeller);await db.query(signalSql,wrongPlatform);
 const wrongMode=event(session);wrongMode[2]=true;await db.query(signalSql,wrongMode);
 assert.equal((await job(id)).requested_generation,'2');
 await assert.rejects(db.query('update vendor_order_signal_associations set generation=generation+1 where order_id=$1',[id]),/order_queue_event_immutable/);
 assert.equal(await financial(),initial);
 checks.push('concurrent duplicate signals associate once; foreign seller/platform cannot schedule this order; notification writes leave financial and stock state unchanged');

 await db.query('update vendor_order_reconcile_control set enabled=true');await focus(id);
 const a=await claim();assert.equal(a.orderId,id);assert.equal((await job(id)).claimed_generation,'2');
 const during=event(session),retrieve=f.stripe.checkout.sessions.retrieve;
 let delivered=false;
 f.stripe.checkout.sessions.retrieve=async(...args)=>{
  if(!delivered){delivered=true;await db.query(signalSql,during);}
  return retrieve.apply(f.stripe.checkout.sessions,args);
 };
 try{await reconcile(id,f);}finally{f.stripe.checkout.sessions.retrieve=retrieve;}
 assert.equal(delivered,true);
 const receipt=await finish(a);const after=await job(id);
 assert.equal(after.requested_generation,'3');assert.equal(after.completed_generation,'2');assert.equal(await pending(id),true);
 assert.ok(after.next_run_at<=new Date());assert.deepEqual(await finish(a),receipt);
 await assert.rejects(db.query(fulfillSql,ready),/order_fulfillment_payment_unresolved/);
 const b=await claim();assert.equal(b.orderId,id);await reconcile(id,f);await finish(b);
 assert.equal(await pending(id),false);
 checks.push('event received during actual SDK reconciliation survives old claim completion and exact receipt retry, schedules immediate second check, and holds fulfillment until that check succeeds');

 const failure=event(session);await db.query(signalSql,failure);const c=await claim();assert.equal(c.orderId,id);
 const beforeFailed=await job(id);await finish(c,'retry');const failed=await job(id);
 assert.equal(failed.completed_generation,beforeFailed.completed_generation);assert.equal(await pending(id),true);
 assert.ok(failed.next_run_at>new Date());await db.query(signalSql,failure);await rpc('vendor_order_reconcile_seed_v1',{p_limit:100});
 assert.equal((await job(id)).next_run_at.toISOString(),failed.next_run_at.toISOString());
 await focus(id);const retry=await claim();await reconcile(id,f);await finish(retry);assert.equal(await pending(id),false);
 checks.push('failed reconciliation cannot acknowledge events; duplicate delivery and reseeding preserve bounded retry backoff');

 // Both serializations are actual overlapping PostgreSQL transactions.
 const beforeAction=event(session);
 await race(signalSql,beforeAction,fulfillSql,ready,{error:/order_fulfillment_payment_unresolved/});
 await focus(id);const d=await claim();await reconcile(id,f);await finish(d);
 const afterAction=event(session);
 const [saved]=await race(fulfillSql,ready,signalSql,afterAction);
 assert.equal(await pending(id),true);
 assert.deepEqual((await db.query(fulfillSql,ready)).rows[0].value,saved.rows[0].value);
 await assert.rejects(db.query(fulfillSql,request(id,1,'collect')),/order_fulfillment_payment_unresolved/);
 checks.push('signal-before-fulfillment blocks the new action; fulfillment-before-signal commits once, exact receipt remains recoverable, and the next action is held');

 await focus(id);const e=await claim();await reconcile(id,f);
 const finishRace=event(session);
 await race(finishSql,finishArgs(e,'verified'),signalSql,finishRace);
 assert.equal(await pending(id),true);assert.ok((await job(id)).next_run_at<=new Date());
 checks.push('event waiting behind queue completion obtains the same scope lock and remains immediately due after the old completion commits');

 const missing=event('cs_test_missing','checkout',connected,'acct_newNotificationScope');
 await race(signalSql,missing,signalSql,missing);
 assert.equal((await db.query("select count(*) n from vendor_order_reconcile_scopes where stripe_account_id='acct_newNotificationScope'")).rows[0].n,'1');
 checks.push('concurrent first events create exactly one scope lock row instead of proceeding without a lock');

 const batch=await create(copies[27]),batchId=batch.o.id,batchSession='cs_test_'+batchId.replaceAll('-','');
 for(let n=0;n<101;n++)await db.query(signalSql,event(batchSession));
 const batchBound=await bind(batch),bf=provider(batchBound);await db.query(applySql,applyParams(batchBound,await observe(bf)));
 await focus(batchId);const bc=await claim();assert.equal(bc.orderId,batchId);
 assert.equal((await job(batchId)).requested_generation,'100');assert.equal(await pending(batchId),true);
 await reconcile(batchId,bf);await finish(bc);
 assert.equal((await job(batchId)).requested_generation,'101');assert.equal((await job(batchId)).completed_generation,'100');
 await assert.rejects(db.query(fulfillSql,request(batchId)),/order_fulfillment_payment_unresolved/);
 const bc2=await claim();assert.equal(bc2.orderId,batchId);await reconcile(batchId,bf);await finish(bc2);
 assert.equal(await pending(batchId),false);
 checks.push('101 pre-binding events associate in bounded batches; an unclaimed remainder prevents fulfillment and requires another successful fresh check');

 // The payment intent becomes bound while fulfillment is waiting for order lock.
 const late=await create(copies[28]),lb=await bind(late),lf=provider(lb),piEvent=event(lf.intent.id,'payment_intent');
 await db.query(signalSql,piEvent);assert.equal(await pending(late.o.id),false);
 await race(applySql,applyParams(lb,await observe(lf)),fulfillSql,request(late.o.id),{error:/order_fulfillment_payment_unresolved/});
 assert.equal((await db.query('select paid from vendor_orders where id=$1',[late.o.id])).rows[0].paid,true);assert.equal(await pending(late.o.id),true);
 checks.push('fulfillment rechecks newly committed payment-intent binding after waiting on settlement, so a pre-binding intent event cannot slip through');

 const finalProjection=(await ownerApi.rpc('vendor_order_fulfillment_status_v1',{p_order_id:late.o.id})).data;
 assert.equal(finalProjection.paymentReady,false);assert.doesNotMatch(JSON.stringify(finalProjection),/acct_|evt_|pi_|generation|resource_id/);
 await db.query('update vendor_order_reconcile_control set enabled=false');await db.query('update vendor_order_fulfillment_control set enabled=false');
 checks.push('private participant fulfillment projection reflects pending events without exposing provider identities or internal generations; controls end disabled');
}
