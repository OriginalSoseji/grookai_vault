// Real local Auth + PostgREST + concurrent transactions; never production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
assert.ok(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--release-package'));
const release=process.argv[2]==='--release-package';
const root='C:/gv_sales_split_payments_20261006',project=release?'sales-pay-full-429-release-v1-20261006':'sales-pay-full-430-v2-20261006';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const fixture='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/'+(release?'full-429-release-v1':'full-430-v2');
const req=createRequire('C:/gv_sales_split_payments_20261006/package.json');
const web=createRequire('C:/gv_sales_split_payments_20261006/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js');
// Bind mutations to the exact completed, isolated replay before reading credentials.
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
const replay=JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));
assert.equal(freeze.project,project);assert.equal(replay.project,project);
assert.equal(replay.status,'passed');assert.equal(replay.migrations,release?429:430);
if(release)assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
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
const dbPort=release?32900:32840;
for(const port of [dbPort,dbPort+1])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
// CLI network is internal; all callers use only the task-specific loopback relay.
cfg.API_URL='http://127.0.0.1:'+(dbPort+1);
cfg.DB_URL=new URL(cfg.DB_URL);cfg.DB_URL.hostname='127.0.0.1';cfg.DB_URL.port=String(dbPort);cfg.DB_URL=cfg.DB_URL.href;
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
assert.equal(typeof cfg.SECRET_KEY,'string');assert.equal(typeof cfg.PUBLISHABLE_KEY,'string');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}});
const publicKey=cfg.PUBLISHABLE_KEY;
const create=()=>createClient(cfg.API_URL,publicKey,{auth:{persistSession:false}});
const out='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/runtime-'+Date.now();fs.mkdirSync(out);
const checks=[],ids=[],password=randomUUID()+'Aa9!',set=randomUUID(),card=randomUUID();let failure;
const q=async(sql,args=[])=> (await db.query(sql,args)).rows;
const rpc=async(c,name,args)=>{const r=await c.rpc(name,args);assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
const complete=(c,id,cart)=>c.rpc('vendor_sales_cart_complete_v3',{p_request_id:id,p_cart:cart});
const tender=(method,amountMinor,tenderedMinor=amountMinor)=>({method,amountMinor,tenderedMinor});
const line=(id=null,n=10000)=>({instanceId:id,description:'Synthetic payment card',quantity:1,unitMinor:n});
const cart=(items=[line()],payments=[tender('Cash',4000,5000),tender('Card (external terminal)',6000)])=>({version:3,storeName:'Synthetic split shop',items,trades:[],payments,method:payments.length>1?'Split payment':payments[0]?.method??'Other',taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}});
try{
 assert.equal((await q('select count(*)::int n from auth.users'))[0].n,0,'Use the empty completed replay once');
 assert.equal((await q("select current_setting('max_worker_processes') n"))[0].n,'0');
 const clients=[];
 for(const who of ['owner','other']){const email=who+'-'+randomUUID()+'@payments.invalid';const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(r.error,null);ids.push(r.data.user.id);const c=create();assert.equal((await c.auth.signInWithPassword({email,password})).error,null);clients.push(c);}
 const [owner,other]=clients;
 assert.equal(await rpc(owner,'vendor_sales_payments_available_v1'),false);
 assert.equal((await complete(owner,randomUUID(),cart())).error?.code,'42501');
 assert.ok((await complete(create(),randomUUID(),cart())).error);
 for(const table of ['vendor_sales_payment_control','vendor_sales_cart_receipts','vendor_receipt_books'])assert.ok((await owner.from(table).select('*')).error);
 assert.ok((await owner.rpc('vendor_sales_payment_snapshot_v1',{entries:[],balance:0})).error);
 await q('update vendor_receipt_cloud_control set enabled=true; update vendor_sales_cart_control set enabled=true');
 assert.equal(await rpc(owner,'vendor_sales_payments_available_v1'),false);
 const legacy={...cart(),version:1,method:'Cash'};delete legacy.trades;delete legacy.payments;
 await rpc(owner,'vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:legacy});
 await q('update vendor_sales_payment_control set enabled=true');assert.equal(await rpc(owner,'vendor_sales_payments_available_v1'),true);
 checks.push('real Auth, anonymous/base-table/private-helper denial, default-off flag, legacy v1 works while split disabled');
 const vectors=JSON.parse(fs.readFileSync(root+'/test/fixtures/sales/payment_vectors.json'));
 for(const v of vectors){if(v.valid){const p=(await q('select vendor_sales_payment_snapshot_v1($1::jsonb,$2::bigint) p',[JSON.stringify(v.entries),v.balance]))[0].p;assert.equal(p.changeMinor,v.change);}else{await assert.rejects(q('select vendor_sales_payment_snapshot_v1($1::jsonb,$2::bigint)',[JSON.stringify(v.entries),v.balance]),e=>e.code==='22023');}}
 checks.push('all 24 shared JS/Dart/SQL payment vectors');
 await q("insert into sets(id,code,name,game) values($1,$2,'Payment test','pokemon')",[set,set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id) values($1,(select id from games where code='pokemon'),$2,'Payment fixture','1','GV-PK-PAYMENTS-001')",[card,set]);
 let count=0;
 async function copy(user=ids[0]){const id=randomUUID(),anchor=randomUUID();await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Payment fixture','GV-PK-PAYMENTS-001')",[anchor,user,card]);await q('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,$5)',[id,user,card,anchor,'GVVI-PAYMENTS-'+String(++count).padStart(6,'0')]);return id;}
 const active=await copy(),foreign=await copy(ids[1]);
 const before=(await rpc(owner,'vendor_receipt_book_read_v1')).revision;
 for(const payload of [cart([line(active)],[tender('Cash',9999)]),{...cart([line(active)]),method:'Cash'},cart([line(active),line(foreign)],[tender('Cash',20000)]),cart([line(active)],[tender('Cash',4000),tender('Cash',6000)]),{...cart([line(active)]),ownerId:ids[1]}]){
  assert.ok((await complete(owner,randomUUID(),payload)).error);assert.equal((await q('select archived_at from vault_item_instances where id=$1',[active]))[0].archived_at,null);assert.equal((await rpc(owner,'vendor_receipt_book_read_v1')).revision,before);
 }
 const id=randomUUID(),payload=cart([line(active)]),retries=await Promise.all([complete(owner,id,payload),complete(owner,id,payload)]);
 assert.ok(retries.every(r=>!r.error),JSON.stringify(retries.map(r=>r.error)));assert.deepEqual(retries[0].data,retries[1].data);const saved=retries[0].data;
 assert.equal(saved.payments.changeMinor,1000);assert.equal(saved.totalMinor,10000);assert.equal((await q('select count(*)::int n from vault_item_instance_dispositions where vault_item_instance_id=$1',[active]))[0].n,1);
 assert.equal((await complete(owner,id,{...payload,payments:[tender('Cash',10000)],method:'Cash'})).error?.code,'22023');
 assert.equal(await rpc(other,'vendor_sales_cart_read_v1',{p_request_id:id}),null);
 checks.push('invalid allocations/foreign copy/forged owner roll back; concurrent retry records one immutable receipt and disposition');
 const raced=await copy();const race=await Promise.all([complete(owner,randomUUID(),cart([line(raced)])),owner.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{...legacy,items:[line(raced)]}})]);assert.equal(race.filter(r=>!r.error).length,1);assert.equal((await q('select count(*)::int n from vault_item_instance_dispositions where vault_item_instance_id=$1',[raced]))[0].n,1);
 const directRace=await copy();const arbitration=await Promise.all([complete(owner,randomUUID(),cart([line(directRace)])),owner.rpc('vault_record_exact_instance_disposition_v2',{p_instance_id:directRace,p_disposition_type:'sale',p_sale_price_amount:100,p_sale_price_currency:'USD'})]);assert.equal(arbitration.filter(r=>!r.error).length,1);
 checks.push('v3 versus legacy cart and manual disposition races have one winner');
 const trade=n=>({description:'Incoming quick card',quantity:1,valueMinor:n,rateBps:10000,cardId:null,printingId:null,condition:null,addToVault:false});
 const even={...cart([line()],[]),trades:[trade(10000)]};assert.equal((await complete(owner,randomUUID(),even)).error?.code,'42501');await q('update vendor_sales_trade_control set enabled=true');
 const evenReceipt=await rpc(owner,'vendor_sales_cart_complete_v3',{p_request_id:randomUUID(),p_cart:even});assert.equal(evenReceipt.payments.balanceMinor,0);assert.deepEqual(evenReceipt.payments.entries,[]);
 const payout={...cart([line()],[tender('Cash',2000),tender('Bank / payment app',3000)]),trades:[trade(15000)]};const paid=await rpc(owner,'vendor_sales_cart_complete_v3',{p_request_id:randomUUID(),p_cart:payout});assert.equal(paid.payments.balanceMinor,-5000);
 assert.equal((await complete(owner,randomUUID(),{...payout,payments:[tender('Cash',2000,3000),tender('Bank / payment app',3000)]})).error?.code,'22023');
 const book=await rpc(owner,'vendor_receipt_book_read_v1');const bad=structuredClone(book.book);bad.receipts.find(r=>r.receipt.id===id).receipt.payments.changeMinor=0;
 assert.ok((await owner.rpc('vendor_receipt_book_save_v1',{p_revision:book.revision,p_request_id:randomUUID(),p_book:bad})).error);
 await q('update vendor_sales_payment_control set enabled=false');assert.equal((await complete(owner,randomUUID(),cart())).error?.code,'42501');assert.deepEqual((await complete(owner,id,payload)).data,saved);assert.deepEqual(await rpc(owner,'vendor_sales_cart_read_v1',{p_request_id:id}),saved);
 checks.push('even trade, split customer payout, no payout change, immutable receipt history and recovery after feature disablement');
 const {parseBackup,receiptText}=await import('../../apps/web/src/lib/receipts/receiptBook.mjs');const restored=parseBackup(JSON.stringify(book.book));assert.equal(restored.receipts.length,book.book.receipts.length);assert.match(receiptText(saved),/Cash change: \$10.00/);
 checks.push('database-generated legacy and split receipts round-trip through actual web backup parser and receipt renderer');
}catch(e){failure={message:e.message,stack:e.stack};}
finally{await q('update vendor_receipt_cloud_control set enabled=false;update vendor_sales_cart_control set enabled=false;update vendor_sales_payment_control set enabled=false;update vendor_sales_trade_control set enabled=false');await db.end();}
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',failure,checks,project,syntheticUsers:ids,retainedSyntheticFixture:true,productionRequests:0,moneyMoved:0,flagsRestoredOff:true,releasePackage:release,out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));
if(release&&!failure)fs.writeFileSync('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/RELEASE_RPC.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({out,status:failure?'failed':'passed',checks,failure}));if(failure)process.exitCode=1;
