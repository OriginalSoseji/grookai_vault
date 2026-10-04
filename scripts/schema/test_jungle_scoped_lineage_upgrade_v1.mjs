// Additive CLI upgrade of the empty full416 replay and populated retained416 lab.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';import pg from 'pg';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const migration='20261001220000_jungle_edition_scoped_lineage_validation_v1.sql';
assert.equal(process.argv.length,2);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const baseline=read(base+'/jungle-source-baseline-413-latest.json');assert.equal(baseline.status,'passed');assert.ok(Date.now()-Date.parse(baseline.at)<3600000);assert.equal(baseline.sourceHashes[migration],sha(fs.readFileSync('supabase/migrations/'+migration)));
const out=base+'/populated-source-v1/scoped-lineage-upgrade-'+Date.now();fs.mkdirSync(out);const save=(n,x)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2),{flag:'wx'});
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});let clean;
for(const [kind,directory,project,port,network]of [['full','full-416-v18','jungle-edition-full-416-v18-20261001',65040,'10.248.6.'],['populated','upgrade-415-v17','jungle-edition-upgrade-415-v17-20261001',64940,'10.248.5.']]){
 const fixture=base+'/'+directory,freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);
 for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
 assert.equal(read(fixture+(kind==='full'?'/replay-result.json':'/upgrade-result.json')).status,'passed');
 if(kind==='populated')assert.equal(read(base+'/populated-source-v1/artifact-date-upgrade-receipt.json').status,'passed');
 const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
 for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
 assert.equal(sha(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
 assert.ok(!fs.existsSync(fixture+'/supabase/migrations/'+migration),'Consumed upgrade cannot be repeated');
 const c=new pg.Client({host:'127.0.0.1',port,user:'postgres',password:'postgres',database:'postgres',statement_timeout:120000});await c.connect();
 try{
  const target=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.ok(target.address.startsWith(network));assert.equal(target.workers,'0');assert.equal(target.migrations,417);
  const tables=(await c.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname")).rows;
  const footprintSql=tables.map(({relname:n})=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ')+' order by table_name';
  const before=(await c.query(footprintSql)).rows;save(kind+'-before-footprints.json',before);
  save(kind+'-intent.json',{at:new Date().toISOString(),project,consumed:true,migration,sha256:baseline.sourceHashes[migration],productionWrites:0});
  fs.copyFileSync('supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
  const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
  const fd=fs.openSync(out+'/'+kind+'-upgrade.private.log','wx');let result;try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true,timeout:300000});}finally{fs.closeSync(fd);}assert.ifError(result.error);assert.equal(result.status,0);
  assert.equal((await c.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,418);assert.deepEqual((await c.query(footprintSql)).rows,before);
  const schema=(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt;save(kind+'-schema.private.json',schema);
  if(kind==='full')clean=schema;else{assert.deepEqual(schema.LEDGER,clean.LEDGER);save('schema-parity.json',await compareSnapshots(schema,clean,{output:out+'/parity'}));assert.equal((await c.query('select count(*)::int n from v_tcgplayer_jungle_edition_assignment_candidates_v1')).rows[0].n,128);}
  save(kind+'-receipt.json',{status:'passed',at:new Date().toISOString(),project,migrations:418,allExistingRowsUnchanged:true,protectedTables:before.length,productionWrites:0});
 }catch(e){await c.query('rollback').catch(()=>{});save(kind+'-failure.json',{at:new Date().toISOString(),message:e.message});throw e;}finally{await c.end();}
}
const receipt={status:'passed',at:new Date().toISOString(),migrationSha256:baseline.sourceHashes[migration],migrations:418,fullReplay:true,retainedUpgrade:true,productionWrites:0,out};save('receipt.json',receipt);fs.writeFileSync(base+'/populated-source-v1/scoped-lineage-upgrade-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
