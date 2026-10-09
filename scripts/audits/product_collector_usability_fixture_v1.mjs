// Isolated additive collector fixture. Prior rows and every control are retained.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_collector_usability_20261008',base='C:/grookai_vault_operator_artifacts/product_collector_usability_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2',project='portfolio-full-438-v2-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const [mode,provided]=process.argv.slice(2);assert.ok(['prepare','verify','restore'].includes(mode));
assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/ui-'+Date.now():provided;assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:32*1024*1024});
const baseline=read(base+'/BASELINE_429.json');assert.equal(baseline.status,'passed');
for(const [name,hash]of Object.entries(baseline.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),hash,name);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of[35520,35521])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function fingerprints(table){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);return Object.fromEntries((await q('select md5(to_jsonb(t)::text) hash,count(*)::integer n from '+table+' t group by 1')).map(r=>[r.hash,r.n]));}
async function retention(f){
 const before=read(run+'/before.private.json');
 for(const [table,hashes] of Object.entries(before)){
  const after=await fingerprints(table);for(const [hash,n]of Object.entries(hashes))assert.ok((after[hash]??0)>=n,'Prior row changed: '+table);
 }
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[f.users.map(u=>u.id)]))[0].n,0);
 assert.equal((await q('select count(*)::int n from market_price_current_publication'))[0].n,0);
 assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);
 return {priorTables:Object.keys(before).length,profileRowsCreated:0};
}
async function restoreFlags(flags){
 await q('begin');
 try {
  // Only this isolated transaction suppresses the updated_at trigger while restoring its exact prior bytes.
  await q('set local session_replication_role = replica');
  for(const row of flags)await q('update binder_feature_flags set enabled=$2,description=$3,updated_at=$4 where flag_key=$1',[row.flag_key,row.enabled,row.description,row.updated_at]);
  assert.deepEqual((await q('select to_jsonb(t) row from binder_feature_flags t order by flag_key')).map(r=>r.row),flags);
  await q('commit');
 }catch(error){await q('rollback');throw error;}
}
try {
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);
 if(mode==='prepare'){
  fs.mkdirSync(run);const flags=(await q('select to_jsonb(t) row from binder_feature_flags t order by flag_key')).map(r=>r.row);
  const tables=(await q("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) and table_name <> 'binder_feature_flags' order by 1")).map(r=>r.name);
  const before={};for(const t of tables)before[t]=await fingerprints(t);save('before.private.json',before);
  const f={state:'preparing',project,flags,users:[],binders:[],at:new Date().toISOString()};save('fixture.private.json',f);
  try {
   await q("update binder_feature_flags set enabled=true where flag_key in ('schema_internal','personal','custom')");
   const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   for(let i=0;i<3;i++){
    const email=randomUUID()+'@collector-home.invalid',password=randomUUID()+'Aa9!';const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);f.users.push({id:made.data.user.id,email,password});save('fixture.private.json',f,false);
   }
   const prior=read(read('C:/grookai_vault_operator_artifacts/product_collector_home_20261008/PRIVATE_ADD_V1.json').run+'/fixture.private.json');f.card=prior.card;f.printing=prior.printing;
   const added=await admin.rpc('vault_add_card_instance_service_v1',{p_actor_user_id:f.users[0].id,p_card_print_id:f.card,p_card_printing_id:f.printing,p_quantity:1,p_condition_label:'NM'});assert.equal(added.error,null);
   const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});assert.equal((await client.auth.signInWithPassword(f.users[0])).error,null);
   assert.equal((await client.from('wishlist_items').upsert({user_id:f.users[0].id,card_id:f.card},{onConflict:'user_id,card_id',ignoreDuplicates:true})).error,null);
   for(const title of ['First collection goal','Weekend collection goal','Favorite cards goal','Another collection goal']){
    const made=await client.rpc('binder_create_v1',{p_title:title,p_target_kind:'custom',p_checklist_mode:'custom',p_idempotency_key:randomUUID(),p_custom_slots:[{card_print_id:f.card,card_printing_id:f.printing,required_quantity:2}]});assert.equal(made.error,null);assert.equal(made.data.ok,true);f.binders.push({publicId:made.data.binder_public_id,title});save('fixture.private.json',f,false);
   }
   const dashboard=await client.rpc('binder_dashboard_v1',{p_limit:20});assert.equal(dashboard.error,null);assert.equal(dashboard.data.items.length,4);save('dashboard.private.json',dashboard.data);
   f.state='prepared';save('fixture.private.json',f,false);
   save('defines.private.json',{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,COLLECTOR_TEST_EMAIL:f.users[0].email,COLLECTOR_TEST_PASSWORD:f.users[0].password,COLLECTOR_EMPTY_EMAIL:f.users[1].email,COLLECTOR_EMPTY_PASSWORD:f.users[1].password,COLLECTOR_TEST_GOAL:f.binders[3].publicId,GROOKAI_WEB_BASE_URL:'http://127.0.0.1:35691'});
   save('prepared.json',{status:'passed',at:new Date().toISOString(),...await retention(f),users:3,goals:4,productionWrites:0});
   console.log(JSON.stringify({run,state:f.state}));
  }catch(error){save('failure.json',{message:error.message,stack:error.stack});await restoreFlags(flags);throw error;}
 }else{
  const f=read(run+'/fixture.private.json');assert.equal(f.project,project);assert.equal(f.state,'prepared');
  if(mode==='restore'){
   await restoreFlags(f.flags);
   assert.deepEqual((await q('select to_jsonb(t) row from binder_feature_flags t order by flag_key')).map(r=>r.row),f.flags);
  }
  const kept=await retention(f);save(mode+'-'+Date.now()+'.json',{status:'passed',at:new Date().toISOString(),...kept,productionWrites:0});
  if(mode==='restore'){f.state='restored';save('fixture.private.json',f,false);}
  console.log(JSON.stringify({run,mode,status:'passed',...kept}));
 }
}finally{await db.end();}
