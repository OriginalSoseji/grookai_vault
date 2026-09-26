// Real PostgreSQL contention and Auth/PostgREST ACLs, fixed new 200xx only.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {checkoutFixture} from '../../tests/helpers/vendorCheckoutFixture.mjs';
import {readVerifiedCheckoutEvidence} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
import {reconcileVendorOrder,recordVendorCheckoutSignal} from '../../apps/web/src/lib/payments/vendorOrderService.ts';
import {creationFixture} from '../../tests/helpers/vendorCheckoutCreationFixture.mjs';
import {createCheckoutRepository,createVendorCheckoutService} from '../../apps/web/src/lib/payments/vendorCheckoutCreation.ts';
import {reconcileVendorOrderPage} from '../../apps/web/src/lib/payments/vendorOrderReconciliation.ts';
import {proveOrderHttp} from '../../tests/helpers/vendorOrderHttpLocalProof.mjs';
import {proveOrderAcquisition} from '../../tests/helpers/vendorOrderAcquisitionLocalProof.mjs';
import {root,fixture,project,output,addition,hash,guard} from '../schema/vendor_checkout_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:20021');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'20022');
const dbClient=()=>new Client({connectionString:cfg.DB_URL,statement_timeout:15000,query_timeout:18000,application_name:'vendor_stock_local_v1'});
const db=dbClient(),left=dbClient(),right=dbClient();
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=api(cfg.SECRET_KEY),anon=api(cfg.PUBLISHABLE_KEY),ownerApi=api(cfg.PUBLISHABLE_KEY),buyerApi=api(cfg.PUBLISHABLE_KEY);
const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
const ids={store:randomUUID(),seller:randomUUID(),set:randomUUID(),parent:randomUUID(),printing:randomUUID(),legacy:randomUUID(),product:randomUUID(),interaction:randomUUID()};
const copies=Array.from({length:24},()=>randomUUID()),users=[],checks=[];
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),slug='stock-'+Date.now();
const orderIds=[],signalIds=[];
const imagePath=`${ids.store}/products/${ids.product}/synthetic.jpg`;
let owner,buyer,other,lockWaitsObserved=0,failure,connected=false,rightPid;
const reserveSql='select to_jsonb(public.vendor_stock_reserve_v1($1,$2,$3,$4,$5,$6)) as value';
const args=(copy,who=buyer,quantity=1,product=null,id=randomUUID())=>[id,who,ids.store,copy,product,quantity];
const reserve=async params=>(await db.query(reserveSql,params)).rows[0].value;
const release=r=>db.query('select public.vendor_stock_release_v1($1,$2)',[r.id,r.buyer_id]);
const payment=r=>db.query('select to_jsonb(public.vendor_stock_start_payment_v1($1,$2)) as value',[r.id,r.buyer_id]);
async function denied(query,params,pattern){await assert.rejects(db.query(query,params),pattern);}
async function waitForLock(){const until=Date.now()+4000;while(Date.now()<until){
 if((await db.query('select wait_event_type from pg_stat_activity where pid=$1',[rightPid])).rows[0]?.wait_event_type==='Lock'){lockWaitsObserved++;return true;}
 await delay(20);
}return false;}
async function role(client,which='service_role'){
 assert.ok(['service_role','authenticated'].includes(which));await client.query(`set local role ${which}`);
 if(which==='authenticated')await client.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);
}
async function race(first,firstArgs,second,secondArgs,{firstRole='service_role',secondRole='service_role',error=null}={}){
 await left.query('begin');await role(left,firstRole);
 const a=await left.query(first,firstArgs);
 await right.query('begin');await role(right,secondRole);
 const pending=right.query(second,secondArgs).then(result=>({result}),error=>({error}));
 const waited=await waitForLock();await left.query('commit');const b=await pending;
 await right.query(b.error?'rollback':'commit');assert.equal(waited,true,'Expected a real overlapping lock wait');
 if(error)assert.match(b.error?.message??'',error);else if(b.error)throw b.error;
 return [a,b.result];
}
async function fixtureClock(r,{pending=false}={}){
 // Fixture-only clock setup, never a production command. Normal enforcement is
 // enabled for all assertions; this inserts a separate, already-expired row.
 const n=randomUUID();
 await db.query(`insert into vendor_stock_reservations(id,buyer_id,owner_id,store_id,seller_id,instance_id,product_id,quantity,offer,state,created_at,expires_at,payment_started_at)
  select $2,buyer_id,owner_id,store_id,seller_id,instance_id,product_id,quantity,offer,$3,now()-interval '1 hour',now()-interval '58 minutes',
   case when $3='payment_pending' then now()-interval '59 minutes' end from vendor_stock_reservations where id=$1`,[r.id,n,pending?'payment_pending':'held']);
 return {...r,id:n};
}
try{
 await db.connect();connected=true;await left.connect();await right.connect();
 rightPid=(await right.query('select pg_backend_pid() pid')).rows[0].pid;
 for(let n=0;n<3;n++){
  const email=`${slug}-${n}@fixture.invalid`,password=randomUUID()+randomUUID();
  const data=await ok(admin.auth.admin.createUser({email,password,email_confirm:true}));users.push(data.user.id);
  if(n===0)await ok(ownerApi.auth.signInWithPassword({email,password}));
  if(n===1)await ok(buyerApi.auth.signInWithPassword({email,password}));
 }
 [owner,buyer,other]=users;
 await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Stock fixture',true,true) on conflict(user_id) do update set slug=excluded.slug,public_profile_enabled=true,vault_sharing_enabled=true",[owner,slug]);
 await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}')",[owner]);
 await db.query("insert into vendor_stores(id,owner_id,slug,display_name,app_published,web_published) values($1,$2,$3,'Stock fixture',true,true)",[ids.store,owner,slug]);
 await db.query(`insert into vendor_seller_accounts(id,owner_id,store_id,stripe_account_id,livemode,controller,connected_account_id,creation_started_at,state)
  values($1,$2,$3,'acct_stockPlatform',false,'{"feesPayer":"account","paymentLosses":"stripe","requirementCollection":"stripe","dashboard":"full"}','acct_stockSeller',now(),'bound')`,[ids.seller,owner,ids.store]);
 await db.query("insert into sets(id,code,name,game) values($1,$2,'Synthetic stock set','pokemon')",[ids.set,slug]);
 await db.query("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Synthetic stock card','001',$3,$4,'missing')",[ids.parent,ids.set,slug,`GV-PK-${slug}-001`]);
 await db.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[ids.printing,ids.parent,`GV-PK-${slug}-001-NORMAL`]);
 await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic stock card',$4)",[ids.legacy,owner,ids.parent,`GV-PK-${slug}-001`]);
 for(const [n,id] of copies.entries()){
  await db.query("insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label) values($1,$2,$3,$4,$5,$6,'sell','asking',25,'USD','NM')",[id,owner,ids.parent,ids.printing,ids.legacy,`GVVI-S${Date.now()}-${String(n).padStart(6,'0')}`]);
  await db.query('insert into vendor_store_items(store_id,instance_id) values($1,$2)',[ids.store,id]);
 }
 await db.query("insert into card_interactions(id,card_print_id,card_printing_id,vault_item_id,sender_user_id,receiver_user_id,message) values($1,$2,$3,$4,$5,$6,'Synthetic transfer contention')",[ids.interaction,ids.parent,ids.printing,ids.legacy,owner,other]);
 await db.query("insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",[imagePath]);
 await db.query("insert into vendor_store_custom_products(id,store_id,title,description,asking_price_amount,available_quantity,photo_paths,published) values($1,$2,'Synthetic custom stock','Fixture only',12.34,3,array[$3],true)",[ids.product,ids.store,imagePath]);
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query('update vendor_stock_rollout set reservations_enabled=true');
 const createSql='select to_jsonb(public.vendor_order_create_v1($1,$2,$3,$4,$5,$6,$7,$8)) as value';
 const applySql='select to_jsonb(public.vendor_order_apply_v1($1,$2,$3,$4,$5,$6)) as value';
 const createParams=r=>{const id=randomUUID();orderIds.push(id);return [id,randomUUID(),r.id,buyer,randomUUID(),'pickup',0,0];};
 const binding=id=>ok(admin.rpc('vendor_order_binding_v1',{p_order_id:id}));
 async function create(copy,{quantity=1,product=null}={}){
  const r=await reserve(args(copy,buyer,quantity,product)),params=createParams(r);
  const o=(await db.query(createSql,params)).rows[0].value;return {r,params,o};
 }
 async function bind(x){
  const token=randomUUID(),a=await ok(admin.rpc('vendor_order_claim_v1',{p_order_id:x.o.id,p_token:token}));
  const session='cs_test_'+x.o.id.replaceAll('-',''),created=new Date(Math.floor(Date.now()/1000)*1000).toISOString();
  await ok(admin.rpc('vendor_order_bind_v1',{p_order_id:x.o.id,p_token:token,p_fence:a.lease_fence,p_session:session,p_created:created}));
  return binding(x.o.id);
 }
 function provider(b){
  const f=checkoutFixture();Object.assign(f.order.seller,b.seller);Object.assign(f.order,{...b,seller:f.order.seller});
  f.config.scope={accountId:b.seller.platformAccountId,livemode:b.seller.livemode};
  f.platform.id=b.seller.platformAccountId;f.account.id=b.seller.connectedAccountId;f.now=Math.floor(Date.now()/1000);
  const pi='pi_'+b.orderId.replaceAll('-',''),ch='ch_'+b.orderId.replaceAll('-',''),subtotal=b.unitAmountMinor*b.quantity,total=subtotal+b.shippingAmountMinor+b.taxAmountMinor;
  const metadata={grookai_order_id:b.orderId,grookai_attempt_id:b.attemptId,grookai_reservation_id:b.reservationId};
  Object.assign(f.session,{id:b.sessionId,created:b.sessionCreatedAt,client_reference_id:b.orderId,metadata,payment_intent:pi,amount_subtotal:subtotal,amount_total:total,
   total_details:{amount_discount:0,amount_shipping:b.shippingAmountMinor,amount_tax:b.taxAmountMinor},expires_at:f.now+1800});
  Object.assign(f.lines.data[0],{quantity:b.quantity,amount_subtotal:subtotal,amount_total:subtotal+b.taxAmountMinor,amount_tax:b.taxAmountMinor});
  f.lines.data[0].price.unit_amount=b.unitAmountMinor;
  Object.assign(f.intent,{id:pi,created:b.sessionCreatedAt,amount:total,amount_received:total,metadata,latest_charge:ch});
  Object.assign(f.charge,{id:ch,payment_intent:pi,created:b.sessionCreatedAt,amount:total,amount_captured:total});
  return f;
 }
 const observe=f=>readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,()=>Math.floor(Date.now()/1000));
 const applyParams=(b,e)=>[b.orderId,b.revision,b.seller.platformAccountId,b.seller.connectedAccountId,b.seller.livemode,e];
 const expired=f=>{f.session.status='expired';f.session.payment_status='unpaid';f.session.payment_intent=null;};
 const reconcile=(b,f)=>reconcileVendorOrder(admin,f.stripe,f.config,b.orderId);
 const firstHold=await reserve(args(copies[0])),firstParams=createParams(firstHold);
 await denied(createSql,firstParams,/orders_disabled/);
 assert.equal((await db.query('select state from vendor_stock_reservations where id=$1',[firstHold.id])).rows[0].state,'held');
 await db.query('update vendor_orders_rollout set orders_enabled=true');
 const first={r:firstHold,params:firstParams,o:(await db.query(createSql,firstParams)).rows[0].value};
 assert.equal(first.o.unit_amount_minor,2500);assert.equal(first.o.quantity,1);
 assert.deepEqual((await db.query(createSql,firstParams)).rows[0].value,first.o);
 await denied(createSql,[...firstParams.slice(0,6),1,0],/order_invalid/);
 await denied(createSql,[...firstParams.slice(0,4),randomUUID(),...firstParams.slice(5)],/order_request_conflict/);
 for(const client of [anon,ownerApi,buyerApi]){
  for(const table of ['vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations','vendor_orders_rollout'])
   assert.ok((await client.from(table).select('*')).error);
  for(const [rpc,params] of [
   ['vendor_order_create_v1',{p_id:randomUUID(),p_attempt_id:randomUUID(),p_reservation_id:firstHold.id,p_buyer_id:buyer,p_quote_reference:randomUUID(),p_fulfillment:'pickup',p_shipping:0,p_tax:0}],
   ['vendor_order_claim_v1',{p_order_id:first.o.id,p_token:randomUUID()}],
   ['vendor_order_bind_v1',{p_order_id:first.o.id,p_token:randomUUID(),p_fence:1,p_session:'cs_test_forged',p_created:new Date().toISOString()}],
   ['vendor_order_binding_v1',{p_order_id:first.o.id}],
   ['vendor_order_apply_v1',{p_order_id:first.o.id,p_revision:0,p_platform:'acct_stockPlatform',p_connected:'acct_stockSeller',p_live:false,p_evidence:{}}],
   ['vendor_order_signal_v1',{p_platform:'acct_stockPlatform',p_connected:'acct_stockSeller',p_live:false,p_event:'evt_forged',p_kind:'checkout',p_resource:'cs_test_forged',p_created:new Date().toISOString()}],
  ])assert.match((await client.rpc(rpc,params)).error?.message??'',/permission denied/);
 }
 for(const table of ['vendor_orders','vendor_order_attempts','vendor_order_signals','vendor_order_observations'])assert.ok((await admin.from(table).insert({})).error);
 assert.equal(await binding(first.o.id),null);
 checks.push('server-priced immutable order, exact retries, disabled rollback, all direct anonymous/authenticated RPC and service table-write bypasses denied');
 const token=randomUUID(),claim=await ok(admin.rpc('vendor_order_claim_v1',{p_order_id:first.o.id,p_token:token}));
 assert.deepEqual(await ok(admin.rpc('vendor_order_claim_v1',{p_order_id:first.o.id,p_token:token})),claim);
 assert.match((await admin.rpc('vendor_order_claim_v1',{p_order_id:first.o.id,p_token:randomUUID()})).error?.message??'',/order_claim_busy/);
 const session='cs_test_'+first.o.id.replaceAll('-',''),created=new Date(Math.floor(Date.now()/1000)*1000).toISOString();
 for(const [t,f] of [[randomUUID(),claim.lease_fence],[token,claim.lease_fence+1]])assert.match((await admin.rpc('vendor_order_bind_v1',{p_order_id:first.o.id,p_token:t,p_fence:f,p_session:session,p_created:created})).error?.message??'',/order_claim_stale/);
 // Signed event arrives before durable session binding; no metadata routing.
 const pre=provider({...checkoutFixture().order,orderId:first.o.id,attemptId:firstParams[1],reservationId:firstHold.id,
  seller:{...checkoutFixture().order.seller,platformAccountId:'acct_stockPlatform',connectedAccountId:'acct_stockSeller'},sessionId:session});
 pre.now=Math.floor(Date.now()/1000);pre.session.id=session;
 const event=pre.event();event.created=pre.now;event.id='evt_'+randomUUID().replaceAll('-','');event.data.object.metadata={grookai_order_id:randomUUID()};signalIds.push(event.id);
 const payload=JSON.stringify(event),signature=pre.stripe.webhooks.generateTestHeaderString({payload,secret:pre.config.webhookSecret,timestamp:pre.now});
 assert.deepEqual(await recordVendorCheckoutSignal(admin,pre.stripe,pre.config,payload,signature),{orderId:null,ignored:false});
 await ok(admin.rpc('vendor_order_bind_v1',{p_order_id:first.o.id,p_token:token,p_fence:claim.lease_fence,p_session:session,p_created:created}));
 assert.equal((await recordVendorCheckoutSignal(admin,pre.stripe,pre.config,payload,signature)).orderId,first.o.id);
 assert.equal((await db.query('select count(*) n from vendor_order_signals')).rows[0].n,'1');
 assert.equal((await db.query('select paid from vendor_orders where id=$1',[first.o.id])).rows[0].paid,false);
 checks.push('fenced creation lease, stale rejection, pre-binding signed signal retention, duplicate delivery and metadata-independent lookup');
 const b=await binding(first.o.id),f=provider(b),e=await observe(f);
 for(const change of [{amountMinor:1},{sessionId:'cs_test_other'},{attemptId:randomUUID()},{paymentIntentId:'bad'},{evidenceHash:null},{orderHash:null},{checkedAt:0},{privateBuyer:'secret'}])
  await assert.rejects(db.query(applySql,applyParams(b,{...e,...change})),/order_evidence/);
 await denied(applySql,[b.orderId,b.revision,'acct_foreign',b.seller.connectedAccountId,false,e],/order_scope_mismatch/);
 await denied(applySql,[b.orderId,9,...applyParams(b,e).slice(2)],/order_revision_conflict/);
 const paidRace=await race(applySql,applyParams(b,e),applySql,applyParams(b,e));
 assert.equal(paidRace[0].rows[0].value.paid,true);assert.equal(paidRace[1].rows[0].value.revision,1);
 assert.equal((await binding(b.orderId)).stockState,'consumed');
 assert.equal((await db.query('select count(*) n from vendor_order_observations where order_id=$1',[b.orderId])).rows[0].n,'1');
 await denied('update vault_item_instances set archived_at=null where id=$1',[copies[0]],/order_copy_consumed/);
 await denied('update vault_item_instances set user_id=$2 where id=$1',[copies[0],other],/order_copy_consumed/);
 assert.equal((await db.query('select count(*) n from vault_item_instances where user_id=$1',[buyer])).rows[0].n,'0');
 assert.equal((await db.query('select count(*) n from vault_item_instance_dispositions where user_id=$1',[owner])).rows[0].n,'0');
 assert.equal((await db.query('select qty from vault_items where id=$1',[ids.legacy])).rows[0].qty,23);
 for(const client of [ownerApi,buyerApi]){const status=await ok(client.rpc('vendor_order_status_v1',{p_order_id:b.orderId}));assert.equal(status.paid,true);assert.doesNotMatch(JSON.stringify(status),/acct_|pi_|ch_|buyer_id|owner_id/);}
 await db.query('begin');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);
 assert.equal((await db.query('select vendor_order_status_v1($1) as value',[b.orderId])).rows[0].value,null);await db.query('rollback');
 checks.push('concurrent captured evidence consumes once, exact-copy archive updates legacy count without manual sale or ownership transfer; consumed copy cannot resurrect; participant privacy');
 // Successful reconciliation is available with every creation/publication flag off.
 const second=await create(copies[1]),b2=await bind(second),f2=provider(b2);
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
 await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
 await db.query("update user_entitlements set features='{}' where user_id=$1",[owner]);
 assert.equal((await reconcile(b2,f2)).paid,true);
 assert.equal((await ok(buyerApi.rpc('vendor_order_status_v1',{p_order_id:b2.orderId}))).paid,true);
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 await db.query("update user_entitlements set features='{\"store_app\":true,\"store_web\":true}' where user_id=$1",[owner]);
 assert.equal((await db.query('select web_published from vendor_stores where id=$1',[ids.store])).rows[0].web_published,false);
 await db.query('update vendor_stores set app_published=true,web_published=true where id=$1',[ids.store]);
 await db.query('update vendor_store_custom_products set published=true,suspension_reason=null,version=version+1 where id=$1',[ids.product]);
 checks.push('real private service runs GET-only verifier into PostgREST settlement; downgrade/disabled rollout cannot hide or block old obligations');
 const late=await create(copies[2]),bl=await bind(late),fl=provider(bl);expired(fl);const unpaid=await observe(fl);
 const nextArgs=args(copies[2],other);
 await race(applySql,applyParams(bl,unpaid),reserveSql,nextArgs);
 assert.equal((await binding(bl.orderId)).stockState,'released');
 const latePaid=provider(await binding(bl.orderId));assert.equal((await reconcile(latePaid.order,latePaid)).needsReview,true);
 assert.equal((await binding(bl.orderId)).stockState,'released');
 assert.equal((await db.query('select state from vendor_stock_reservations where id=$1',[nextArgs[0]])).rows[0].state,'held');
 assert.equal((await db.query('select archived_at from vault_item_instances where id=$1',[copies[2]])).rows[0].archived_at,null);
 await release({id:nextArgs[0],buyer_id:other});
 checks.push('terminal unpaid releases atomically to a waiting buyer; late paid fact is retained for review without stealing or consuming replacement stock');
 const customVersion=Number((await db.query('select version from vendor_store_custom_products where id=$1',[ids.product])).rows[0].version);
 const c1=await create(null,{product:ids.product,quantity:1}),c2=await create(null,{product:ids.product,quantity:2});
 const bc1=await bind(c1),bc2=await bind(c2),fc1=provider(bc1),fc2=provider(bc2);
 await race(applySql,applyParams(bc1,await observe(fc1)),applySql,applyParams(bc2,await observe(fc2)));
 const custom=(await db.query('select available_quantity,published,version from vendor_store_custom_products where id=$1',[ids.product])).rows[0];
 assert.equal(custom.available_quantity,0);assert.equal(custom.published,false);assert.equal(Number(custom.version),customVersion+2);
 assert.equal((await db.query('select count(*) n from vendor_store_custom_product_events where product_id=$1',[ids.product])).rows[0].n,String(customVersion+2));
 checks.push('concurrent custom orders decrement exact units once, honor sibling reservations, append versions and unpublish at zero');
 const review=await create(copies[3]),br=await bind(review),fr=provider(br);fr.charge.disputed=true;
 assert.equal((await reconcile(br,fr)).needsReview,true);assert.equal((await binding(br.orderId)).stockState,'payment_pending');
 fr.charge.disputed=false;assert.equal((await reconcile(br,fr)).needsReview,true);assert.equal((await binding(br.orderId)).stockState,'payment_pending');
 await denied('delete from vendor_orders where id=$1',[br.orderId],/order_history_retained/);
 await denied("update vendor_orders set unit_amount_minor=1 where id=$1",[br.orderId],/order_immutable/);
 await denied("update vendor_order_observations set applied_action='consume' where order_id=$1",[br.orderId],/order_history_immutable/);
 await denied('delete from auth.users where id=$1',[owner],/foreign key|stock_reserved|order_copy_consumed/);
 assert.equal((await db.query('select count(*) n from auth.users where id=$1',[owner])).rows[0].n,'1');
 assert.equal((await db.query("select count(*) n from vendor_account_financial_holds where reference_id=$1 and reason='manual_review'",[br.orderId])).rows[0].n,'1');
 checks.push('disputed capture retains payment fact and pending stock; clean later evidence cannot clear review automatically; immutable ledger and deletion holds persist');
 // Lost delivery and concurrent duplicate signals produce one immutable row.
 const signalId='evt_'+randomUUID().replaceAll('-','');signalIds.push(signalId);
 const signalSql='select vendor_order_signal_v1($1,$2,$3,$4,$5,$6,$7)',signalParams=['acct_stockPlatform','acct_stockSeller',false,signalId,'checkout',b.sessionId,new Date().toISOString()];
 await race(signalSql,signalParams,signalSql,signalParams);
 await denied(signalSql,[...signalParams.slice(0,5),'cs_test_other',signalParams[6]],/order_signal_conflict/);
 assert.equal((await db.query('select count(*) n from vendor_order_signals where event_id=$1',[signalId])).rows[0].n,'1');
 checks.push('concurrent signed-signal inbox key is atomic and conflicting duplicate resource is rejected');
 // A provider-create attempt cannot restart after its durable retry window.
 const recovery=await create(copies[4]),recoveryToken=randomUUID();
 const initialClaim=await ok(admin.rpc('vendor_order_claim_v1',{p_order_id:recovery.o.id,p_token:recoveryToken}));
 await db.query('begin');
 // Fixed synthetic fixture clock only; enforcement restored before assertions.
 await db.query('set local session_replication_role=replica');
 await db.query("update vendor_order_attempts set creation_started_at=clock_timestamp()-interval '24 hours',lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[initialClaim.id]);
 await db.query('set local session_replication_role=origin');
 await denied('select vendor_order_claim_v1($1,$2)',[recovery.o.id,randomUUID()],/order_creation_recovery_required/);await db.query('rollback');
 await db.query('begin');await db.query('set local session_replication_role=replica');
 await db.query("update vendor_order_attempts set lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[initialClaim.id]);
 await db.query('set local session_replication_role=origin');
 const newer=(await db.query('select to_jsonb(vendor_order_claim_v1($1,$2)) as value',[recovery.o.id,randomUUID()])).rows[0].value;
 assert.equal(newer.lease_fence,initialClaim.lease_fence+1);assert.equal(newer.creation_started_at,initialClaim.creation_started_at);
 await denied('select vendor_order_bind_v1($1,$2,$3,$4,$5)',[recovery.o.id,recoveryToken,initialClaim.lease_fence,'cs_test_stale',new Date().toISOString()],/order_claim_stale/);await db.query('rollback');
 checks.push('ambiguous creation never restarts after 23 hours; expired lease rotates fence without changing attempt or creation time');
 const bx=await bind(await create(copies[5])),fx=provider(bx),ex=await observe(fx);
 await db.query('begin');await db.query('set local session_replication_role=replica');
 await db.query('update vault_item_instances set archived_at=now() where id=$1',[copies[5]]);await db.query('set local session_replication_role=origin');
 await denied(applySql,applyParams(bx,ex),/order_stock_conflict/);await db.query('rollback');
 assert.equal((await db.query('select count(*) n from vendor_order_observations where order_id=$1',[bx.orderId])).rows[0].n,'0');
 assert.equal((await binding(bx.orderId)).stockState,'payment_pending');
 assert.equal((await db.query('select paid from vendor_orders where id=$1',[bx.orderId])).rows[0].paid,false);
 await race(applySql,applyParams(bx,ex),'select vault_archive_exact_instance_v1($1)',[copies[5]],{secondRole:'authenticated',error:/order_copy_consumed|vault_instance_already_archived/});
 checks.push('stock failure rolls back paid fact and ledger together; settlement racing legacy archive leaves one permanent paid disposition');
 const competing=await create(copies[6]),bo=await bind(competing),fp=provider(bo),fu=provider(bo);
 expired(fu);fu.session.payment_intent=fu.intent.id;Object.assign(fu.intent,{status:'canceled',amount_received:0,latest_charge:null,canceled_at:Math.floor(Date.now()/1000)});
 const ep=await observe(fp),eu=await observe(fu);
 await race(applySql,applyParams(bo,ep),applySql,applyParams(bo,eu),{error:/order_revision_conflict/});
 const contradiction=await reconcile(bo,fu);assert.equal(contradiction.paid,true);assert.equal(contradiction.needsReview,true);
 assert.equal((await binding(bo.orderId)).stockState,'consumed');
 checks.push('paid/unpaid callback race rejects stale revision; fresh contradictory unpaid proof cannot undo capture or restore stock');
 // Actual checkout preparation/recovery RPCs and SDK POST -> GET -> binding.
 const checkoutOrder=await create(copies[7]),creationToken=randomUUID();
 for(const client of [anon,ownerApi,buyerApi]){
  for(const [name,params] of [
   ['vendor_order_checkout_prepare_v1',{p_order_id:checkoutOrder.o.id,p_buyer_id:buyer,p_token:creationToken}],
   ['vendor_order_checkout_recovery_v1',{p_order_id:checkoutOrder.o.id,p_token:creationToken}],
  ])assert.match((await client.rpc(name,params)).error?.message??'',/permission denied/);
 }
 assert.match((await admin.rpc('vendor_order_checkout_prepare_v1',{p_order_id:checkoutOrder.o.id,p_buyer_id:other,p_token:creationToken})).error?.message??'',/order_checkout_unavailable/);
 assert.match((await admin.rpc('vendor_order_checkout_recovery_v1',{p_order_id:checkoutOrder.o.id,p_token:creationToken})).error?.message??'',/order_creation_not_started/);
 const preparation=await ok(admin.rpc('vendor_order_checkout_prepare_v1',{p_order_id:checkoutOrder.o.id,p_buyer_id:buyer,p_token:creationToken}));
 const fc=creationFixture(preparation);fc.now=Math.floor(Date.now()/1000);
 const realRepo=createCheckoutRepository(admin,fc.stripe,fc.config),checkoutService=createVendorCheckoutService({repo:realRepo,stripe:fc.stripe,config:fc.config,enabled:true,token:()=>creationToken});
 const link=await checkoutService.checkout(checkoutOrder.o.id,buyer);assert.equal(link.state,'open');assert.equal(link.url,fc.session.url);
 assert.equal((await binding(checkoutOrder.o.id)).sessionId,fc.session.id);assert.equal(fc.calls.filter(c=>c.method==='POST').length,1);
 await checkoutService.checkout(checkoutOrder.o.id,buyer);assert.equal(fc.calls.filter(c=>c.method==='POST').length,1);
 for(const [label,change,params] of [
  ['order flag','update vendor_orders_rollout set orders_enabled=false',[]],
  ['stock flag','update vendor_stock_rollout set reservations_enabled=false',[]],
  ['store unpublished','update vendor_stores set web_published=false where id=$1',[ids.store]],
  ['privacy','update public_profiles set vault_sharing_enabled=false where user_id=$1',[owner]],
  ['unselected','delete from vendor_store_items where store_id=$1 and instance_id=$2',[ids.store,copies[7]]],
  ['quarantine',"insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic checkout guard')",[ids.printing]],
  ['downgrade',"update user_entitlements set features='{}' where user_id=$1",[owner]],
  ['seller closing',"update vendor_seller_accounts set state='closing',closeout_id=$2,closeout_requested_at=now() where id=$1",[ids.seller,randomUUID()]],
 ]){
  await db.query('begin');await db.query(change,params);
  await denied('select vendor_order_checkout_prepare_v1($1,$2,$3)',[checkoutOrder.o.id,buyer,randomUUID()],/order_checkout_unavailable|order_item_unavailable/);
  await db.query('rollback');checks.push(`already-bound checkout rechecks ${label}`);
 }
 // Successful provider create with lost bind response. The claim remains held.
 const lost=await create(copies[8]),lostToken=randomUUID();
 const lostPrep=await ok(admin.rpc('vendor_order_checkout_prepare_v1',{p_order_id:lost.o.id,p_buyer_id:buyer,p_token:lostToken}));
 const flost=creationFixture(lostPrep);flost.now=Math.floor(Date.now()/1000);const lostRepo=createCheckoutRepository(admin,flost.stripe,flost.config);
 const failBinding={...lostRepo,async bind(){throw Error('synthetic_binding_response_lost');}};
 await assert.rejects(createVendorCheckoutService({repo:failBinding,stripe:flost.stripe,config:flost.config,enabled:true,token:()=>lostToken}).checkout(lost.o.id,buyer),/synthetic_binding_response_lost/);
 assert.equal(flost.created,true);assert.equal(await binding(lost.o.id),null);
 // Same fenced owner can recover immediately; a different caller is busy.
 assert.match((await admin.rpc('vendor_order_checkout_recovery_v1',{p_order_id:lost.o.id,p_token:randomUUID()})).error?.message??'',/order_claim_busy/);
 await db.query('update vendor_orders_rollout set orders_enabled=false');await db.query('update vendor_stock_rollout set reservations_enabled=false');
 const posts=flost.calls.filter(c=>c.method==='POST').length;
 const recovered=await createVendorCheckoutService({repo:lostRepo,stripe:flost.stripe,config:flost.config,enabled:false,token:()=>lostToken}).recover(lost.o.id,flost.session.id);
 assert.equal(recovered.state,'reconciled');assert.equal(flost.calls.filter(c=>c.method==='POST').length,posts);
 assert.equal((await binding(lost.o.id)).sessionId,flost.session.id);assert.equal((await binding(lost.o.id)).stockState,'payment_pending');
 await db.query('update vendor_orders_rollout set orders_enabled=true');await db.query('update vendor_stock_rollout set reservations_enabled=true');
 checks.push('real authenticated API denies clients/foreign buyer; created checkout resumes without POST; lost binding recovers with GETs while acquisition disabled');
 // Existing synthetic aged attempt: recovery can acquire a fence after 23h,
 // but the creation RPC still refuses the immutable old timestamp.
 await db.query('begin');await db.query('set local session_replication_role=replica');
 await db.query("update vendor_order_attempts set creation_started_at=clock_timestamp()-interval '24 hours',lease_expires_at=clock_timestamp()-interval '1 second' where id=$1",[initialClaim.id]);
 await db.query('set local session_replication_role=origin');
 const oldRecovery=(await db.query('select vendor_order_checkout_recovery_v1($1,$2) as value',[recovery.o.id,randomUUID()])).rows[0].value;
 assert.equal(oldRecovery.attempt.lease_fence,initialClaim.lease_fence+1);
 await denied('select vendor_order_claim_v1($1,$2)',[recovery.o.id,oldRecovery.attempt.lease_token],/order_creation_recovery_required/);await db.query('rollback');
 checks.push('late recovery fencing cannot authorize provider creation beyond the original window');
 // Sweep actual durable bindings, including the session whose signal arrived
 // before binding. Scoped SDK readers simulate current captured provider state.
 const boundRows=(await db.query('select order_id from vendor_order_attempts where session_id is not null order by order_id')).rows;
 const registry=new Map();for(const row of boundRows){const projection=await binding(row.order_id);const f=provider(projection);registry.set(projection.sessionId,f);}
 const seed=registry.values().next().value;
 const multi={accounts:seed.stripe.accounts,balance:seed.stripe.balance,
  checkout:{sessions:{retrieve:(id,...rest)=>registry.get(id).stripe.checkout.sessions.retrieve(id,...rest),listLineItems:(id,...rest)=>registry.get(id).stripe.checkout.sessions.listLineItems(id,...rest)}},
  paymentIntents:{retrieve:(id,...rest)=>[...registry.values()].find(f=>f.intent.id===id).stripe.paymentIntents.retrieve(id,...rest)},
  charges:{retrieve:(id,...rest)=>[...registry.values()].find(f=>f.charge.id===id).stripe.charges.retrieve(id,...rest)}};
 const sweep=await reconcileVendorOrderPage(admin,multi,fc.config,{limit:25});
 assert.deepEqual(sweep.failed,[]);assert.equal(sweep.complete,true);assert.equal(sweep.succeeded.length,boundRows.length);
 assert.equal((await binding(checkoutOrder.o.id)).stockState,'consumed');assert.equal((await binding(lost.o.id)).stockState,'consumed');
 assert.equal((await binding(bl.orderId)).stockState,'released');
 checks.push('bounded durable-binding sweep settles lost-callback orders with current scoped GET evidence and preserves prior terminal/review decisions');
 await proveOrderAcquisition({db,admin,buyerApi,ownerApi,buyer,owner,other,ids,copies,orderIds,checks});
 await proveOrderHttp({db,admin,buyerApi,ownerApi,create,copy:copies[9],buyer,owner,ids,signalIds,checks,binding,registry,multi});
}catch(error){failure=error;}
finally{
 await left.query('rollback').catch(()=>{});await right.query('rollback').catch(()=>{});
 if(connected){
  await db.query('rollback');
  // Only synthetic IDs, fixed guarded project. Retain evidence before fixture
  // removal; immutable financial/history triggers are bypassed only for cleanup.
  const evidence=(await db.query('select id,state,instance_id,product_id,quantity,offer from vendor_stock_reservations where store_id=$1',[ids.store])).rows;
  fs.writeFileSync(path.join(fixture,`orders-${stamp}-private.json`),JSON.stringify({ids,users,copies,evidence,checks,failure:failure?.stack}),{flag:'wx'});
  await db.query('begin');await db.query('set local session_replication_role=replica');
  await db.query('delete from vendor_order_observations where order_id=any($1::uuid[])',[orderIds]);
  await db.query('delete from vendor_order_attempts where order_id=any($1::uuid[])',[orderIds]);
  await db.query('delete from vendor_orders where id=any($1::uuid[])',[orderIds]);
  await db.query('delete from vendor_order_signals where event_id=any($1::text[])',[signalIds]);
  await db.query('delete from vendor_account_financial_holds where owner_id=$1',[owner]);
  await db.query('delete from vendor_stock_reservations where store_id=$1',[ids.store]);
  await db.query('delete from vendor_store_custom_product_events where product_id=$1',[ids.product]);
  await db.query('delete from vendor_store_custom_products where id=$1',[ids.product]);
  await db.query("delete from storage.objects where bucket_id='vendor-store-media' and name=$1",[imagePath]);
  await db.query('delete from vault_item_instance_dispositions where user_id=$1',[owner??null]);
  await db.query('delete from card_events where card_print_id=$1',[ids.parent]);
  await db.query('delete from card_interaction_group_states where card_print_id=$1',[ids.parent]);
  await db.query('delete from card_interactions where id=$1',[ids.interaction]);
  await db.query('delete from vendor_store_items where store_id=$1',[ids.store]);
  await db.query('delete from vault_item_instances where id=any($1::uuid[])',[copies]);
  await db.query('delete from vault_items where id=$1',[ids.legacy]);
  await db.query('delete from card_printings where id=$1',[ids.printing]);
  await db.query('delete from pricing_watch where card_print_id=$1',[ids.parent]);
  await db.query('delete from card_prints where id=$1',[ids.parent]);
  await db.query('delete from sets where id=$1',[ids.set]);
  await db.query('delete from vendor_seller_accounts where id=$1',[ids.seller]);
  await db.query('delete from vendor_stores where id=$1',[ids.store]);
  await db.query('update vendor_orders_rollout set orders_enabled=false');
  await db.query('update vendor_stock_rollout set reservations_enabled=false');
  await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');
  await db.query('commit');
  for(const id of users)await ok(admin.auth.admin.deleteUser(id));
 }
 await left.end();await right.end();await db.end();
}
assert.deepEqual(guard({full:true}),runtime);
const report={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,lockWaitsObserved,failure:failure?.message,
 migrationSha256:runtime.sourceHashes[addition],runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),
 actualAuth:true,actualPostgrest:true,actualPostgresConcurrency:true,fixturesRemoved:true,productionWrites:0,providerRequests:0};
fs.writeFileSync(path.join(output,`checkout-${stamp}.json`),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
if(failure)process.exitCode=1;
