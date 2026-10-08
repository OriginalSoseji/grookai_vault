// One-use synthetic authenticated purchase proof. Retain this lab and its journal.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {purchaseRequest,confirmedPurchaseReceipt} from '../../apps/web/src/lib/sales/salesPurchase.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_deal_release_20261008');
const base='C:/grookai_vault_operator_artifacts/product_deal_release_20261008',lab=base+'/full-432-v1',project='deal-full-432-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p));const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,432);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
assert.equal(Object.keys(freeze.sourceHashes).length,432);assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(lab+'/supabase/migrations/'+name)),digest,name);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33641');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const p of [33640,33641])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33640/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const auth={persistSession:false,autoRefreshToken:false};
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),clients=[];
const out=base+'/purchase-rpc-'+Date.now();fs.mkdirSync(out);
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const fixture={at:new Date().toISOString(),project,set:randomUUID(),card:randomUUID(),printing:randomUUID(),users:[],requests:[]};
let flags,result;
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,432);
 assert.equal((await q("select to_regclass('public.vendor_receipt_delivery_control') is null absent"))[0].absent,true);
 flags=(await q('select (select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit'))[0];
 assert.deepEqual(flags,{purchase:false,cart:false,cloud:false,capture:false,edit:false});
 const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots'];
 const retained={};for(const t of tables)retained[t]=await q(`select to_jsonb(t) row from ${t} t`);
 save('intent.private.json',{...fixture,flags,retained,consumed:true,productionWrites:0});
 for(let i=0;i<2;i++){
  const email=randomUUID()+'@purchase-proof.invalid',password=randomUUID()+'Aa9!';
  const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);const owner=made.data.user.id;
  fixture.users.push({owner,email});fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));
  const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);clients.push(client);
 }
 await q('begin');
 await q("insert into sets(id,code,name,game) values($1,$2,'Purchase synthetic set','pokemon')",[fixture.set,fixture.set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Purchase synthetic card','1',$3,'missing')",[fixture.card,fixture.set,'GV-PK-BUY-'+fixture.card]);
 await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[fixture.printing,fixture.card,'GV-PK-BUY-'+fixture.card+'-STD']);
 await q('commit');
 const owner=fixture.users[0].owner,client=clients[0];
 const line=(patch={})=>({description:'Reviewed card',quantity:1,unitMinor:650,referenceMinor:1000,rateBps:6500,cardId:fixture.card,printingId:fixture.printing,condition:'NM',addToVault:true,...patch});
 const input=(patch={})=>({storeName:'Synthetic purchase shop',items:[line()],payments:[{method:'Cash',amountMinor:650,tenderedMinor:650}],note:'Private purchase note',customerId:null,customer:{name:'Sample seller',email:'',phone:'',wants:'',notes:'Private seller context'},confirmed:true,...patch});
 const request=(value=input())=>{const r=purchaseRequest(value,randomUUID());fixture.requests.push(r.id);fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));return r;};
 const call=(r,c=client)=>c.rpc('vendor_sales_cart_complete_v4',{p_request_id:r.id,p_cart:r.cart});
 const first=request();assert.equal((await call(first)).error?.code,'42501');
 assert.equal((await q('select count(*)::int n from vendor_sales_cart_receipts where owner_id=$1',[owner]))[0].n,0);
 await q('begin');await q('update vendor_purchase_control set enabled=true');await q('update vendor_sales_cart_control set enabled=true');await q('update vendor_receipt_cloud_control set enabled=true');await q('update vendor_cost_evidence_control set capture_enabled=true');await q('commit');
 const replies=await Promise.all([call(first),call(first)]);for(const reply of replies){assert.equal(reply.error,null);confirmedPurchaseReceipt(reply.data,first);}assert.deepEqual(replies[0].data,replies[1].data);
 const receipt=replies[0].data;const costs=await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where user_id=$1 and id=$2',[owner,receipt.items[0].instanceId]);assert.equal(costs.length,1);assert.equal(Number(costs[0].amount),6.5);assert.equal(costs[0].currency,'USD');
 assert.equal((await q('select count(*)::int n from vendor_sale_cost_snapshots where owner_id=$1',[owner]))[0].n,0);
 const changed=structuredClone(first);changed.cart.note+=' changed';assert.equal((await call(changed)).error?.code,'22023');
 const foreign=await clients[1].rpc('vendor_sales_cart_read_v1',{p_request_id:first.id});assert.equal(foreign.error,null);assert.equal(foreign.data,null);
 const before=(await q('select (select count(*) from vault_item_instances where user_id=$1)::int copies,(select revision from vendor_receipt_books where owner_id=$1) revision',[owner]))[0];
 const bad=request(input({items:[line(),line({printingId:randomUUID()})],payments:[{method:'Other',amountMinor:1300,tenderedMinor:1300}]}));assert.equal((await call(bad)).error?.code,'22023');
 assert.deepEqual((await q('select (select count(*) from vault_item_instances where user_id=$1)::int copies,(select revision from vendor_receipt_books where owner_id=$1) revision',[owner]))[0],before);
 assert.equal((await client.rpc('vendor_sales_cart_read_v1',{p_request_id:bad.id})).data,null);
 const mixed=request(input({items:[line({unitMinor:0}),line({unitMinor:700}),line({quantity:2,unitMinor:50,referenceMinor:null,rateBps:null,cardId:null,printingId:null,condition:null,addToVault:false})],payments:[{method:'Cash',amountMinor:300,tenderedMinor:300},{method:'Bank / payment app',amountMinor:500,tenderedMinor:500}]}));
 const mixedReply=await call(mixed);assert.equal(mixedReply.error,null);confirmedPurchaseReceipt(mixedReply.data,mixed);
 const zero=await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where id=$1',[mixedReply.data.items[0].instanceId]);assert.equal(Number(zero[0].amount),0);assert.equal(zero[0].currency,'USD');assert.equal(mixedReply.data.items[2].instanceId,null);
 const fifty=request(input({items:Array.from({length:50},()=>line()),payments:[{method:'Card (external terminal)',amountMinor:32500,tenderedMinor:32500}]}));const fiftyReply=await call(fifty);assert.equal(fiftyReply.error,null);confirmedPurchaseReceipt(fiftyReply.data,fifty);assert.equal(new Set(fiftyReply.data.items.map(i=>i.instanceId)).size,50);
 await q('update vendor_purchase_control set enabled=false');await q('update vendor_sales_cart_control set enabled=false');await q('update vendor_receipt_cloud_control set enabled=false');
 const recovered=await call(first);assert.equal(recovered.error,null);assert.deepEqual(recovered.data,receipt);assert.equal((await call(request())).error?.code,'42501');
 await q('update vendor_sales_cart_control set enabled=true');await q('update vendor_receipt_cloud_control set enabled=true');
 const sale=await client.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{version:1,storeName:'Synthetic purchase shop',method:'Cash',items:[{instanceId:null,description:'Subsequent sale',quantity:1,unitMinor:100}],taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}}});assert.equal(sale.error,null);assert.equal(sale.data.version,1);
 assert.equal((await q('select count(*)::int n from vendor_sale_cost_snapshots where owner_id=$1',[owner]))[0].n,1);
 const book=await client.rpc('vendor_receipt_book_read_v1');assert.equal(book.error,null);assert.equal(book.data.book.receipts.length,4);
 for(const t of tables){const after=await q(`select to_jsonb(t) row from ${t} t`);for(const prior of retained[t])assert.ok(after.some(row=>JSON.stringify(row)===JSON.stringify(prior)),t+': retained row changed');}
 result={at:new Date().toISOString(),status:'passed',packageHashes:freeze.sourceHashes,producerSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),project,concurrentIdentical:true,changedRetryRejected:true,ownerIsolation:true,lastLineRollback:true,zeroCost:true,mixedQuickAndCanonical:true,distinctIncomingCopies:53,featureOffRecovery:true,legacySaleAfterPurchase:true,saleSnapshots:1,retainedTables:tables.length,productionWrites:0,resets:0,sourceSha256:freeze.sourceHashes['20261008021000_vendor_purchase_v1.sql']};
}finally{
 await db.query('rollback').catch(()=>{});
 if(flags){await db.query('begin');await db.query('update vendor_purchase_control set enabled=$1',[flags.purchase]);await db.query('update vendor_sales_cart_control set enabled=$1',[flags.cart]);await db.query('update vendor_receipt_cloud_control set enabled=$1',[flags.cloud]);await db.query('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[flags.edit,flags.capture]);await db.query('commit');const restored=(await q('select (select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit'))[0];assert.deepEqual(restored,flags);save('flags-restored.json',{at:new Date().toISOString(),flags:restored});}
 for(const client of clients)await client.auth.signOut({scope:'local'});await db.end();
}

assert.ok(result);save('result.json',result);console.log(JSON.stringify({status:'passed',packageHashes:freeze.sourceHashes,producerSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),out}));
