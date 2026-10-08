// One-use synthetic authenticated negotiated-trade proof. Retain this lab and its journal.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
import {validateNegotiatedTradeRequest,confirmedNegotiatedTrade} from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import {paymentSnapshot,paymentMethod} from '../../apps/web/src/lib/sales/salesPayments.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_negotiated_trade_20261007');
const base='C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007',lab=base+'/full-433-v4',project='product-trade-full-433-v4-20261007';
const read=p=>JSON.parse(fs.readFileSync(p));const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33561');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const p of [33560,33561])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33560/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const auth={persistSession:false,autoRefreshToken:false};
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth}),clients=[];
const out=base+'/rpc-'+Date.now();fs.mkdirSync(out);
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const fixture={at:new Date().toISOString(),project,set:randomUUID(),card:randomUUID(),printing:randomUUID(),users:[],requests:[]};
let flags,result;
const flagSql='select (select enabled from vendor_negotiated_trade_control) negotiated,(select enabled from vendor_sales_trade_control) trade,(select enabled from vendor_sales_payment_control) payment,(select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit';
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots'];
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 flags=(await q(flagSql))[0];assert.deepEqual(flags,{negotiated:false,trade:false,payment:false,purchase:false,cart:false,cloud:false,capture:false,edit:false});
 const retained={};for(const t of tables)retained[t]=await q(`select to_jsonb(t) row from ${t} t`);
 save('intent.private.json',{...fixture,flags,retained,consumed:true,productionWrites:0});
 for(let i=0;i<2;i++){
  const email=randomUUID()+'@negotiated-trade-proof.invalid',password=randomUUID()+'Aa9!';
  const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
  fixture.users.push({owner:made.data.user.id,email});fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));
  const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});assert.equal((await client.auth.signInWithPassword({email,password})).error,null);clients.push(client);
 }
 const owner=fixture.users[0].owner,client=clients[0];
 await q('begin');
 await q("insert into sets(id,code,name,game) values($1,$2,'Negotiated trade synthetic set','pokemon')",[fixture.set,fixture.set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Negotiated synthetic card','1',$3,'missing')",[fixture.card,fixture.set,'GV-PK-TRADE-'+fixture.card]);
 await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[fixture.printing,fixture.card,'GV-PK-TRADE-'+fixture.card+'-STD']);
 await q("select public.admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'LP',p_card_printing_id=>$3::uuid)",[owner,fixture.card,fixture.printing]);
 const outgoing=(await q('select id,gv_vi_id from vault_item_instances where user_id=$1',[owner]))[0];
 await q("update vault_item_instances set acquisition_cost=3.21,acquisition_currency='USD' where id=$1",[outgoing.id]);
 await q('commit');
 const line=(patch={})=>({description:'Reviewed incoming card',quantity:1,valueMinor:1000,rateBps:6000,creditMinor:650,cardId:fixture.card,printingId:fixture.printing,condition:'NM',addToVault:true,...patch});
 const request=(patch={})=>{
  const cart={version:5,storeName:'Synthetic trade shop',items:[{instanceId:null,description:'Quick sale',quantity:1,unitMinor:1000}],taxMinor:0,note:'PRIVATE TRADE NOTE',customerId:null,customer:{name:'Sample trader',email:'',phone:'',wants:'',notes:'PRIVATE CONTACT'},trades:[line()],...patch};
  const balance=cart.items.reduce((s,i)=>s+i.quantity*i.unitMinor,cart.taxMinor)-cart.trades.reduce((s,i)=>s+i.creditMinor,0);
  cart.payments??=balance===0?[]:[{method:'Cash',amountMinor:Math.abs(balance),tenderedMinor:Math.abs(balance)+(balance>0?150:0)}];
  cart.method=paymentMethod(paymentSnapshot(cart.payments,balance).entries);
  const r=validateNegotiatedTradeRequest({id:randomUUID(),cart});fixture.requests.push(r.id);fs.writeFileSync(out+'/fixture.private.json',JSON.stringify(fixture,null,2));return r;
 };
 const call=(r,c=client)=>c.rpc('vendor_sales_cart_complete_v5',{p_request_id:r.id,p_cart:r.cart});
 const recover=(r,c=client)=>c.rpc('vendor_sales_cart_read_v2',{p_request_id:r.id,p_cart:r.cart});
 const first=request({items:[{instanceId:outgoing.id,description:'Exact outgoing card',quantity:1,unitMinor:1000}]});
 assert.equal((await call(first)).error?.code,'42501');assert.equal((await recover(first)).data,null);
 await q('begin');
 for(const table of ['vendor_sales_cart_control','vendor_receipt_cloud_control','vendor_sales_trade_control','vendor_sales_payment_control','vendor_negotiated_trade_control'])await q(`update ${table} set enabled=true`);
 await q('update vendor_cost_evidence_control set capture_enabled=true');await q('commit');
 for(const table of ['vendor_negotiated_trade_control','vendor_sales_trade_control','vendor_sales_payment_control','vendor_sales_cart_control','vendor_receipt_cloud_control']){
  await q(`update ${table} set enabled=false`);assert.equal((await call(first)).error?.code,'42501',table);
  assert.equal((await recover(first)).data,null);await q(`update ${table} set enabled=true`);
 }
 const replies=await Promise.all([call(first),call(first)]);
 for(const reply of replies){assert.equal(reply.error,null,JSON.stringify(reply.error));confirmedNegotiatedTrade(reply.data,first);}
 assert.deepEqual(replies[0].data,replies[1].data);const ack=replies[0].data,receipt=ack.receipt;
 assert.deepEqual((await recover(first)).data,ack);assert.equal(receipt.tradeIn.totalCreditMinor,650);assert.equal(receipt.tradeIn.items[0].rateBps,6000);
 assert.equal(receipt.items[0].description,'Exact outgoing card');assert.ok(!JSON.stringify(receipt).includes(outgoing.gv_vi_id));
 const acquired=(await q('select acquisition_cost::text amount,acquisition_currency currency,card_print_id,card_printing_id,condition_label from vault_item_instances where id=$1 and user_id=$2',[receipt.tradeIn.items[0].instanceId,owner]))[0];
 assert.equal(Number(acquired.amount),6.5);assert.equal(acquired.currency,'USD');assert.equal(acquired.card_print_id,fixture.card);assert.equal(acquired.card_printing_id,fixture.printing);assert.equal(acquired.condition_label,'NM');
 const cost=(await q('select to_jsonb(t) value from vendor_sale_cost_snapshots t where owner_id=$1 and request_id=$2',[owner,first.id]))[0];
 assert.ok(cost,'Outgoing cost snapshot missing');
 assert.equal(cost.value.snapshot.lines[0].instanceId,outgoing.id);assert.equal(cost.value.snapshot.lines[0].cost.minor,'321');
 assert.equal(cost.value.snapshot.lines[0].cost.currency,'USD');save('outgoing-cost.private.json',cost);
 const changed=structuredClone(first);changed.cart.note+=' changed';
 const changedReplies=await Promise.all([call(changed),recover(changed)]);for(const reply of changedReplies)assert.equal(reply.error?.code,'22023');
 assert.equal((await recover(first,clients[1])).data,null);
 const raced=request(),alternate=structuredClone(raced);alternate.cart.note+=' alternate';
 const race=await Promise.all([call(raced),call(alternate)]),winner=race.findIndex(reply=>reply.error===null);
 assert.ok(winner===0||winner===1);assert.equal(race[1-winner].error?.code,'22023');
 confirmedNegotiatedTrade(race[winner].data,[raced,alternate][winner]);
 const inspect=async()=>await q('select (select count(*) from vault_item_instances where user_id=$1)::int copies,(select count(*) from vault_item_instance_dispositions where user_id=$1)::int dispositions,(select count(*) from vendor_sales_cart_receipts where owner_id=$1)::int requests,(select count(*) from vendor_sale_cost_snapshots where owner_id=$1)::int snapshots,(select revision from vendor_receipt_books where owner_id=$1) revision',[owner]);
 const before=await inspect();
 const bad=request({trades:[line(),line({printingId:randomUUID()})]});assert.equal((await call(bad)).error?.code,'22023');assert.deepEqual(await inspect(),before);assert.equal((await recover(bad)).data,null);
 // A foreign outgoing copy also rolls back preceding canonical intake.
 await q("select public.admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'NM',p_card_printing_id=>$3::uuid)",[fixture.users[1].owner,fixture.card,fixture.printing]);
 const foreignCopy=(await q('select id from vault_item_instances where user_id=$1',[fixture.users[1].owner]))[0].id;
 const foreign=request({items:[{instanceId:foreignCopy,description:'Foreign copy',quantity:1,unitMinor:1000}]});assert.equal((await call(foreign)).error?.code,'PT409');assert.deepEqual(await inspect(),before);
 // Unknown reference, explicit zero and whole-line quick credit coexist.
 const mixed=request({trades:[line({creditMinor:0,valueMinor:null,rateBps:null}),line({creditMinor:700}),line({quantity:3,creditMinor:50,valueMinor:null,rateBps:null,cardId:null,printingId:null,condition:null,addToVault:false})],payments:[{method:'Cash',amountMinor:100,tenderedMinor:150},{method:'Bank / payment app',amountMinor:150,tenderedMinor:150}]});
 const mixedReply=await call(mixed);assert.equal(mixedReply.error,null,JSON.stringify(mixedReply.error));confirmedNegotiatedTrade(mixedReply.data,mixed);
 assert.equal(mixedReply.data.receipt.tradeIn.totalValueMinor,null);assert.equal(mixedReply.data.receipt.tradeIn.totalCreditMinor,750);
 const zero=(await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where id=$1',[mixedReply.data.receipt.tradeIn.items[0].instanceId]))[0];assert.equal(Number(zero.amount),0);assert.equal(zero.currency,'USD');assert.equal(mixedReply.data.receipt.tradeIn.items[2].instanceId,null);
 for(const creditMinor of [1000,1500]){const r=request({trades:[line({creditMinor,valueMinor:null,rateBps:null})]});const reply=await call(r);assert.equal(reply.error,null);confirmedNegotiatedTrade(reply.data,r);assert.equal(reply.data.receipt.tradeIn.balanceMinor,1000-creditMinor);}
 // Full bounds: fifty independently identified incoming copies in one transaction.
 const fifty=request({trades:Array.from({length:50},()=>line({creditMinor:1}))});const fiftyReply=await call(fifty);assert.equal(fiftyReply.error,null);confirmedNegotiatedTrade(fiftyReply.data,fifty);assert.equal(new Set(fiftyReply.data.receipt.tradeIn.items.map(i=>i.instanceId)).size,50);
 await q('begin');for(const table of ['vendor_negotiated_trade_control','vendor_sales_trade_control','vendor_sales_payment_control','vendor_sales_cart_control','vendor_receipt_cloud_control'])await q(`update ${table} set enabled=false`);await q('commit');
 const offBefore=await inspect();assert.deepEqual((await recover(first)).data,ack);assert.deepEqual((await call(first)).data,ack);assert.equal((await call(request())).error?.code,'42501');assert.deepEqual(await inspect(),offBefore);
 await q('begin');for(const table of ['vendor_purchase_control','vendor_sales_cart_control','vendor_receipt_cloud_control'])await q(`update ${table} set enabled=true`);await q('commit');
 const sale=await client.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{version:1,storeName:'Synthetic trade shop',method:'Cash',items:[{instanceId:null,description:'Later legacy sale',quantity:1,unitMinor:100}],taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}}});assert.equal(sale.error,null);
 const purchase=await client.rpc('vendor_sales_cart_complete_v4',{p_request_id:randomUUID(),p_cart:{version:4,kind:'purchase',storeName:'Synthetic trade shop',items:[{description:'Later quick purchase',quantity:1,unitMinor:100,referenceMinor:null,rateBps:null,cardId:null,printingId:null,condition:null,addToVault:false}],payments:[{method:'Cash',amountMinor:100,tenderedMinor:100}],note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}}});assert.equal(purchase.error,null,JSON.stringify(purchase.error));
 const book=await client.rpc('vendor_receipt_book_read_v1');assert.equal(book.error,null);assert.equal(book.data.book.receipts.length,8);
 const saved=await client.rpc('vendor_receipt_book_save_v1',{p_revision:book.data.revision,p_request_id:randomUUID(),p_book:book.data.book});assert.equal(saved.error,null,JSON.stringify(saved.error));
 for(const t of tables){const after=await q(`select to_jsonb(t) row from ${t} t`);for(const prior of retained[t])assert.ok(after.some(row=>JSON.stringify(row)===JSON.stringify(prior)),t+': retained row changed');}
 result={at:new Date().toISOString(),status:'passed',project,concurrentIdentical:true,concurrentChanged:true,allEntryDependenciesEnforced:true,changedRetryAndRecoveryRejected:true,ownerIsolation:true,lastLineRollback:true,foreignOutgoingRollback:true,explicitAgreedCost:true,outgoingCostSnapshot:true,privateOutgoingIdOmitted:true,zeroCost:true,mixedUnknownReferences:true,wholeLineQuickCredit:true,evenAndPayoutBalances:true,fiftyDistinctIncoming:true,featureOffRecovery:true,legacySaleAndPurchaseAfterNewTrade:true,mixedBookRoundTrip:true,retainedTables:tables.length,productionWrites:0,resets:0,sourceSha256:freeze.sourceHashes['20261008060000_vendor_negotiated_trade_v1.sql']};
}finally{
 await db.query('rollback').catch(()=>{});
 if(flags){await db.query('begin');for(const [table,field]of [['vendor_negotiated_trade_control','negotiated'],['vendor_sales_trade_control','trade'],['vendor_sales_payment_control','payment'],['vendor_purchase_control','purchase'],['vendor_sales_cart_control','cart'],['vendor_receipt_cloud_control','cloud']])await db.query(`update ${table} set enabled=$1`,[flags[field]]);await db.query('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[flags.edit,flags.capture]);await db.query('commit');const restored=(await q(flagSql))[0];assert.deepEqual(restored,flags);save('flags-restored.json',{at:new Date().toISOString(),flags:restored});}
 for(const client of clients)await client.auth.signOut({scope:'local'});await db.end();
}
assert.ok(result);save('result.json',result);console.log(JSON.stringify({status:'passed',out}));
