// Synthetic device fixture on the retained, isolated 431 lab. Never resets it.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {createRequire} from 'node:module';
const root='C:/gv_product_native_cost_20261007';
const base='C:/grookai_vault_operator_artifacts/product_native_cost_20261007';
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
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots'];
async function retained(){const result={};for(const t of tables)result[t]=(await q(`select md5(coalesce(string_agg(row_to_json(t)::text,E'\n' order by row_to_json(t)::text),'')) digest,count(*)::int n from ${t} t`))[0];return result;}
const {createClient}=createRequire(root+'/apps/web/package.json')('@supabase/supabase-js');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const save=(name,data)=>fs.writeFileSync(run+'/'+name,JSON.stringify(data,null,2));
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,431);
 if(mode==='prepare'){
  const flags=(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0];assert.deepEqual(flags,{edit_enabled:false,capture_enabled:false});
  fs.mkdirSync(run);const f={project,state:'preparing',before:await retained(),flags,email:randomUUID()+'@native-cost.invalid',password:randomUUID()+'Aa9!',copy:randomUUID(),anchor:randomUUID(),gvvi:'GVVI-NATIVECOST-'+randomUUID().toUpperCase(),at:new Date().toISOString()};save('fixture.private.json',f);
  const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;save('fixture.private.json',f);
  f.set=randomUUID();f.card=randomUUID();f.printing=randomUUID();save('fixture.private.json',f);
  const card={id:f.card,gv_id:'GV-PK-NATIVECOST-'+f.card,printing:f.printing};
  await q('begin');
  await q("insert into sets(id,code,name,game) values($1,$2,'Native cost synthetic set','pokemon')",[f.set,f.set]);
  await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Native cost synthetic Pikachu','1',$3,'missing')",[f.card,f.set,card.gv_id]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[f.printing,f.card,card.gv_id+'-STD']);
  await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Native cost synthetic copy',$4)",[f.anchor,f.owner,card.id,card.gv_id]);
  await q('insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,$5,$6)',[f.copy,f.owner,card.id,card.printing,f.anchor,f.gvvi]);
  await q('update vendor_cost_evidence_control set edit_enabled=true');await q('commit');
  save('defines.private.json',{COST_TEST_URL:cfg.API_URL,COST_TEST_KEY:cfg.PUBLISHABLE_KEY,COST_TEST_EMAIL:f.email,COST_TEST_PASSWORD:f.password,COST_TEST_COPY:f.copy,COST_TEST_GVVI:f.gvvi,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,GV_COPY_COST_V1:true});
  f.state='prepared';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state}));
 }else{
  const f=json(run+'/fixture.private.json');assert.equal(f.project,project);assert.ok(f.email.endsWith('@native-cost.invalid'));assert.notEqual(f.state,'cleaned');
  if(f.owner)assert.equal((await q('select email from auth.users where id=$1',[f.owner]))[0]?.email,f.email);
  if(mode==='verify'){
   assert.equal(f.state,'prepared');
   const rows=await q('select acquisition_cost::text amount,acquisition_currency currency,archived_at from vault_item_instances where user_id=$1 and id=$2',[f.owner,f.copy]);
   assert.equal(rows.length,1);assert.equal(rows[0].amount,'13.27');assert.equal(rows[0].currency,'USD');assert.ok(rows[0].archived_at);
   const requests=await q('select request_id from vault_copy_cost_requests where owner_id=$1',[f.owner]);assert.equal(requests.length,1);
   const first=json(run+'/phase-1/device-response.json'),second=json(run+'/phase-2/device-response.json');
   assert.equal(first.phase,'pending_after_commit');assert.equal(second.phase,'recovered_after_process_restart');assert.equal(first.requestId,requests[0].request_id);assert.equal(second.requestId,first.requestId);
   assert.equal(second.pendingCount,0);assert.equal(second.owner,f.owner);
   save('database-readback.json',{status:'passed',at:new Date().toISOString(),project,requests:1,amount:'13.27',currency:'USD',archived:true,processRestart:true,productionWrites:0});f.state='verified';save('fixture.private.json',f);
   console.log(JSON.stringify({run,state:f.state}));
  }else{
   await q('begin');await q('set local session_replication_role=replica');
   await q('delete from card_events where actor_user_id=$1 or subject_user_id=$1',[f.owner]);
   await q('delete from vault_item_instances where user_id=$1 and id=$2',[f.owner,f.copy]);
   await q('delete from vault_items where user_id=$1 and id=$2',[f.owner,f.anchor]);
   if(f.set){
    assert.equal((await q('select set_id from card_prints where id=$1',[f.card]))[0]?.set_id??f.set,f.set);
    await q('delete from pricing_watch where card_print_id=$1',[f.card]);
    await q('delete from card_printings where id=$1 and card_print_id=$2',[f.printing,f.card]);
    await q('delete from card_prints where id=$1 and set_id=$2',[f.card,f.set]);
    await q('delete from sets where id=$1',[f.set]);
   }
   await q('set local session_replication_role=origin');
   if(f.owner)await q('delete from auth.users where id=$1',[f.owner]);
   await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[f.flags.edit_enabled,f.flags.capture_enabled]);await q('commit');
   const after=await retained();save('retention.json',{before:f.before,after});assert.deepEqual(after,f.before);
   f.state='cleaned';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state,retainedTables:tables.length}));
  }
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
