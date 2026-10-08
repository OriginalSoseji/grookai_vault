// Synthetic device fixture on the retained, isolated 431 lab. Never resets it.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {createRequire} from 'node:module';
const root='C:/gv_product_native_profit_20261007';
const base='C:/grookai_vault_operator_artifacts/product_native_profit_20261007';
const lab='C:/grookai_vault_operator_artifacts/product_economics_20261007/full-431-v2';
const project='product-cost-full-431-v2-20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mode=process.argv[2];assert.ok(['prepare','verify','cleanup'].includes(mode));
const run=mode==='prepare'?base+'/device-'+Date.now():path.resolve(process.argv[3]??'').replaceAll('\\','/');
assert.ok(run.startsWith(base+'/device-')&&!run.substring(base.length+1).includes('/'));
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});
const json=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const freeze=json(lab+'/freeze.json'),replay=json(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,431);
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
for(const [name,digest] of Object.entries(freeze.sourceHashes)){
 assert.equal(sha(root+'/supabase/migrations/'+name),digest);assert.equal(sha(lab+'/supabase/migrations/'+name),digest);
}
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));
assert.equal(cfg.API_URL,'http://127.0.0.1:33061');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.ok(container.State.Running);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const p of [33060,33061])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33060/postgres'});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.vault_item_instance_dispositions'];
async function retained(){const result={};for(const t of tables)result[t]=(await q(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${t} t`))[0];return result;}
const {createClient}=createRequire(root+'/apps/web/package.json')('@supabase/supabase-js');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const save=(name,data)=>fs.writeFileSync(run+'/'+name,JSON.stringify(data,null,2));
const flagTables=['vendor_receipt_cloud_control','vendor_sales_cart_control','vendor_sales_trade_control','vendor_sales_payment_control'];
async function flags(){const result={cost:(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0]};for(const table of flagTables)result[table]=(await q(`select enabled from ${table}`))[0].enabled;return result;}
async function restore(control){await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[control.cost.edit_enabled,control.cost.capture_enabled]);for(const table of flagTables)await q(`update ${table} set enabled=$1`,[control[table]]);}
const businessRows=rows=>Object.fromEntries(Object.entries(rows).filter(([table])=>table!=='auth.users'));
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,431);
 if(mode==='prepare'){
  const controls=await flags();assert.ok(Object.values(controls.cost).every(v=>v===false));for(const table of flagTables)assert.equal(controls[table],false);
  fs.mkdirSync(run);const f={project,state:'preparing',before:await retained(),controls,email:randomUUID()+'@native-profit.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID(),copies:[randomUUID(),randomUUID()],anchors:[randomUUID(),randomUUID()],oldSale:randomUUID(),sale:randomUUID(),at:new Date().toISOString()};save('fixture.private.json',f);
  const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;save('fixture.private.json',f);
  await q('begin');
  await q("insert into sets(id,code,name,game) values($1,$2,'Native profit synthetic set','pokemon')",[f.set,f.set]);
  await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Native profit synthetic card','1',$3,'missing')",[f.card,f.set,'GV-PK-NATIVEPROFIT-'+f.card]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[f.printing,f.card,'GV-PK-NATIVEPROFIT-'+f.card+'-STD']);
  for(let i=0;i<2;i++){
   await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Native profit synthetic copy',$4)",[f.anchors[i],f.owner,f.card,'GV-PK-NATIVEPROFIT-'+f.card]);
   await q('insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,acquisition_cost,acquisition_currency) values($1,$2,$3,$4,$5,$6,$7,$8)',[f.copies[i],f.owner,f.card,f.printing,f.anchors[i],'GVVI-NATIVEPROFIT-'+randomUUID().toUpperCase(),i===0?'12.00':'3.00',i===0?'USD':'CAD']);
  }
  for(const table of flagTables)await q(`update ${table} set enabled=true`);await q('commit');
  const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const signed=await client.auth.signInWithPassword({email:f.email,password:f.password});assert.equal(signed.error,null);assert.equal(signed.data.user.id,f.owner);
  const rpc=async(name,args)=>{const result=await client.rpc(name,args);assert.equal(result.error,null,JSON.stringify(result.error));return result.data;};
  const line=(instanceId,unitMinor,quantity=1)=>({instanceId,description:'Native profit test item',quantity,unitMinor});
  const cart=(version,items,extra={})=>({version,storeName:'Native profit test',items,method:'Cash',taxMinor:0,note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''},...extra});
  await rpc('vendor_sales_cart_complete_v1',{p_request_id:f.oldSale,p_cart:cart(1,[line(null,1000)])});
  await q('update vendor_cost_evidence_control set capture_enabled=true');
  const payload=cart(3,[line(f.copies[0],2000),line(f.copies[1],500),line(null,250,2)],{method:'Split payment',taxMinor:100,trades:[{description:'Incoming synthetic trade',quantity:1,valueMinor:500,rateBps:10000,cardId:null,printingId:null,condition:null,addToVault:false}],payments:[{method:'Cash',amountMinor:1000,tenderedMinor:1000},{method:'Card (external terminal)',amountMinor:1600,tenderedMinor:1600}]});
  const sold=await rpc('vendor_sales_cart_complete_v3',{p_request_id:f.sale,p_cart:payload});assert.equal(sold.totalMinor,3100);assert.equal(sold.tradeIn.balanceMinor,2600);
  const snapshots=(await rpc('vendor_sale_cost_read_v1',{p_request_ids:[f.oldSale,f.sale]})).snapshots;assert.equal(snapshots.length,1);assert.equal(snapshots[0].lines[0].cost.minor,'1200');
  f.snapshots=snapshots;save('fixture.private.json',f);
  // Synthetic alteration of an already-sold copy proves current cost is not substituted.
  await q("update vault_item_instances set acquisition_cost=9999,acquisition_currency='USD' where id=$1 and user_id=$2",[f.copies[0],f.owner]);
  assert.deepEqual((await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where id=$1 and user_id=$2',[f.copies[0],f.owner]))[0],{amount:'9999',currency:'USD'});
  await q('update vendor_cost_evidence_control set capture_enabled=false');
  for(const table of flagTables.filter(t=>t!=='vendor_receipt_cloud_control'))await q(`update ${table} set enabled=false`);
  assert.deepEqual((await rpc('vendor_sale_cost_read_v1',{p_request_ids:[f.oldSale,f.sale]})).snapshots,snapshots);
  await client.auth.signOut();
  f.readyRows=businessRows(await retained());f.state='prepared';save('fixture.private.json',f);
  save('defines.private.json',{PROFIT_TEST_URL:cfg.API_URL,PROFIT_TEST_KEY:cfg.PUBLISHABLE_KEY,PROFIT_TEST_EMAIL:f.email,PROFIT_TEST_PASSWORD:f.password,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,GV_VENDOR_PROFIT_V1:true});
  console.log(JSON.stringify({run,state:f.state}));
 }else{
  const f=json(run+'/fixture.private.json');assert.equal(f.project,project);assert.ok(f.email.endsWith('@native-profit.invalid'));assert.notEqual(f.state,'cleaned');
  if(f.owner)assert.equal((await q('select email from auth.users where id=$1',[f.owner]))[0]?.email,f.email);
  if(mode==='verify'){
   assert.equal(f.state,'prepared');const result=json(run+'/device/device-response.json');assert.equal(result.phase,'native_profit_passed');assert.equal(result.owner,f.owner);
   assert.equal(result.knownProfitMinor,'800');assert.equal(result.totalLines,4);assert.equal(result.filteredLines,3);for(const key of ['readRecovery','flagOff','accountClosed'])assert.equal(result[key],true);
   assert.deepEqual((await q('select acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where id=$1 and user_id=$2',[f.copies[0],f.owner]))[0],{amount:'9999',currency:'USD'});
   assert.deepEqual((await q('select snapshot from vendor_sale_cost_snapshots where owner_id=$1 order by request_id',[f.owner])).map(r=>r.snapshot),f.snapshots);
   assert.equal((await q('select count(*)::int n from vendor_sales_cart_receipts where owner_id=$1',[f.owner]))[0].n,2);
   assert.deepEqual(businessRows(await retained()),f.readyRows,'Device Reports must be read-only outside Auth session lifecycle');
   save('database-readback.json',{status:'passed',at:new Date().toISOString(),project,knownProfitMinor:'800',historicalCostMinor:'1200',currentCost:'9999',receipts:2,readOnlyBusinessTables:13,productionWrites:0});
   f.state='verified';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state}));
  }else{
   await q('begin');await q('set local session_replication_role=replica');
   await q('delete from card_events where actor_user_id=$1 or subject_user_id=$1',[f.owner]);
   await q('delete from vault_item_instance_dispositions where user_id=$1 and vault_item_instance_id=any($2::uuid[])',[f.owner,f.copies]);
   await q('delete from vault_item_instances where user_id=$1 and id=any($2::uuid[])',[f.owner,f.copies]);
   await q('delete from vault_items where user_id=$1 and id=any($2::uuid[])',[f.owner,f.anchors]);
   await q('delete from pricing_watch where card_print_id=$1',[f.card]);
   await q('delete from card_printings where id=$1 and card_print_id=$2',[f.printing,f.card]);
   await q('delete from card_prints where id=$1 and set_id=$2',[f.card,f.set]);await q('delete from sets where id=$1',[f.set]);
   await q('set local session_replication_role=origin');if(f.owner)await q('delete from auth.users where id=$1',[f.owner]);await restore(f.controls);await q('commit');
   const after=await retained();save('retention.json',{before:f.before,after});assert.deepEqual(after,f.before);f.state='cleaned';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state,retainedTables:tables.length}));
  }
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
