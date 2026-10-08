// Fresh, bounded web fixture. Existing labs and consumed fixtures are retained.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import pg from 'pg';
const root='C:/gv_product_cost_review_web_20261007';
const base='C:/grookai_vault_operator_artifacts/product_cost_review_web_20261007';
const lab='C:/grookai_vault_operator_artifacts/product_economics_20261007/full-431-v2';
const project='product-cost-full-431-v2-20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mode=process.argv[2];assert.ok(['prepare','verify','cleanup'].includes(mode));
const run=mode==='prepare'?base+'/runtime-'+Date.now():path.resolve(process.argv[3]??'').replaceAll('\\','/');
assert.ok(run.startsWith(base+'/runtime-')&&!run.substring(base.length+1).includes('/'));
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const json=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const freeze=json(lab+'/freeze.json'),replay=json(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,431);
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
for(const [name,digest] of Object.entries(freeze.sourceHashes)){
 assert.equal(sha(root+'/supabase/migrations/'+name),digest);assert.equal(sha(lab+'/supabase/migrations/'+name),digest);
}
const profit=json('C:/grookai_vault_operator_artifacts/product_native_profit_20261007/CHECKPOINT.json');
assert.equal(profit.sourceFrozen,false);assert.equal(profit.commit,'9dcebf64ce7d8d6a3512998bc2f87f5d8a049102');
assert.equal(json('C:/grookai_vault_operator_artifacts/product_cost_review_20261007/CHECKPOINT.json').sourceFrozen,false,'Native review checks must be terminal before lab mutation');
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));
assert.equal(cfg.API_URL,'http://127.0.0.1:33061');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.ok(container.State.Running);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const p of [33060,33061])assert.deepEqual(relay.NetworkSettings.Ports[p+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33060/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.vault_item_instance_dispositions'];
async function retained(){const result={};for(const t of tables)result[t]=(await q(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${t} t`))[0];return result;}
const {createClient}=createRequire(root+'/apps/web/package.json')('@supabase/supabase-js');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const save=(name,data)=>fs.writeFileSync(run+'/'+name,JSON.stringify(data,null,2));
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,431);
 if(mode==='prepare'){
  const flags=(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0];assert.deepEqual(flags,{edit_enabled:false,capture_enabled:false});
  fs.mkdirSync(run);const f={project,state:'preparing',before:await retained(),flags,email:randomUUID()+'@cost-review.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID(),anchor:randomUUID(),at:new Date().toISOString(),copies:[
   {kind:'unknown',amount:null,currency:null},{kind:'currency',amount:'12.00',currency:null},
   {kind:'zero',amount:'0',currency:'USD'},{kind:'foreign',amount:'3.00',currency:'CAD'},
   {kind:'invalid',amount:'0.001',currency:'USD'},{kind:'known',amount:'8.00',currency:'USD'},
  ].map(v=>({...v,id:randomUUID(),gvvi:'GVVI-COSTREVIEW-'+randomUUID().toUpperCase()}))};save('fixture.private.json',f);
  const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;save('fixture.private.json',f);
  const gv='GV-PK-COSTREVIEW-'+f.card;
  await q('begin');
  await q("insert into sets(id,code,name,game) values($1,$2,'Cost review synthetic set','pokemon')",[f.set,f.set]);
  await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Cost review synthetic Pikachu','1',$3,'missing')",[f.card,f.set,gv]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[f.printing,f.card,gv+'-STD']);
  await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Cost review synthetic copy',$4)",[f.anchor,f.owner,f.card,gv]);
  for(const c of f.copies)await q('insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,acquisition_cost,acquisition_currency) values($1,$2,$3,$4,$5,$6,$7,$8)',[c.id,f.owner,f.card,f.printing,f.anchor,c.gvvi,c.amount,c.currency]);
  await q('update vendor_cost_evidence_control set edit_enabled=true');await q('commit');
  f.readyCopies=await q('select id,acquisition_cost::text amount,acquisition_currency currency,archived_at from vault_item_instances where user_id=$1 order by id',[f.owner]);
  f.ready=await retained();
  const target=f.copies.find(c=>c.kind==='currency');
  save('defines.private.json',{REVIEW_TEST_URL:cfg.API_URL,REVIEW_TEST_KEY:cfg.PUBLISHABLE_KEY,REVIEW_TEST_EMAIL:f.email,REVIEW_TEST_PASSWORD:f.password,REVIEW_TEST_COPY:target.id,REVIEW_TEST_GVVI:target.gvvi,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,GV_COPY_COST_V1:true});
  f.state='prepared';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state}));
 }else{
  const f=json(run+'/fixture.private.json');assert.equal(f.project,project);assert.ok(f.email.endsWith('@cost-review.invalid'));assert.notEqual(f.state,'cleaned');
  if(f.owner)assert.equal((await q('select email from auth.users where id=$1',[f.owner]))[0]?.email,f.email);
  if(mode==='verify'){
   assert.equal(f.state,'prepared');
   const target=f.copies.find(c=>c.kind==='currency');
   const actual=await q('select id,acquisition_cost::text amount,acquisition_currency currency,archived_at from vault_item_instances where user_id=$1 order by id',[f.owner]);
   assert.deepEqual(actual,f.readyCopies.map(c=>c.id===target.id?{...c,amount:'12.00',currency:'USD'}:c));
   const requests=await q('select request_id,request,result from vault_copy_cost_requests where owner_id=$1',[f.owner]);assert.equal(requests.length,1);
   assert.equal(requests[0].request.instanceId,target.id);assert.equal(requests[0].request.expectedCurrency,null);assert.equal(requests[0].request.expectedAmount,12);
   assert.equal(requests[0].result.cost.minor,'1200');assert.equal(requests[0].result.cost.currency,'USD');
   const response=json(run+'/browser-response.json');assert.equal(response.phase,'cost_review_web_passed');assert.equal(response.owner,f.owner);
   for(const key of ['filteredScope','readRecovery','flagOff','accountClosed'])assert.equal(response[key],true);
   assert.equal(response.initialRecorded,3);assert.equal(response.finalRecorded,4);assert.equal(response.includedCopies,6);assert.equal(response.pendingCount,0);
   const after=await retained();let unchanged=0;for(const t of tables){if(['auth.users','public.vault_item_instances','public.vault_copy_cost_requests'].includes(t))continue;assert.deepEqual(after[t],f.ready[t],t);unchanged++;}
   save('database-readback.json',{status:'passed',at:new Date().toISOString(),project,requests:1,copies:6,repairedAmount:'12.00',repairedCurrency:'USD',otherCopiesUnchanged:5,unchangedTables:unchanged,productionWrites:0});f.state='verified';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state}));
  }else{
   await q('begin');await q('set local session_replication_role=replica');
   await q('delete from card_events where actor_user_id=$1 or subject_user_id=$1',[f.owner]);
   await q('delete from vault_item_instances where user_id=$1 and id=any($2::uuid[])',[f.owner,f.copies.map(c=>c.id)]);
   await q('delete from vault_items where user_id=$1 and id=$2',[f.owner,f.anchor]);
   assert.equal((await q('select set_id from card_prints where id=$1',[f.card]))[0]?.set_id??f.set,f.set);
   await q('delete from pricing_watch where card_print_id=$1',[f.card]);
   await q('delete from card_printings where id=$1 and card_print_id=$2',[f.printing,f.card]);
   await q('delete from card_prints where id=$1 and set_id=$2',[f.card,f.set]);await q('delete from sets where id=$1',[f.set]);
   await q('set local session_replication_role=origin');if(f.owner)await q('delete from auth.users where id=$1',[f.owner]);
   await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[f.flags.edit_enabled,f.flags.capture_enabled]);await q('commit');
   const after=await retained();save('retention.json',{before:f.before,after});assert.deepEqual(after,f.before);
   f.state='cleaned';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state,retainedTables:tables.length}));
  }
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
