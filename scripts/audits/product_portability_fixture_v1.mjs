// Additive synthetic import/source fixture. No old row, rollout control or worker is changed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';

const root='C:/gv_product_portability_20261008',base='C:/grookai_vault_operator_artifacts/product_portability_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2',project='portfolio-full-438-v2-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const [mode,provided]=process.argv.slice(2);assert.ok(['prepare','verify','restore'].includes(mode));
assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/ui-'+Date.now():provided;
assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:32*1024*1024});
const baseline=read(base+'/BASELINE_429.json');assert.equal(baseline.status,'passed');assert.equal(baseline.productionWrites,0);
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,baseline.sourceHashes);assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
for(const [name,digest] of Object.entries(baseline.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest,name);
assert.equal(read('C:/grookai_vault_operator_artifacts/product_notifications_20261008/ui-1791513877558/fixture.private.json').state,'restored');
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
  const after=await fingerprints(table);for(const [hash,n]of Object.entries(hashes))assert.ok((after[hash]??0)>=n,'Prior row changed: '+table);
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
  assert.ok(Date.now()-Date.parse(baseline.at)<7200000,'Fresh baseline required before fixture writes');
  fs.mkdirSync(run);
  const tables=(await q("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).map(row=>row.name);
  const before={};for(const table of tables)before[table]=await fingerprints(table);save('before.private.json',before);
  const fixture={state:'preparing',project,users:[],set:randomUUID(),card:randomUUID(),normal:randomUUID(),reverse:randomUUID(),at:new Date().toISOString(),globalControlsChanged:false};
  fixture.setCode='portability-'+fixture.set;fixture.setName='Portability proof '+fixture.set.slice(0,8);fixture.cardName='Portability card '+fixture.card.slice(0,8);fixture.gv='GV-PK-PORTABILITY-'+fixture.card;
  save('fixture.private.json',fixture);
  try {
   const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
   for(let i=0;i<4;i++){
    const email=randomUUID()+'@portability-proof.invalid',password=randomUUID()+'Aa9!';
    const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);
    fixture.users.push({id:made.data.user.id,email,password});save('fixture.private.json',fixture,false);
   }
   await q('begin');
   try {
    await q("insert into sets(id,code,name,game) values($1,$2,$3,'pokemon')",[fixture.set,fixture.setCode,fixture.setName]);
    await q("insert into card_prints(id,game_id,set_id,set_code,name,number,gv_id,image_status,identity_domain) values($1,(select id from games where code='pokemon'),$2,$3,$4,'65',$5,'missing','pokemon_eng_standard')",[fixture.card,fixture.set,fixture.setCode,fixture.cardName,fixture.gv]);
    await q("insert into card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,'pokemon_eng_standard',$3,'65',$4,$5,'{\"variant_key_current\":\"standard\"}','pokemon_eng_standard:v1',$6,true)",[randomUUID(),fixture.card,fixture.setCode,fixture.cardName.toLowerCase(),fixture.cardName,createHash('sha256').update(fixture.card).digest('hex')]);
    for(const [id,finish]of [[fixture.normal,'normal'],[fixture.reverse,'reverse']])await q('insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,$3,$4,false)',[id,fixture.card,finish,fixture.gv+'-'+finish.toUpperCase()]);
    await q('commit');
   }catch(error){await q('rollback');throw error;}
   const headers=['Product Name','Category','Set','Card Number','Variance','Grade','Card Condition','Quantity','Average Cost Paid','Portfolio Name','Notes','Private source note'];
   const rows=[
    [fixture.cardName,'Pokemon',fixture.setName,'65','Normal','Ungraded','NM','2','4.25','Private','Normal cost',''],
    [fixture.cardName,'Pokemon',fixture.setName,'65','Reverse Holofoil','Ungraded','LP','1','9','Display','Comma, quote " and\nsecond line',''],
    [fixture.cardName,'Pokemon',fixture.setName,'65','Normal','PSA 10','NM','1','99','Slabs','Needs certificate',''],
    ['Unresolved source item','Unsupported game','Original set','','','Ungraded','NM','1','12.30','Keep source','Original notes','=literal private field'],
   ];
   const csv=[headers,...rows].map(values=>values.map(value=>'"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
   fixture.sourceSha256=createHash('sha256').update(csv).digest('hex');fixture.sourceRows=rows.length;
   fs.writeFileSync(run+'/source.private.csv',csv,{flag:'wx'});
   save('source-rows.private.json',rows.map(values=>Object.fromEntries(headers.map((key,index)=>[key,values[index]]))));
   fixture.state='prepared';save('fixture.private.json',fixture,false);
   save('defines.private.json',{SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,PORTABILITY_TEST_EMAIL:fixture.users[1].email,PORTABILITY_TEST_PASSWORD:fixture.users[1].password,PORTABILITY_OTHER_EMAIL:fixture.users[2].email,PORTABILITY_OTHER_PASSWORD:fixture.users[2].password,PORTABILITY_SOURCE_SHA:fixture.sourceSha256,GROOKAI_WEB_BASE_URL:'http://127.0.0.1:35831'});
   save('prepared.json',{status:'passed',at:new Date().toISOString(),...await retain(fixture),users:4,catalogCardsCreated:1,printingChildrenCreated:2,originalControlsUnchanged:true,productionWrites:0});
   fs.writeFileSync(base+'/fixture-current.json',JSON.stringify({run,sourceSha256:fixture.sourceSha256},null,2));
   console.log(JSON.stringify({run,state:fixture.state,sourceRows:4}));
  }catch(error){save('failure.json',{message:error.message,stack:error.stack});throw error;}
 }else{
  const fixture=read(run+'/fixture.private.json');assert.equal(fixture.project,project);assert.equal(fixture.state,'prepared');
  const kept=await retain(fixture);save(mode+'-'+Date.now()+'.json',{status:'passed',at:new Date().toISOString(),...kept,productionWrites:0,globalControlsChanged:false});
  if(mode==='restore'){fixture.state='restored';save('fixture.private.json',fixture,false);}
  console.log(JSON.stringify({run,mode,status:'passed',...kept}));
 }
}finally{await db.end();}
