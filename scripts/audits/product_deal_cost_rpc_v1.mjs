// Real local Auth/PostgREST/SQL races. A task-owned populated lab is retained.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
assert.equal(process.argv.length,2);
const release=true;
const root='C:/gv_product_deal_release_20261008',project='deal-full-432-v1-20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const fixture='C:/grookai_vault_operator_artifacts/product_deal_release_20261008/'+'full-432-v1';
const req=createRequire(root+'/package.json');
const web=createRequire(root+'/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js');
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
assert.equal(Object.keys(freeze.sourceHashes).length,432);
const replay=JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));
assert.equal(freeze.project,project);assert.equal(replay.project,project);
assert.equal(replay.status,'passed');assert.equal(replay.migrations,432);
if(release)assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(digest(fixture+'/supabase/config.toml'),freeze.configSha256);
for(const [name,sha] of Object.entries(freeze.sourceHashes)){
 assert.equal(digest(root+'/supabase/migrations/'+name),sha,name);
 assert.equal(digest(fixture+'/supabase/migrations/'+name),sha,name);
}
const inspect=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
const database=inspect('inspect','supabase_db_'+project)[0];
assert.equal(database.State.Running,true);assert.equal(database.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(database.NetworkSettings.Networks),[project]);assert.equal(inspect('network','inspect',project)[0].Internal,true);
const relay=inspect('inspect',project+'-relay')[0];assert.equal(relay.State.Running,true);
const dbPort=33640;
for(const port of [dbPort,dbPort+1])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
cfg.API_URL='http://127.0.0.1:'+(dbPort+1);
const connection=new URL(cfg.DB_URL);connection.hostname='127.0.0.1';connection.port=String(dbPort);
const db=new Client({connectionString:connection.href});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}});
const create=()=>createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});
const rpc=async(c,name,args)=>{const r=await c.rpc(name,args);assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
const out='C:/grookai_vault_operator_artifacts/product_deal_release_20261008/cost-rpc-'+Date.now();fs.mkdirSync(out);
const checks=[],ids=[],password=randomUUID()+'Aa9!',set=randomUUID(),card=randomUUID();let failure;let retainedOwners=[];let retainedBefore;
const retainedSql=`select jsonb_build_object('users',(select jsonb_agg(to_jsonb(t) order by id) from auth.users t where id=any($1::uuid[])),
 'copies',(select jsonb_agg(to_jsonb(t) order by id) from vault_item_instances t where user_id=any($1::uuid[])),
 'books',(select jsonb_agg(to_jsonb(t) order by owner_id) from vendor_receipt_books t where owner_id=any($1::uuid[])),
 'costs',(select jsonb_agg(to_jsonb(t) order by owner_id,request_id) from vendor_sale_cost_snapshots t where owner_id=any($1::uuid[])),
 'requests',(select jsonb_agg(to_jsonb(t) order by owner_id,request_id) from vault_copy_cost_requests t where owner_id=any($1::uuid[]))) state`;
const line=(instanceId=null,unitMinor=10000)=>({instanceId,description:'Synthetic cost card',quantity:1,unitMinor});
const cart=(version,items)=>({version,storeName:'Synthetic cost shop',items,method:'Cash',taxMinor:0,note:'',customerId:null,
 customer:{name:'',email:'',phone:'',wants:'',notes:''},...(version>=2?{trades:[]}:{}),
 ...(version===2?{trades:[{description:'Incoming quick card',quantity:1,valueMinor:100,rateBps:10000,cardId:null,printingId:null,condition:null,addToVault:false}]}:{}),
 ...(version===3?{payments:[{method:'Cash',amountMinor:items.reduce((n,i)=>n+i.quantity*i.unitMinor,0),tenderedMinor:items.reduce((n,i)=>n+i.quantity*i.unitMinor,0)}]}:{})});
const args=(instanceId,amount,currency,expectedAmount=null,expectedCurrency=null,requestId=randomUUID())=>({p_request_id:requestId,p_instance_id:instanceId,p_amount:amount,p_currency:currency,p_expected_amount:expectedAmount,p_expected_currency:expectedCurrency});
let serial=0;
async function copy(amount=null,currency=null,user=ids[0]){
 const id=randomUUID(),anchor=randomUUID();
 await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Cost fixture',$4)",[anchor,user,card,'GV-PK-COST-'+card]);
 await q('insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id,acquisition_cost,acquisition_currency) values($1,$2,$3,$4,$5,$6,$7)',[id,user,card,anchor,('GVVI-COST-'+card+'-'+(++serial)).toUpperCase(),amount,currency]);return id;
}
const save=(c,a)=>c.rpc('vault_copy_cost_save_v1',a);
const sale=(c,id,payload)=>c.rpc('vendor_sales_cart_complete_v'+payload.version,{p_request_id:id,p_cart:payload});
const snapshot=async(c,id)=>(await rpc(c,'vendor_sale_cost_read_v1',{p_request_ids:[id]})).snapshots[0];
try{
 retainedOwners=(await q('select id from auth.users order by id')).map(r=>r.id);
 const priorOwners=[];
 for(const entry of fs.readdirSync('C:/grookai_vault_operator_artifacts/product_deal_release_20261008',{withFileTypes:true})){
   const receiptPath='C:/grookai_vault_operator_artifacts/product_deal_release_20261008/'+entry.name+'/receipt.json';
   if(entry.isDirectory()&&entry.name.startsWith('cost-rpc-')&&fs.existsSync(receiptPath)){
     const prior=JSON.parse(fs.readFileSync(receiptPath));if(prior.project===project)priorOwners.push(...prior.fixtureOwnerIds);
   }
 }
 assert.deepEqual(retainedOwners,[...new Set(priorOwners)].sort(),'Only recorded prior synthetic fixtures may exist');
 retainedBefore=(await q(retainedSql,[retainedOwners]))[0].state;
 assert.deepEqual((await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0],{edit_enabled:false,capture_enabled:false});
 assert.equal((await q("select current_setting('max_worker_processes') n"))[0].n,'0');
 if(release)assert.equal((await q("select to_regclass('public.vendor_receipt_delivery_control') is null absent"))[0].absent,true);
 const clients=[];
 for(const who of ['owner','other']){const email=who+'-'+randomUUID()+'@cost.invalid';const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(r.error,null);ids.push(r.data.user.id);const c=create();assert.equal((await c.auth.signInWithPassword({email,password})).error,null);clients.push(c);}
 const [owner,other]=clients;
 await q("insert into sets(id,code,name,game) values($1,$2,'Cost test','pokemon')",[set,set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,gv_id) values($1,(select id from games where code='pokemon'),$2,'Cost fixture','1',$3)",[card,set,'GV-PK-COST-'+card]);
 const active=await copy(),foreign=await copy(7,'USD',ids[1]);
 assert.equal((await save(owner,args(active,0,'USD'))).error?.code,'42501');
 assert.equal((await rpc(owner,'vault_copy_cost_read_v1',{p_instance_ids:[active,foreign]})).copies.length,1);
 for(const name of ['vault_copy_cost_read_v1','vendor_sale_cost_read_v1'])assert.ok((await create().rpc(name,name==='vault_copy_cost_read_v1'?{p_instance_ids:[active]}:{p_request_ids:[randomUUID()]})).error);
 for(const table of ['vendor_cost_evidence_control','vault_copy_cost_requests','vendor_sale_cost_snapshots'])assert.ok((await owner.from(table).select('*')).error);
 assert.ok((await owner.rpc('vendor_cost_classify_v1',{p_amount:0,p_currency:'USD'})).error);
 checks.push('real Auth, disabled editing, owner isolation, anonymous and private-table/helper denial');
 await q('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true;update vendor_sales_payment_control set enabled=true;update vendor_sales_trade_control set enabled=true');
 const oldId=randomUUID(),oldPayload=cart(1,[line(await copy(4,'USD'))]);
 assert.equal((await sale(owner,oldId,oldPayload)).error,null);assert.equal(await snapshot(owner,oldId),undefined);
 await q('update vendor_cost_evidence_control set edit_enabled=true,capture_enabled=true');
 assert.equal((await sale(owner,oldId,oldPayload)).error,null);assert.equal(await snapshot(owner,oldId),undefined);
 checks.push('disabled capture and old-sale retry never invent retrospective cost');
 for(const [amount,currency] of [[-1,'USD'],[1.001,'USD'],[1,null],[null,'USD'],[1,'usd'],[10000000000,'USD'],['NaN','USD'],['Infinity','USD']])assert.equal((await save(owner,args(active,amount,currency))).error?.code,'22023');
 assert.equal((await save(owner,args(foreign,1,'USD',7,'USD'))).error?.code,'PT409');
 const zeroArgs=args(active,0,'USD'),zero=await rpc(owner,'vault_copy_cost_save_v1',zeroArgs);
 assert.equal(zero.cost.minor,'0');assert.equal(zero.cost.status,'known');
 const retries=await Promise.all([save(owner,zeroArgs),save(owner,zeroArgs)]);assert.ok(retries.every(r=>!r.error));assert.deepEqual(retries[0].data,zero);
 assert.equal((await save(owner,{...zeroArgs,p_amount:1})).error?.code,'22023');
 assert.equal((await save(owner,args(active,2,'USD'))).error?.code,'PT409');
 assert.equal(await rpc(other,'vault_copy_cost_request_read_v1',{p_request_id:zeroArgs.p_request_id}),null);
 const maximum=await copy();
 assert.equal((await rpc(owner,'vault_copy_cost_save_v1',args(maximum,'9999999999.99','USD'))).cost.minor,'999999999999');
 const cleared=await rpc(owner,'vault_copy_cost_save_v1',args(maximum,null,null,'9999999999.99','USD'));
 assert.equal(cleared.cost.status,'missing_amount');assert.equal(cleared.cost.amount,null);assert.equal(cleared.cost.currency,null);
 const unknownCurrency=await copy(12.34);const preserved=(await rpc(owner,'vault_copy_cost_read_v1',{p_instance_ids:[unknownCurrency]})).copies[0];
 assert.equal(preserved.cost.amount,'12.34');assert.equal(preserved.cost.status,'missing_currency');
 await rpc(owner,'vault_copy_cost_save_v1',args(unknownCurrency,12.34,'USD',12.34));
 checks.push('zero cost, missing legacy currency, exact precision, optimistic conflicts and durable concurrent retry');
 for(const version of [1,2,3]){
   const copyId=await copy(12.34,'USD'),id=randomUUID(),payload=cart(version,[line(copyId),line()]);
   const r=await sale(owner,id,payload);assert.equal(r.error,null,JSON.stringify(r.error));
   const evidence=await snapshot(owner,id);assert.equal(evidence.lines[0].cost.minor,'1234');assert.equal(evidence.lines[0].status,'known');assert.equal(evidence.lines[1].status,'unlinked');
   assert.equal(evidence.lines[0].salesMinor,'10000');assert.equal(evidence.salesCurrency,'USD');
   const privateKeys=value=>value&&typeof value==='object'&&Object.entries(value).some(([key,child])=>/acquisition|cost|profit/i.test(key)||privateKeys(child));
   assert.equal(Boolean(privateKeys(r.data)),false);
   assert.equal(await snapshot(other,id),undefined);
   assert.equal((await save(owner,args(copyId,9,'USD',12.34,'USD'))).error?.code,'PT409');
   await q('update vault_item_instances set acquisition_cost=99 where id=$1',[copyId]);
   assert.deepEqual(await snapshot(owner,id),evidence);
   await assert.rejects(q('update vendor_sale_cost_snapshots set snapshot=snapshot where owner_id=$1 and request_id=$2',[ids[0],id]),e=>e.code==='42501');
 }
 checks.push('v1/v2/v3 atomic snapshots, manual lines, archived editing denied, customer privacy and immutable history');
 const classified=[await copy(),await copy(2),await copy(4,'CAD'),await copy(0,'USD'),await copy(1.234,'USD'),await copy('NaN','USD')];
 const classifiedId=randomUUID();assert.equal((await sale(owner,classifiedId,cart(3,classified.map(id=>line(id))))).error,null);
 assert.deepEqual((await snapshot(owner,classifiedId)).lines.map(l=>l.status),['missing_amount','missing_currency','foreign_currency','known','invalid_amount','invalid_amount']);
 checks.push('missing cost/currency, foreign cost, zero and malformed historical values remain distinct');
 const oversized=[];for(let i=0;i<50;i++)oversized.push(await copy('1e2000','USD'));
 const oversizedId=randomUUID();assert.equal((await sale(owner,oversizedId,cart(3,oversized.map(id=>line(id,100))))).error,null);
 const oversizedSnapshot=await snapshot(owner,oversizedId);
 assert.equal(oversizedSnapshot.lines.length,50);assert.ok(Buffer.byteLength(JSON.stringify(oversizedSnapshot))<100000);
 for(const entry of oversizedSnapshot.lines){assert.equal(entry.status,'oversized_legacy_value');assert.equal(entry.cost.amount,null);assert.equal(entry.cost.minor,null);assert.equal(entry.cost.currency,'USD');assert.match(entry.cost.evidenceSha256,/^[0-9a-f]{64}$/);}
 assert.equal((await q('select acquisition_cost::text amount from vault_item_instances where id=$1',[oversized[0]]))[0].amount,'1'+'0'.repeat(2000));
 checks.push('50 oversized legacy costs retain original values and bounded unknown evidence without blocking sale');
 // Force the after-insert evidence write to fail in this dedicated lab: the
 // existing sale, book revision and stock changes must all roll back together.
 const rollbackCopy=await copy(8,'USD'),rollbackId=randomUUID();
 const before=(await rpc(owner,'vendor_receipt_book_read_v1')).revision;
 await q('alter table vendor_sale_cost_snapshots add constraint cost_proof_injected_failure check(false) not valid');
 try{assert.equal((await sale(owner,rollbackId,cart(3,[line(rollbackCopy)]))).error?.code,'23514');}
 finally{await q('alter table vendor_sale_cost_snapshots drop constraint cost_proof_injected_failure');}
 assert.equal((await q('select archived_at from vault_item_instances where id=$1',[rollbackCopy]))[0].archived_at,null);
 assert.equal((await rpc(owner,'vendor_receipt_book_read_v1')).revision,before);
 assert.equal(await rpc(owner,'vendor_sales_cart_read_v1',{p_request_id:rollbackId}),null);assert.equal(await snapshot(owner,rollbackId),undefined);
 checks.push('injected capture failure rolls back receipt book, stock, disposition and evidence');
 // Deterministic row lock: edit wins first; a real HTTP sale must wait for commit.
 const raced=await copy(3,'USD'),raceId=randomUUID(),tx=new Client({connectionString:connection.href});await tx.connect();
 try{
   await tx.query('begin');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[0]]);
   await tx.query('set local role authenticated');
   await tx.query('select vault_copy_cost_save_v1($1,$2,3,\'USD\',5,\'USD\')',[randomUUID(),raced]);
   const pending=Promise.resolve(sale(owner,raceId,cart(3,[line(raced)])));
   let waiting=false;
   for(let i=0;i<50;i++){const rows=await q("select count(*)::int n from pg_stat_activity where wait_event_type='Lock' and query like '%vendor_sales_cart_complete_v3%'");if(rows[0].n){waiting=true;break;}await new Promise(r=>setTimeout(r,50));}
   assert.ok(waiting,'Sale must be observed waiting for the cost lock');
   await tx.query('commit');assert.equal((await pending).error,null);
 }finally{await tx.query('rollback').catch(()=>{});await tx.end();}
 assert.equal((await snapshot(owner,raceId)).lines[0].cost.minor,'500');
 // Sale wins first. A subsequent cost editor cannot alter the sold copy.
 const soldFirst=await copy(3,'USD'),saleFirstId=randomUUID(),tx2=new Client({connectionString:connection.href});await tx2.connect();
 try{
   await tx2.query('begin');await tx2.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[0]]);await tx2.query('set local role authenticated');
   await tx2.query('select vendor_sales_cart_complete_v3($1,$2::jsonb)',[saleFirstId,JSON.stringify(cart(3,[line(soldFirst)]))]);
   const pending=Promise.resolve(save(owner,args(soldFirst,6,'USD',3,'USD')));let waiting=false;
   for(let i=0;i<50;i++){const rows=await q("select count(*)::int n from pg_stat_activity where wait_event_type='Lock' and query like '%vault_copy_cost_save_v1%'");if(rows[0].n){waiting=true;break;}await new Promise(r=>setTimeout(r,50));}
   assert.ok(waiting,'Cost edit must be observed waiting for the sale lock');await tx2.query('commit');assert.equal((await pending).error?.code,'PT409');
 }finally{await tx2.query('rollback').catch(()=>{});await tx2.end();}
 assert.equal((await snapshot(owner,saleFirstId)).lines[0].cost.minor,'300');
 checks.push('deterministic edit-first and sale-first concurrency preserves the committed cost and one sale');
 const zeroSaleId=randomUUID();assert.equal((await sale(owner,zeroSaleId,cart(3,[line(active)]))).error,null);
 assert.equal((await snapshot(owner,zeroSaleId)).lines[0].cost.minor,'0');
 assert.deepEqual((await save(owner,zeroArgs)).data,zero);
 await q('update vendor_cost_evidence_control set edit_enabled=false,capture_enabled=false');
 assert.deepEqual((await save(owner,zeroArgs)).data,zero);assert.deepEqual(await rpc(owner,'vault_copy_cost_request_read_v1',{p_request_id:zeroArgs.p_request_id}),zero);
 assert.equal((await snapshot(owner,raceId)).lines[0].cost.minor,'500');
 checks.push('cost request recovery survives sale/archive and switch-off; historical reads remain private');
}catch(e){failure={message:e.message,stack:e.stack};}
finally{
 await q('update vendor_cost_evidence_control set edit_enabled=false,capture_enabled=false;update vendor_receipt_cloud_control set enabled=false;update vendor_sales_cart_control set enabled=false;update vendor_sales_payment_control set enabled=false;update vendor_sales_trade_control set enabled=false');
 if(retainedBefore)assert.deepEqual((await q(retainedSql,[retainedOwners]))[0].state,retainedBefore,'Prior synthetic fixtures changed');
 await db.end();
}
const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',packageHashes:freeze.sourceHashes,producerSha256:digest(new URL(import.meta.url)),failure,checks,fixtureOwnerIds:ids,retainedOwners,priorFixturesUnchanged:Boolean(retainedBefore),project,releasePackage:release,productionWrites:0,resetsAfterPopulation:0,flagsRestoredOff:true,out};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({status:receipt.status,failure,checks,out}));if(failure)process.exitCode=1;
