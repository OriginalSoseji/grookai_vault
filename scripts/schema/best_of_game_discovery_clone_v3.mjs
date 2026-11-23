// Add two owned clones of genuine qualified513 databases. Never reset or mutate a source.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120';
const prior='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120';
const project='bog-discovery-513-20261120',out=art+'/clones-v3-r1';
assert.equal(process.argv.length,2);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v3.json');
assert.equal(read(art+'/baseline-v3-r1/qualification.json').pass,true);
assert.equal(read(prior+'/local-qualification-v2-r2/qualification.json').pass,true);
for(const[f,h]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:60000,maxBuffer:4000000,windowsHide:true}).trim();
const inspect=n=>JSON.parse(docker(['inspect',n]))[0],info=inspect('supabase_db_'+project);
assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker(['network','inspect',project]))[0].Internal,true);
const services=['rest','auth','storage'].map(k=>inspect('supabase_'+k+'_'+project));
for(const s of services){assert.equal(s.State.Running,true);assert.deepEqual(Object.keys(s.NetworkSettings.Networks),[project]);}
const r=createRequire(root+'/package.json'),config={host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',connectionTimeoutMillis:15000};
const client=(database,admin=false)=>new(r('pg').Client)({...config,database,user:admin?'supabase_admin':'postgres',application_name:'bog-owned-513-clone-v3'});
const save=(name,v)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
const fingerprint=async c=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
async function capture(database,label){
 const c=client(database);await c.connect();
 try{
  assert.deepEqual((await c.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'ledger',(select count(*) from supabase_migrations.schema_migrations),'workers',current_setting('max_worker_processes'))value")).rows[0].value,{cards:1349,copies:22,users:1,ledger:513,workers:'0'});
  const data=await fingerprint(c);save(label+'-fingerprints',data);
  for(const[name,file]of[['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']])save(label+'-'+name,(await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt);
  const settings=(await c.query("select unnest(setconfig) value from pg_db_role_setting where setdatabase=(select oid from pg_database where datname=current_database()) and setrole=0 order by value")).rows.map(x=>x.value);
  return{data,settings};
 }finally{await c.end();}
}
const profiles=[{profile:'fresh',source:'postgres',database:'bog_perf_fresh_513_v3'},{profile:'retained',source:'bog_discovery_retained_512_v2',database:'bog_perf_retained_513_v3'}];
const report={pass:false,productionWrites:0,sourceDataWrites:0,sourceReset:false,startedAt:new Date().toISOString(),profiles:[],candidateSha256:Object.values(binding.candidates)[0],originalProject:project},before=new Map();
const admin=client('template1',true);
try{
 for(const p of profiles)before.set(p.profile,await capture(p.source,p.profile+'-source-before'));
 await admin.connect();
 for(const p of profiles)assert.equal((await admin.query('select count(*)::int n from pg_database where datname=$1',[p.database])).rows[0].n,0);
 fs.writeFileSync(out+'/clone-intent.json',JSON.stringify({...report,profiles,temporaryServices:services.map(s=>({id:s.Id,name:s.Name})),consumed:true},null,2)+'\n',{flag:'wx'});
 for(const s of services){assert.equal(inspect(s.Id).Image,s.Image);docker(['stop','--time','20',s.Id]);}
 for(const p of profiles){
  assert.equal((await admin.query('select count(*)::int n from pg_stat_activity where datname=$1',[p.source])).rows[0].n,0,'Never terminate another connection');
  await admin.query('create database '+p.database+' with template '+p.source+' owner postgres');
  for(const setting of before.get(p.profile).settings){const i=setting.indexOf('='),key=setting.slice(0,i),value=setting.slice(i+1);await admin.query('alter database '+p.database+' set "'+key.replaceAll('"','""')+'" to \''+value.replaceAll("'","''")+'\'');}
  const after=await capture(p.database,p.profile+'-clone');assert.deepEqual(after.data,before.get(p.profile).data);
  report.profiles.push({...p,ledger:513,protectedTables:Object.keys(after.data).length,exactPopulatedClone:true});
 }
 report.pass=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{
 await admin.end().catch(()=>{});
 for(const s of services)try{const v=inspect(s.Id);assert.equal(v.Name,s.Name);assert.equal(v.Image,s.Image);if(!v.State.Running)docker(['start',s.Id]);assert.equal(inspect(s.Id).State.Running,true);}catch(e){report.pass=false;report.serviceRestoreError=e.message;process.exitCode=1;}
 for(const p of profiles)if(before.has(p.profile))try{assert.deepEqual((await capture(p.source,p.profile+'-source-after')).data,before.get(p.profile).data);}catch(e){report.pass=false;report.sourceProtectionError=e.message;process.exitCode=1;}
 report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
