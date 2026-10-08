// One-use exact434 seed retains old receipts plus actual v6 allocation and cost evidence.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {confirmedDiscountedSale} from '../../apps/web/src/lib/sales/discountedSale.mjs';
import {validateEventRequest,confirmedEventRequest,validateEventState} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_discount_20261008');
const lab='C:/grookai_vault_operator_artifacts/product_discount_20261008/release-upgrade-435-v1',project='discount-rel-upgrade-435-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.equal(freeze.mode,'upgrade');
assert.ok(fs.existsSync(lab+'/fixture-intent.json'));assert.ok(!fs.existsSync(lab+'/modern-intent.json'));assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes)){assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);if(name!=='20261008170000_vendor_discount_cancellation_v1.sql')assert.equal(hash(fs.readFileSync(lab+'/supabase/migrations/'+name)),digest,name);}
assert.equal(fs.readdirSync(lab+'/supabase/migrations').filter(n=>n.endsWith('.sql')).length,434);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:34881');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const p of [34880,34881])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34880/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const auth={persistSession:false,autoRefreshToken:false},admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});
const save=(name,value)=>fs.writeFileSync(lab+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const controls=['vendor_discount_control','vendor_event_control','vendor_receipt_cloud_control','vendor_sales_cart_control','vendor_sales_payment_control','vendor_sales_trade_control','vendor_purchase_control','vendor_negotiated_trade_control'];
let flags,cost,result;
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,434);
 flags={};for(const t of controls)flags[t]=(await q(`select enabled from ${t}`))[0].enabled;assert.ok(Object.values(flags).every(v=>v===false));
 cost=(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0];assert.deepEqual(cost,{edit_enabled:false,capture_enabled:false});
 const fixture={set:randomUUID(),card:randomUUID(),printing:randomUUID(),at:new Date().toISOString(),project,consumed:true};save('modern-intent.json',fixture);
 const email=randomUUID()+'@event-upgrade.invalid',password=randomUUID()+'Aa9!';
 const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);const owner=made.data.user.id;
 save('modern-owner.private.json',{owner,email});assert.equal((await client.auth.signInWithPassword({email,password})).error,null);
 await q('begin');
 await q("insert into sets(id,code,name,game) values($1,$2,'Event upgrade synthetic set','pokemon')",[fixture.set,fixture.set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Event upgrade synthetic card','1',$3,'missing')",[fixture.card,fixture.set,'GV-PK-EVENT-'+fixture.card]);
 await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[fixture.printing,fixture.card,'GV-PK-EVENT-'+fixture.card+'-STD']);
 for(const condition of ['NM','LP'])await q('select public.admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>$3,p_card_printing_id=>$4::uuid)',[owner,fixture.card,condition,fixture.printing]);
 const copies=await q('select id,condition_label from vault_item_instances where user_id=$1 order by condition_label',[owner]);assert.equal(copies.length,2);
 await q("update vault_item_instances set acquisition_cost=case when condition_label='NM' then 0 else 3.21 end,acquisition_currency='USD' where user_id=$1",[owner]);
 for(const t of controls)await q(`update ${t} set enabled=true`);await q('update vendor_cost_evidence_control set capture_enabled=true');await q('commit');
 const ok=r=>{assert.equal(r.error,null,JSON.stringify(r.error));return r.data;},customer={name:'',email:'',phone:'',wants:'',notes:''};
 const sale=ok(await client.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{version:1,storeName:'Synthetic upgrade shop',method:'Cash',items:[{instanceId:copies[0].id,description:'Retained exact sale',quantity:1,unitMinor:1000}],taxMinor:0,note:'',customerId:null,customer}}));
 const buy=ok(await client.rpc('vendor_sales_cart_complete_v4',{p_request_id:randomUUID(),p_cart:{version:4,kind:'purchase',storeName:'Synthetic upgrade shop',items:[{description:'Retained exact buy',quantity:1,unitMinor:700,referenceMinor:null,rateBps:null,cardId:fixture.card,printingId:fixture.printing,condition:'NM',addToVault:true}],payments:[{method:'Cash',amountMinor:700,tenderedMinor:700}],note:'',customerId:null,customer}}));
 const trade=ok(await client.rpc('vendor_sales_cart_complete_v5',{p_request_id:randomUUID(),p_cart:{version:5,storeName:'Synthetic upgrade shop',method:'Cash',items:[{instanceId:copies[1].id,description:'Retained exact trade sale',quantity:1,unitMinor:1000}],taxMinor:0,note:'',customerId:null,customer,trades:[{description:'Retained incoming',quantity:1,valueMinor:null,rateBps:null,creditMinor:650,cardId:fixture.card,printingId:fixture.printing,condition:'LP',addToVault:true}],payments:[{method:'Cash',amountMinor:350,tenderedMinor:500}]}}));
 const retainedDiscount={id:randomUUID(),cart:{version:6,storeName:'Synthetic upgrade shop',method:'Cash',items:[{instanceId:null,description:'Retained discounted lot',quantity:1,unitMinor:1000}],discountMinor:200,taxMinor:0,note:'',customerId:null,customer,payments:[{method:'Cash',amountMinor:800,tenderedMinor:1000}]}};
 const discounted=ok(await client.rpc('vendor_sales_cart_complete_v6',{p_request_id:retainedDiscount.id,p_cart:retainedDiscount.cart}));confirmedDiscountedSale(discounted,retainedDiscount);
 save('modern-discount-request.json',retainedDiscount);save('modern-discount-ack.json',discounted);
 const snapshots=await q('select snapshot from vendor_sale_cost_snapshots where owner_id=$1 order by request_id',[owner]);assert.equal(snapshots.length,3);
 assert.deepEqual(snapshots.filter(r=>r.snapshot.version===1).map(r=>r.snapshot.lines[0].cost.minor).sort(),['0','321']);
 const book=ok(await client.rpc('vendor_receipt_book_read_v1'));assert.equal(book.book.receipts.length,4);
 const acquired=await q('select acquisition_cost::text cost from vault_item_instances where user_id=$1 and id=any($2::uuid[]) order by acquisition_cost',[owner,[buy.items[0].instanceId,trade.receipt.tradeIn.items[0].instanceId]]);assert.equal(acquired.length,2);assert.deepEqual(acquired.map(r=>Number(r.cost)),[6.5,7]);
 const eventId=randomUUID(),expenseId=randomUUID(),date=sale.createdAt.slice(0,10),operations=[
  {type:'event_create',eventId,name:'Retained pre-discount event',startDate:date,endDate:date,timeZone:'UTC',currency:'USD',notes:'Retained private event'},
  {type:'expense_create',eventId,expenseId,category:'booth',description:'Retained booth fee',amountMinor:'100',currency:'USD',incurredOn:date},
  {type:'receipts_assign',eventId,receipts:[sale.id,buy.id,trade.receipt.id].sort().map(receiptId=>({receiptId,previousEventId:null}))},
  {type:'event_close',eventId,reason:'Retained before upgrade'}
 ];
 const requests=[];for(const [index,operation]of operations.entries()){
  const request=validateEventRequest({version:1,requestId:randomUUID(),expectedRevision:String(index),operation});requests.push(request);
  save('modern-event-request-'+index+'.json',request);const reply=ok(await client.rpc('vendor_event_mutate_v1',{p_request:request}));confirmedEventRequest(request,reply,owner);
 }
 const event=ok(await client.rpc('vendor_event_read_v1',{p_event_id:eventId}));validateEventState(event,owner,eventId);assert.equal(event.revision,'4');assert.equal(event.selected.assignments.length,3);assert.equal(event.selected.expenses.length,1);
 save('modern-event-state.json',event);
 result={retainedEvents:1,retainedEventRequests:4,eventId,status:'passed',at:new Date().toISOString(),owner,receiptIds:[sale.id,buy.id,trade.receipt.id,discounted.receipt.id],actualAuthRpc:true,modernReceipts:4,costSnapshots:3,knownZeroAnd321:true,acquiredCopies:2,retainedOutgoingDispositions:2,productionWrites:0};
}finally{
 await db.query('rollback').catch(()=>{});
 if(flags){await db.query('begin');for(const t of controls)await db.query(`update ${t} set enabled=$1`,[flags[t]]);if(cost)await db.query('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[cost.edit_enabled,cost.capture_enabled]);await db.query('commit');for(const t of controls)assert.equal((await q(`select enabled from ${t}`))[0].enabled,flags[t]);if(cost)assert.deepEqual((await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0],cost);save('modern-flags-restored.json',{at:new Date().toISOString(),flags,cost});}
 await client.auth.signOut({scope:'local'});await db.end();
}
assert.ok(result);save('modern-seed-result.json',result);console.log(JSON.stringify({status:'passed',lab}));
