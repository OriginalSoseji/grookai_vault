// Real PostgreSQL contention and Auth/PostgREST ACLs, fixed new 196xx only.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,project,output,addition,hash,guard} from '../schema/vendor_orders_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const runtime=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:19621');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'19622');
const dbClient=()=>new Client({connectionString:cfg.DB_URL,statement_timeout:15000,query_timeout:18000,application_name:'vendor_stock_local_v1'});
const db=dbClient(),left=dbClient(),right=dbClient();
const api=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const admin=api(cfg.SECRET_KEY),anon=api(cfg.PUBLISHABLE_KEY),ownerApi=api(cfg.PUBLISHABLE_KEY),buyerApi=api(cfg.PUBLISHABLE_KEY);
const ok=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
const ids={store:randomUUID(),seller:randomUUID(),set:randomUUID(),parent:randomUUID(),printing:randomUUID(),legacy:randomUUID(),product:randomUUID(),interaction:randomUUID()};
const copies=Array.from({length:24},()=>randomUUID()),users=[],checks=[];
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),slug='stock-'+Date.now();
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
 const req=args(copies[0]);
 await denied(reserveSql,req,/stock_disabled/);
 const body={p_id:req[0],p_buyer_id:req[1],p_store_id:req[2],p_instance_id:req[3],p_product_id:null,p_quantity:1};
 for(const client of [anon,ownerApi,buyerApi]){
  for(const name of ['vendor_stock_reservations','vendor_stock_rollout'])assert.ok((await client.from(name).select('*')).error);
  assert.match((await client.rpc('vendor_stock_reserve_v1',body)).error?.message??'',/permission denied/);
  for(const name of ['vendor_stock_release_v1','vendor_stock_start_payment_v1'])assert.match((await client.rpc(name,{p_id:req[0],p_buyer_id:buyer})).error?.message??'',/permission denied/);
 }
 assert.ok((await admin.from('vendor_stock_reservations').insert({})).error);
 checks.push('real Auth and direct PostgREST reject anonymous, owner, buyer and service table-write bypass');
 await db.query('update vendor_stock_rollout set reservations_enabled=true');
 const r=await ok(admin.rpc('vendor_stock_reserve_v1',body));
 assert.equal(r.offer.unit_amount,25);assert.equal(r.offer.card_printing_id,ids.printing);assert.equal(r.quantity,1);
 assert.deepEqual(await reserve(req),r);await denied(reserveSql,[req[0],other,...req.slice(2)],/stock_request_conflict/);
 assert.equal((await db.query('select count(*) n from vendor_stock_reservations')).rows[0].n,'1');
 checks.push('server-derived exact-copy offer, stable retry and mismatched request rejection');
 for(const mutation of ["archived_at=now()","intent='hold'","asking_price_amount=30","condition_label='LP'","card_printing_id=null"])
  await denied(`update vault_item_instances set ${mutation} where id=$1`,[copies[0]],/stock_reserved/);
 await denied('update vault_item_instances set user_id=$2 where id=$1',[copies[0],other],/stock_reserved/);
 await denied('delete from vault_item_instances where id=$1',[copies[0]],/stock_reserved/);
 for(const [name,params] of [
  ['vault_archive_exact_instance_v1',{p_instance_id:copies[0]}],
  ['vault_archive_all_instances_v1',{p_vault_item_id:ids.legacy}],
  ['vault_archive_selected_cards_v1',{p_card_print_ids:[ids.parent]}],
  ['vault_record_exact_instance_disposition_v2',{p_instance_id:copies[0],p_disposition_type:'sale',p_sale_price_amount:25,p_sale_price_currency:'USD'}],
 ])assert.match((await ownerApi.rpc(name,params)).error?.message??'',/stock_reserved/);
 const transfer={p_actor_user_id:owner,p_execution_type:'sale',p_latest_interaction_id:ids.interaction,p_source_instance_id:copies[0],p_price_amount:25,p_price_currency:'USD'};
 assert.match((await ownerApi.rpc('execute_card_interaction_outcome_service_v1',transfer)).error?.message??'',/permission denied/);
 assert.match((await admin.rpc('execute_card_interaction_outcome_service_v1',transfer)).error?.message??'',/stock_reserved/);
 assert.equal((await db.query('select count(*) n from vault_item_instance_dispositions where user_id=$1',[owner])).rows[0].n,'0');
 assert.equal((await db.query('select count(*) n from vault_item_instances where user_id=$1 and archived_at is not null',[owner])).rows[0].n,'0');
 checks.push('legacy archive/bulk/manual sale and direct transfer/offer mutations roll back against a hold');
 await release(r);await release(r);
 await denied('update vendor_stock_reservations set state=\'held\',released_at=null,release_reason=null where id=$1',[r.id],/stock_reservation_immutable/);
 await denied('delete from vendor_stock_reservations where id=$1',[r.id],/stock_history_retained/);
 assert.equal((await reserve(req)).state,'released');
 const sibling=await reserve(args(copies[1]));assert.notEqual(sibling.instance_id,r.instance_id);await release(sibling);
 checks.push('cancellation is idempotent, retained attempts never resurrect, sibling copies remain separate');

 // Negative offer/publication gates with each change rolled back.
 for(const [label,change,params] of [
  ['private profile','update public_profiles set vault_sharing_enabled=false where user_id=$1',[owner]],
  ['unpublished store','update vendor_stores set web_published=false where id=$1',[ids.store]],
  ['package downgrade',"update user_entitlements set features='{\"store_app\":true}' where user_id=$1",[owner]],
  ['seller frozen',"update vendor_seller_accounts set state='closing',closeout_id=gen_random_uuid(),closeout_requested_at=now() where id=$1",[ids.seller]],
  ['unselected','delete from vendor_store_items where instance_id=$1',[copies[2]]],
  ['unassigned','update vault_item_instances set card_printing_id=null where id=$1',[copies[2]]],
  ['hold intent',"update vault_item_instances set intent='hold' where id=$1",[copies[2]]],
  ['zero price','update vault_item_instances set asking_price_amount=0 where id=$1',[copies[2]]],
  ['archived','update vault_item_instances set archived_at=now() where id=$1',[copies[2]]],
  ['foreign owner','update vault_item_instances set user_id=$2 where id=$1',[copies[2],other]],
  ['quarantined printing',"insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic stock test')",[ids.printing]],
 ]){
  await db.query('begin');await db.query(change,params);await assert.rejects(reserve(args(copies[2])),/stock_(store|item)_unavailable/);await db.query('rollback');checks.push(`new reservation rejects ${label}`);
 }
 await assert.rejects(reserve(args(copies[2],owner)),/stock_store_unavailable/);
 await assert.rejects(reserve(args(copies[2],buyer,2)),/stock_invalid_request/);
 await db.query('begin isolation level repeatable read');await assert.rejects(reserve(args(copies[2])),/stock_requires_read_committed/);await db.query('rollback');
 await db.query('begin isolation level repeatable read');await denied("update vault_item_instances set intent='hold' where id=$1",[copies[2]],/stock_requires_read_committed/);await db.query('rollback');
 checks.push('self-purchase, invalid copy quantity and stale transaction snapshots rejected');

 const expiredBase=await reserve(args(copies[3]));await release(expiredBase);
 const expired=await fixtureClock(expiredBase);await assert.rejects(payment(expired),/stock_reservation_expired/);
 const replacement=await reserve(args(copies[3],other));await release(replacement);await release(expired);
 assert.equal((await db.query('select release_reason from vendor_stock_reservations where id=$1',[expired.id])).rows[0].release_reason,'expired');
 const p=await reserve(args(copies[4]));const start=(await payment(p)).rows[0].value;
 assert.equal(start.state,'payment_pending');assert.deepEqual((await payment(p)).rows[0].value,start);
 await assert.rejects(release(p),/stock_payment_resolution_required/);
 await db.query('update vendor_stock_rollout set reservations_enabled=false');await assert.rejects(release(p),/stock_payment_resolution_required/);
 await denied('update vault_item_instances set archived_at=now() where id=$1',[copies[4]],/stock_reserved/);
 await db.query('update vendor_stock_rollout set reservations_enabled=true');
 const oldBase=await reserve(args(copies[5]));await release(oldBase);const oldPayment=await fixtureClock(oldBase,{pending:true});
 await assert.rejects(reserve(args(copies[5],other)),/stock_unavailable/);await assert.rejects(release(oldPayment),/stock_payment_resolution_required/);
 checks.push('only pre-provider expiry releases availability; payment-pending stock stays protected past expiry and flag disable');
 const recheck=await reserve(args(copies[6]));
 await db.query('begin');await db.query('delete from vendor_store_items where instance_id=$1',[copies[6]]);await assert.rejects(payment(recheck),/stock_item_unavailable/);await db.query('rollback');await release(recheck);
 checks.push('provider handoff rechecks explicit listing selection');
 for(const [label,change,params] of [
  ['quarantine',"insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic stock test')",[ids.printing]],
  ['privacy','update public_profiles set vault_sharing_enabled=false where user_id=$1',[owner]],
  ['package downgrade',"update user_entitlements set features='{}' where user_id=$1",[owner]],
  ['seller freeze',"update vendor_seller_accounts set state='closing',closeout_id=gen_random_uuid(),closeout_requested_at=now() where id=$1",[ids.seller]],
 ]){
  const h=await reserve(args(copies[6]));await db.query('begin');await db.query(change,params);
  await assert.rejects(payment(h),/stock_(item|store)_unavailable/);await db.query('rollback');await release(h);
  checks.push(`provider handoff rechecks ${label}`);
 }

 const custom=await reserve(args(null,buyer,2,ids.product));
 await assert.rejects(reserve(args(null,other,2,ids.product)),/stock_unavailable/);
 await denied('update vendor_store_custom_products set available_quantity=1,version=version+1 where id=$1',[ids.product],/stock_reserved/);
 await denied('update vendor_store_custom_products set asking_price_amount=99,version=version+1 where id=$1',[ids.product],/stock_reserved/);
 await denied('update vendor_store_custom_products set archived_at=now(),version=version+1 where id=$1',[ids.product],/stock_reserved/);
 await db.query('update vendor_store_custom_products set available_quantity=2,published=false,version=version+1 where id=$1',[ids.product]);
 await assert.rejects(payment(custom),/stock_item_unavailable/);await release(custom);
 await db.query('update vendor_store_custom_products set available_quantity=1,published=true,version=version+1 where id=$1',[ids.product]);
 checks.push('custom stock subtracts holds, protects committed quantity/offer, and allows unpublication');

 const a=args(copies[7]),b=args(copies[7],other);
 await race(reserveSql,a,reserveSql,b,{error:/stock_unavailable/});await release({id:a[0],buyer_id:buyer});
 checks.push('two buyers racing for one physical copy have one winner');
 const ca=args(null,buyer,1,ids.product),cb=args(null,other,1,ids.product);
 await race(reserveSql,ca,reserveSql,cb,{error:/stock_unavailable/});await release({id:ca[0],buyer_id:buyer});
 checks.push('two buyers racing for last custom unit have one winner');
 const retry=args(copies[8]);const [ra,rb]=await race(reserveSql,retry,reserveSql,retry);
 assert.equal(ra.rows[0].value.id,rb.rows[0].value.id);await release(ra.rows[0].value);
 checks.push('simultaneous retries share one immutable reservation');
 const sale="select public.vault_record_exact_instance_disposition_v2($1,'sale',25,'USD')";
 const first=args(copies[9]);await race(reserveSql,first,sale,[copies[9]],{secondRole:'authenticated',error:/stock_reserved/});await release({id:first[0],buyer_id:buyer});
 const later=args(copies[10]);await race(sale,[copies[10]],reserveSql,later,{firstRole:'authenticated',error:/stock_item_unavailable/});
 checks.push('manual-sale versus reservation races protect both commit orders');
 const arch=args(copies[11]);await race(reserveSql,arch,'select public.vault_archive_exact_instance_v1($1)',[copies[11]],{secondRole:'authenticated',error:/stock_reserved/});await release({id:arch[0],buyer_id:buyer});
 const handoff=await reserve(args(copies[12]));
 await race('select public.vendor_stock_start_payment_v1($1,$2)',[handoff.id,buyer],'select public.vendor_stock_release_v1($1,$2)',[handoff.id,buyer],{error:/stock_payment_resolution_required/});
 const cancel=await reserve(args(copies[13]));
 await race('select public.vendor_stock_release_v1($1,$2)',[cancel.id,buyer],'select public.vendor_stock_start_payment_v1($1,$2)',[cancel.id,buyer],{error:/stock_reservation_expired/});
 checks.push('archive race and both cancellation/provider-start orderings are serialized');
 // Prove the trigger sees a reservation committed after an UPDATE statement
 // began; it must not reuse the statement's old snapshot after its row wait.
 const direct=args(copies[14]);await left.query('begin');await role(left);await left.query(reserveSql,direct);
 const blocked=right.query('update vault_item_instances set user_id=$2 where id=$1',[copies[14],other]).then(result=>({result}),error=>({error}));
 const waited=await waitForLock();await left.query('commit');const done=await blocked;
 assert.equal(waited,true);assert.match(done.error?.message??'',/stock_reserved/);await release({id:direct[0],buyer_id:buyer});
 checks.push('direct ownership update waiting on a newly reserved copy sees the committed hold');
 const customRace=args(null,buyer,1,ids.product);await left.query('begin');await role(left);await left.query(reserveSql,customRace);
 const quantityWait=right.query('update vendor_store_custom_products set available_quantity=0,version=version+1 where id=$1',[ids.product]).then(result=>({result}),error=>({error}));
 const quantityBlocked=await waitForLock();await left.query('commit');const quantityResult=await quantityWait;
 assert.equal(quantityBlocked,true);assert.match(quantityResult.error?.message??'',/stock_reserved/);await release({id:customRace[0],buyer_id:buyer});
 checks.push('custom quantity edit waiting on a new hold cannot oversell');
 const active=Number((await db.query("select count(*) n from vendor_stock_reservations where buyer_id=$1 and (state='payment_pending' or (state='held' and expires_at>clock_timestamp()))",[buyer])).rows[0].n);
 const bounded=[];for(let n=0;n<10-active;n++)bounded.push(await reserve(args(copies[15+n])));
 await assert.rejects(reserve(args(copies[23])),/stock_buyer_limit/);for(const h of bounded)await release(h);
 checks.push('per-buyer active reservation bound enforced in database');
 assert.equal((await db.query('select count(*) n from vault_item_instance_dispositions where user_id=$1',[owner])).rows[0].n,'1');
 assert.equal((await db.query('select count(*) n from vendor_stock_reservations where state=\'payment_pending\'')).rows[0].n,'3');
}catch(error){failure=error;}
finally{
 await left.query('rollback').catch(()=>{});await right.query('rollback').catch(()=>{});
 if(connected){
  await db.query('rollback');
  // Only synthetic IDs, fixed guarded project. Retain evidence before fixture
  // removal; immutable financial/history triggers are bypassed only for cleanup.
  const evidence=(await db.query('select id,state,instance_id,product_id,quantity,offer from vendor_stock_reservations where store_id=$1',[ids.store])).rows;
  fs.writeFileSync(path.join(fixture,`stock-${stamp}-private.json`),JSON.stringify({ids,users,copies,evidence,checks,failure:failure?.stack}),{flag:'wx'});
  await db.query('begin');await db.query('set local session_replication_role=replica');
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
fs.writeFileSync(path.join(output,`local-${stamp}.json`),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
if(failure)process.exitCode=1;
