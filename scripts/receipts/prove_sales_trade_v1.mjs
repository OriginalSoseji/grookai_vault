// Real local Auth + PostgREST + concurrent transactions; never production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root='C:/gv_sales_trade_ins_20261003',project='sales-trade-full-427-v2-20261003';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const fixture='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/full-427-v2';
const req=createRequire('C:/gv_sales_trade_ins_20261003/package.json');
const web=createRequire('C:/gv_sales_trade_ins_20261003/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js');
// Bind mutations to the exact completed, isolated replay before reading credentials.
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
const replay=JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));
assert.equal(freeze.project,project);assert.equal(replay.project,project);
assert.equal(replay.status,'passed');assert.equal(replay.migrations,427);
assert.equal(replay.fullReplay,true);assert.equal(replay.noOpPush,true);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(digest(fixture+'/supabase/config.toml'),freeze.configSha256);
for(const [name,sha] of Object.entries(freeze.sourceHashes)){
 assert.equal(digest(root+'/supabase/migrations/'+name),sha,name);
 assert.equal(digest(fixture+'/supabase/migrations/'+name),sha,name);
}
const inspect=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
const database=inspect('inspect','supabase_db_'+project)[0];
assert.equal(database.State.Running,true);
assert.equal(database.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(database.NetworkSettings.Networks),[project]);
assert.equal(inspect('network','inspect',project)[0].Internal,true);
const relay=inspect('inspect',project+'-relay')[0];assert.equal(relay.State.Running,true);
for(const port of [65300,65301])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
// CLI network is internal; all callers use only the task-specific loopback relay.
cfg.API_URL='http://127.0.0.1:65301';
cfg.DB_URL=new URL(cfg.DB_URL);cfg.DB_URL.hostname='127.0.0.1';cfg.DB_URL.port='65300';cfg.DB_URL=cfg.DB_URL.href;
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
assert.equal(typeof cfg.SECRET_KEY,'string');assert.equal(typeof cfg.PUBLISHABLE_KEY,'string');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}});
const publicKey=cfg.PUBLISHABLE_KEY;
const create=()=>createClient(cfg.API_URL,publicKey,{auth:{persistSession:false}});
const out='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/runtime-'+Date.now();fs.mkdirSync(out);
const ids=[],copies=[],anchors=[],password=randomUUID()+'Aa9!',set=randomUUID(),card=randomUUID(),checks=[];
const printing=randomUUID(),otherPrinting=randomUUID(),otherCard=randomUUID();
let failure,cleaned=false;
const cart=(items)=>({version:1,storeName:'Synthetic show vendor',method:'Cash',items,taxMinor:0,note:'Thank you',
 customerId:null,customer:{name:'Synthetic buyer',email:'buyer@fixture.invalid',phone:'',wants:'Pikachu under $50',notes:''}});
