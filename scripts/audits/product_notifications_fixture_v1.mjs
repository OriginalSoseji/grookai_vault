// Additive synthetic accounts only. Existing rows and global controls stay intact.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';

const root='C:/gv_product_notifications_20261008';
const base='C:/grookai_vault_operator_artifacts/product_notifications_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2';
const project='portfolio-full-438-v2-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const [mode,provided]=process.argv.slice(2);assert.ok(['prepare','verify','restore'].includes(mode));
assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/ui-'+Date.now():provided;
assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:32*1024*1024});
const baseline=read(base+'/BASELINE_429.json');assert.equal(baseline.status,'passed');
for(const [name,digest]of Object.entries(baseline.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest,name);
assert.equal(read('C:/grookai_vault_operator_artifacts/product_collector_usability_20261008/ui-1791507616220/fixture.private.json').state,'restored');
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const port of [35520,35521])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});
await db.connect();const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function fingerprints(table){
 assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);
 return Object.fromEntries((await q('select md5(to_jsonb(t)::text) hash,count(*)::integer n from '+table+' t group by 1')).map(row=>[row.hash,row.n]));
}
async function retain(f){
 const before=read(run+'/before.private.json');
 for(const [table,hashes]of Object.entries(before)){
  const after=await fingerprints(table);
  for(const [hash,n]of Object.entries(hashes))assert.ok((after[hash]??0)>=n,'Prior row changed: '+table);
 }
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[f.users.map(user=>user.id)]))[0].n,0);
 assert.equal((await q('select count(*)::int n from market_price_current_publication'))[0].n,0);
 assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);
 return {priorTables:Object.keys(before).length,profileRowsCreated:0};
}
try {
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);
 if(mode==='prepare'){
  fs.mkdirSync(run);
  const tables=(await q("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).map(row=>row.name);
  const before={};for(const table of tables)before[table]=await fingerprints(table);save('before.private.json',before);
  const fixture={state:'preparing',project,users:[],tokenPrefix:'notifications-proof-'+randomUUID()+'-',at:new Date().toISOString(),globalControlsChanged:false};
  save('fixture.private.json',fixture);
  try {
   assert.equal((await q('select count(*)::int n from device_tokens where token like $1',[fixture.tokenPrefix+'%']))[0].n,0);
   const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   for(let i=0;i<3;i++){
    const email=randomUUID()+'@notifications-proof.invalid',password=randomUUID()+'Aa9!';
    const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
    fixture.users.push({id:made.data.user.id,email,password});save('fixture.private.json',fixture,false);
   }
   const owner=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   assert.equal((await owner.auth.signInWithPassword(fixture.users[0])).error,null);
   const seeded=await owner.from('notification_prefs').upsert({user_id:fixture.users[0].id,instant_enabled:false,daily_pulse_enabled:false,weekly_enabled:false,quiet_hours_start:'22:00:00',quiet_hours_end:'08:00:00',timezone:'America/Denver'}).select().single();
   assert.equal(seeded.error,null);save('initial-preferences.private.json',seeded.data);
   fixture.state='prepared';save('fixture.private.json',fixture,false);
   save('defines.private.json',{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,NOTIFICATION_TEST_EMAIL:fixture.users[0].email,NOTIFICATION_TEST_PASSWORD:fixture.users[0].password,NOTIFICATION_OTHER_EMAIL:fixture.users[1].email,NOTIFICATION_OTHER_PASSWORD:fixture.users[1].password,NOTIFICATION_TEST_TOKEN_PREFIX:fixture.tokenPrefix,GROOKAI_WEB_BASE_URL:'http://127.0.0.1:35791'});
   save('prepared.json',{status:'passed',at:new Date().toISOString(),...await retain(fixture),users:fixture.users.length,globalControlsChanged:false,productionWrites:0,providerCalls:0});
   console.log(JSON.stringify({status:'prepared',run,users:fixture.users.length,globalControlsChanged:false}));
  }catch(error){save('failure.json',{message:error.message,stack:error.stack});throw error;}
 }else{
  const fixture=read(run+'/fixture.private.json');assert.equal(fixture.project,project);assert.equal(fixture.state,'prepared');
  assert.match(fixture.tokenPrefix,/^notifications-proof-[a-f0-9-]+-$/);
  if(mode==='restore'){
   // Only tokens created by this synthetic fixture are disabled; keep all evidence.
   await q('update device_tokens set disabled_at=coalesce(disabled_at,now()) where user_id=any($1::uuid[]) and token like $2 and disabled_at is null',[fixture.users.map(user=>user.id),fixture.tokenPrefix+'%']);
   assert.equal((await q('select count(*)::int n from device_tokens where token like $1 and disabled_at is null',[fixture.tokenPrefix+'%']))[0].n,0);
  }
  const retention=await retain(fixture);
  save(mode+'-'+Date.now()+'.json',{status:'passed',at:new Date().toISOString(),...retention,globalControlsChanged:false,productionWrites:0,providerCalls:0});
  if(mode==='restore'){fixture.state='restored';save('fixture.private.json',fixture,false);}
  console.log(JSON.stringify({status:'passed',mode,run,...retention}));
 }
}finally{await db.end();}