const line=(instanceId=null,price=1234)=>({instanceId,description:'Synthetic card',quantity:1,unitMinor:price});
const complete=(client,request,payload)=>client.rpc('vendor_sales_cart_complete_v1',{p_request_id:request,p_cart:payload});
const scalar=async(q,p=[])=>(await db.query(q,p)).rows[0];
try{
 assert.equal((await scalar('select count(*)::int n from supabase_migrations.schema_migrations')).n,427);
 assert.equal((await scalar('select count(*)::int n from auth.users')).n,0);
 assert.equal((await scalar("select current_setting('max_worker_processes') n")).n,'0');
 assert.equal((await scalar('select enabled from vendor_sales_cart_control')).enabled,false);
 const clients=[];
 for(const who of ['owner','other']){
   const email=who+'@sales-cart.invalid';const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);ids.push(created.data.user.id);
   const client=create();assert.equal((await client.auth.signInWithPassword({email,password})).error,null);clients.push(client);
 }
 const [owner,other]=clients;
 assert.equal((await owner.rpc('vendor_sales_cart_available_v1')).data,false);
 assert.equal((await complete(owner,randomUUID(),cart([line()]))).error?.code,'42501');
 assert.ok((await create().rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:cart([line()])})).error);
 await db.query('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true');
 assert.equal((await owner.rpc('vendor_sales_cart_available_v1')).data,true);
 for(const table of ['vendor_sales_cart_receipts','vendor_sales_cart_control','vendor_receipt_books'])assert.ok((await owner.from(table).select('*')).error);
 checks.push('Real Auth, default-off enforcement, anonymous denial and private base tables');
 await db.query("insert into sets(id,code,name,game) values($1::uuid,$2,'Sales cart fixture','pokemon')",[set,set]);
 await db.query("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Synthetic card','1','GV-PK-SALESCART-001','missing')",[card,set]);
 async function copy(user=ids[0]){
   const anchor=randomUUID(),id=randomUUID();anchors.push(anchor);copies.push(id);
   await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic card','GV-PK-SALESCART-001')",[anchor,user,card]);
   await db.query('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,$5)',[id,user,card,anchor,'GVVI-SALESCART-'+String(copies.length).padStart(6,'0')]);return id;
 }
 const a=await copy(),b=await copy(),foreign=await copy(ids[1]);
 const mixed=cart([line(a),line(b,2500),{...line(null,500),quantity:2,description:'Unlisted walk-up item'}]);mixed.taxMinor=123;
 const request=randomUUID(),first=await complete(owner,request,mixed);assert.equal(first.error,null);assert.equal(first.data.totalMinor,4857);
 assert.equal(first.data.items.length,3);assert.equal((await scalar('select count(*)::int n from vault_item_instances where id=any($1::uuid[]) and archived_at is not null',[[a,b]])).n,2);
 const book=(await owner.rpc('vendor_receipt_book_read_v1')).data;assert.equal(book.book.receipts.length,1);assert.equal(book.book.customers.length,1);
 assert.equal(book.book.customers[0].wants,'Pikachu under $50');assert.equal(book.book.receipts[0].receipt.id,request);
 // Responses lost after successful commit recover forever, even after other sales.
 assert.deepEqual((await complete(owner,request,mixed)).data,first.data);
 assert.equal((await complete(owner,request,{...mixed,note:'Changed'})).error?.code,'22023');
 assert.equal((await other.rpc('vendor_sales_cart_read_v1',{p_request_id:request})).data,null);
 for(const d of (await db.query('select id from vault_item_instance_dispositions where vault_item_instance_id=any($1::uuid[])',[[a,b]])).rows){
   assert.equal((await owner.rpc('vendor_sales_cart_source_v1',{p_disposition_id:d.id})).data,first.data.sourceDispositionId);
   assert.equal((await other.rpc('vendor_sales_cart_source_v1',{p_disposition_id:d.id})).data,null);
 }
 checks.push('Mixed 2-copy + manual-quantity cart, server cents/tax, atomic receipt/customer, sibling IDs, replay and cross-owner recovery denial');
 const active=await copy();
 for(const payload of [cart([line(active),line(foreign)]),cart([line(active),line(a)]),cart([line(active),line(active)]),cart([line(active),{...line(),unitMinor:1.1}]),cart([line(active),{...line(),quantity:1000}]),{...cart([line(active)]),ownerId:ids[1]}]){
   assert.ok((await complete(owner,randomUUID(),payload)).error);
   assert.equal((await scalar('select archived_at from vault_item_instances where id=$1',[active])).archived_at,null);
   assert.equal((await owner.rpc('vendor_receipt_book_read_v1')).data.revision,book.revision);
 }
 checks.push('Foreign, archived, duplicate copies and malformed amounts roll back every copy and receipt');
 const raceCopy=await copy(),raceRequest=randomUUID(),raceCart=cart([line(raceCopy)]);
 const retries=await Promise.all([complete(owner,raceRequest,raceCart),complete(owner,raceRequest,raceCart)]);
 assert.ok(retries.every(r=>!r.error));assert.deepEqual(retries[0].data,retries[1].data);
 const raced=await copy();const competitors=await Promise.all([complete(owner,randomUUID(),cart([line(raced)])),complete(owner,randomUUID(),cart([line(raced)]))]);
 assert.equal(competitors.filter(r=>!r.error).length,1);assert.equal((await scalar('select count(*)::int n from vault_item_instance_dispositions where vault_item_instance_id=$1',[raced])).n,1);
 const legacyRace=await copy();const arbitration=await Promise.all([complete(owner,randomUUID(),cart([line(legacyRace)])),owner.rpc('vault_record_exact_instance_disposition_v2',{p_instance_id:legacyRace,p_disposition_type:'sale',p_sale_price_amount:10,p_sale_price_currency:'USD'})]);
 assert.equal(arbitration.filter(r=>!r.error).length,1);
 checks.push('Concurrent identical requests return one receipt; competing carts and legacy single-copy sale have exactly one winner');
 const customerId=book.book.customers[0].id;const existing={...cart([line()]),customerId,customer:{name:'stale overwrite',email:'',phone:'',wants:'',notes:''}};
 const customersBefore=(await owner.rpc('vendor_receipt_book_read_v1')).data.book.customers.length;
 const next=await complete(owner,randomUUID(),existing);assert.equal(next.error,null);assert.equal(next.data.customerName,'Synthetic buyer');
 assert.equal((await owner.rpc('vendor_receipt_book_read_v1')).data.book.customers.length,customersBefore);
 const stale=await owner.rpc('vendor_receipt_book_save_v1',{p_revision:book.revision,p_request_id:randomUUID(),p_book:book.book});assert.equal(stale.error?.code,'PT409');

 // Trade-ins remain behind their own database control, including direct RPCs.
 const completeTrade=(c,id,p)=>c.rpc('vendor_sales_cart_complete_v2',{p_request_id:id,p_cart:p});
 const manual={description:'Quick customer card',quantity:1,valueMinor:999,rateBps:8250,cardId:null,printingId:null,condition:null,addToVault:false};
 const canonical={description:'caller label is not identity',quantity:1,valueMinor:10000,rateBps:8000,cardId:card,printingId:printing,condition:'LP',addToVault:true};
 const tradeCart=(instanceId=null,trades=[manual])=>({...cart([line(instanceId,10000)]),version:2,trades});
 assert.equal((await owner.rpc('vendor_sales_trade_available_v1')).data,false);
 assert.equal((await completeTrade(owner,randomUUID(),tradeCart())).error?.code,'42501');
 assert.ok((await completeTrade(create(),randomUUID(),tradeCart())).error);
 assert.ok((await owner.from('vendor_sales_trade_control').select('*')).error);
 await db.query('update vendor_sales_trade_control set enabled=true');
 const finish=(await scalar('select key from finish_keys where is_active order by sort_order limit 1')).key;
 await db.query("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Other synthetic card','2','GV-PK-TRADE-002','missing')",[otherCard,set]);
 await db.query('insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,$3,$4),($5,$6,$3,$7)',[printing,card,finish,'GV-PK-SALESCART-001-STD',otherPrinting,otherCard,'GV-PK-TRADE-002-STD']);
 const beforeBad=await scalar('select (select count(*)::int from vault_item_instances) copies,(select count(*)::int from vendor_sales_cart_receipts) receipts');
 for(const bad of [{...manual,rateBps:0},{...manual,rateBps:10001},{...manual,valueMinor:1.5},{...manual,creditMinor:999999},
   {...manual,quantity:0},{...manual,addToVault:true},{...canonical,printingId:otherPrinting},{...canonical,printingId:null},{...canonical,condition:'fake'},
   {...canonical,quantity:2},{...canonical,ownerId:ids[1]}])assert.ok((await completeTrade(owner,randomUUID(),tradeCart(null,[bad]))).error);
 assert.ok((await completeTrade(owner,randomUUID(),tradeCart(foreign,[canonical]))).error);
 assert.deepEqual(await scalar('select (select count(*)::int from vault_item_instances) copies,(select count(*)::int from vendor_sales_cart_receipts) receipts'),beforeBad);
 const tradeCopy=await copy(),tradeRequest=randomUUID(),deal=tradeCart(tradeCopy,[canonical,manual]);
 const same=await Promise.all([completeTrade(owner,tradeRequest,deal),completeTrade(owner,tradeRequest,deal)]);
 assert.equal(same[0].error,null);assert.equal(same[1].error,null);assert.deepEqual(same[0].data,same[1].data);
 const traded=same[0].data;
 assert.equal(traded.totalMinor,10000);assert.equal(traded.tradeIn.totalCreditMinor,8824);assert.equal(traded.tradeIn.balanceMinor,1176);
 assert.equal(traded.tradeIn.items[0].printingGvId,'GV-PK-SALESCART-001-STD');assert.ok(traded.tradeIn.items[0].description.includes('Synthetic card'));
 assert.ok(!traded.tradeIn.items[0].description.includes('caller label'));assert.equal(traded.tradeIn.items[1].instanceId,null);
 const incoming=await scalar('select user_id,card_print_id,card_printing_id,condition_label,intent,archived_at from vault_item_instances where id=$1',[traded.tradeIn.items[0].instanceId]);
 assert.equal(incoming.user_id,ids[0]);assert.equal(incoming.card_print_id,card);assert.equal(incoming.card_printing_id,printing);assert.equal(incoming.intent,'hold');assert.equal(incoming.archived_at,null);
 assert.equal((await other.rpc('vendor_sales_cart_read_v1',{p_request_id:tradeRequest})).data,null);
 assert.equal((await completeTrade(owner,tradeRequest,{...deal,trades:[manual]})).error?.code,'22023');
 const latest=(await owner.rpc('vendor_receipt_book_read_v1')).data;
 const webBook=(await import('../../apps/web/src/lib/receipts/receiptBook.mjs')).parseBackup(JSON.stringify(latest.book));
 assert.deepEqual(webBook.receipts.find(r=>r.receipt.id===tradeRequest).receipt.tradeIn,traded.tradeIn);
 const forged=structuredClone(latest.book);forged.receipts.find(r=>r.receipt.id===tradeRequest).receipt.tradeIn.balanceMinor=0;
 assert.ok((await owner.rpc('vendor_receipt_book_save_v1',{p_revision:latest.revision,p_request_id:randomUUID(),p_book:forged})).error);
 const erased=structuredClone(latest.book);delete erased.receipts.find(r=>r.receipt.id===tradeRequest).receipt.tradeIn;
 assert.ok((await owner.rpc('vendor_receipt_book_save_v1',{p_revision:latest.revision,p_request_id:randomUUID(),p_book:erased})).error);
 const paid=await completeTrade(owner,randomUUID(),tradeCart(null,[{...manual,valueMinor:20000,rateBps:8000}]));
 assert.equal(paid.error,null);assert.equal(paid.data.tradeIn.balanceMinor,-6000);
 const even=await completeTrade(owner,randomUUID(),tradeCart(null,[{...manual,valueMinor:12500,rateBps:8000}]));
 assert.equal(even.error,null);assert.equal(even.data.tradeIn.balanceMinor,0);
 const conflictCopy=await copy();const copiesBefore=(await scalar('select count(*)::int n from vault_item_instances')).n;
 const competition=await Promise.all([completeTrade(owner,randomUUID(),tradeCart(conflictCopy,[canonical])),completeTrade(owner,randomUUID(),tradeCart(conflictCopy,[canonical]))]);
 assert.equal(competition.filter(r=>!r.error).length,1);assert.equal((await scalar('select count(*)::int n from vault_item_instances')).n,copiesBefore+1);
 await db.query("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic trade proof')",[printing]);
 assert.equal((await completeTrade(owner,randomUUID(),tradeCart(null,[canonical]))).error?.code,'22023');
 assert.deepEqual((await completeTrade(owner,tradeRequest,deal)).data,traded);
 await db.query('update vendor_sales_trade_control set enabled=false');
 assert.equal((await completeTrade(owner,randomUUID(),tradeCart())).error?.code,'42501');
 assert.deepEqual((await completeTrade(owner,tradeRequest,deal)).data,traded);
 checks.push('Trade RPC gates, authoritative cent/percentage math, wrong-parent and quarantine denial, quick/canonical snapshots, incoming stock atomically committed, concurrency/rollback, private recovery, immutable cloud/backup parity, even trade/customer payout and disablement');

 await db.query('update vendor_sales_cart_control set enabled=false');
 assert.deepEqual((await complete(owner,request,mixed)).data,first.data);
 assert.deepEqual((await owner.rpc('vendor_sales_cart_read_v1',{p_request_id:request})).data,first.data);
 assert.equal((await complete(owner,randomUUID(),cart([line()]))).error?.code,'42501');
 checks.push('Saved customer selected without overwriting newer data; stale web book cannot erase cart sale; rollback denies new sales but retains recovery');
}catch(error){failure=error;}finally{
 await db.query('begin');try{
   await db.query('set local session_replication_role=replica');
   await db.query('delete from vault_item_instance_dispositions where user_id=any($1::uuid[])',[ids]);
   await db.query('delete from vault_item_instances where user_id=any($1::uuid[])',[ids]);
   await db.query('delete from vault_items where user_id=any($1::uuid[])',[ids]);
   await db.query('delete from pricing_watch where card_print_id=$1',[card]);
   await db.query('delete from card_printing_truth_reviews where card_printing_id=any($1::uuid[])',[[printing,otherPrinting]]);
   await db.query('delete from card_printings where id=any($1::uuid[])',[[printing,otherPrinting]]);
   await db.query('delete from pricing_watch where card_print_id=$1',[otherCard]);
   await db.query('delete from card_prints where id=any($1::uuid[])',[[card,otherCard]]);await db.query('delete from sets where id=$1',[set]);
   await db.query('delete from card_events where actor_user_id=any($1::uuid[]) or subject_user_id=any($1::uuid[])',[ids]);
   await db.query('set local session_replication_role=origin');await db.query('delete from auth.users where id=any($1::uuid[])',[ids]);
   await db.query('update vendor_sales_trade_control set enabled=false;update vendor_sales_cart_control set enabled=false;update vendor_receipt_cloud_control set enabled=false');
   await db.query('commit');cleaned=true;
 }catch(error){await db.query('rollback');failure??=error;}
 await db.end();
}
const paths=['supabase/migrations/20261004160000_sales_trade_ins_v1.sql','scripts/receipts/prove_sales_trade_v1.mjs','apps/web/src/lib/receipts/receiptBook.mjs','apps/web/src/lib/receipts/tradeReceipt.mjs'];
const result={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,cleanup:cleaned,actualAuth:true,actualHTTP:true,productionWrites:0,
 sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));if(failure)throw failure;
