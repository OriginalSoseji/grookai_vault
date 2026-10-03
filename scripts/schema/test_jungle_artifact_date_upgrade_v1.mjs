// One-use additive local upgrade of the retained, populated 415 fixture.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';import pg from 'pg';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',fixture=base+'/upgrade-415-v17',project='jungle-edition-upgrade-415-v17-20261001';
const migration='20261001210000_jungle_edition_current_artifact_date_v1.sql',out=base+'/populated-source-v1/artifact-date-upgrade-'+Date.now();
assert.equal(process.argv.length,2);assert.ok(!fs.existsSync(out));fs.mkdirSync(out);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),save=(n,x)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2),{flag:'wx'});
const freeze=read(fixture+'/freeze.json');assert.equal(freeze.project,project);assert.equal(read(base+'/populated-source-v1/seed-receipt.json').status,'passed');
for(const [name,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+name)),h,name);
const baseline=read(base+'/jungle-source-baseline-413-latest.json');assert.equal(baseline.status,'passed');assert.ok(Date.now()-Date.parse(baseline.at)<3600000);
assert.equal(baseline.sourceHashes[migration],sha(fs.readFileSync('supabase/migrations/'+migration)));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000});const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];
assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
for(const bindings of Object.values(JSON.parse(docker('inspect',project+'-relay'))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
assert.equal(sha(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const c=new pg.Client({host:'127.0.0.1',port:64940,user:'postgres',password:'postgres',database:'postgres',statement_timeout:120000});await c.connect();
try{
 const target=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.match(target.address,/^10\.248\.5\.\d+$/);assert.equal(target.workers,'0');assert.equal(target.migrations,415);
 const tables=(await c.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname")).rows;
 const footprintSql=tables.map(({relname:n})=>`select '${n}' table_name,count(*)::int rows,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from public."${n}" t`).join(' union all ')+' order by table_name';
 const before=(await c.query(footprintSql)).rows;save('before-footprints.json',before);save('before-schema.private.json',(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt);
 assert.equal((await c.query('select count(*)::int n from v_tcgplayer_jungle_edition_assignment_candidates_v1')).rows[0].n,0);
 save('intent.json',{at:new Date().toISOString(),project,consumed:true,mode:'local_cli_additive_upgrade',migration,sha256:baseline.sourceHashes[migration],productionWrites:0});
 fs.copyFileSync('supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
 const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
 const fd=fs.openSync(out+'/upgrade.private.log','wx');let result;try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true,timeout:300000});}finally{fs.closeSync(fd);}assert.ifError(result.error);assert.equal(result.status,0);
 assert.equal((await c.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,416);
 assert.deepEqual((await c.query(footprintSql)).rows,before);
 const count=async()=>(await c.query('select count(*)::int n from v_tcgplayer_jungle_edition_assignment_candidates_v1')).rows[0].n;
 assert.equal(await count(),128);const tests=['missing_current_artifact_date_uses_matching_run_and_quote_dates'];
 await c.query('begin');
 const cases=[['explicit_matching_date',"update tcgcsv_source_artifacts set observed_on='2026-10-01'",128],['conflicting_date',"update tcgcsv_source_artifacts set observed_on='2026-09-30'",0],['wrong_run_key',"update tcgcsv_source_artifacts set run_key='wrong'",0],['wrong_artifact_kind',"update tcgcsv_source_artifacts set artifact_kind='products'",0],['wrong_group',"update tcgcsv_source_artifacts set group_id=636",0],['bad_http_status',"update tcgcsv_source_artifacts set http_status=404",0],['run_quote_date_mismatch',"update tcgcsv_source_price_daily_observations set observed_on='2026-09-30'",0]];
 for(const [name,sql,expected]of cases){await c.query('savepoint negative');await c.query(sql);assert.equal(await count(),expected,name);await c.query('rollback to negative');tests.push(name);}
 await c.query('rollback');assert.deepEqual((await c.query(footprintSql)).rows,before);
 save('after-schema.private.json',(await c.query(snapshotSql)).find(r=>r.rows?.[0]?.receipt).rows[0].receipt);
 const receipt={at:new Date().toISOString(),status:'passed',project,migrations:416,migrationSha256:baseline.sourceHashes[migration],tests,protectedTables:before.length,savedCopies:7,allExistingRowsUnchanged:true,productionWrites:0,priceActivation:false};save('receipt.json',receipt);fs.writeFileSync(base+'/populated-source-v1/artifact-date-upgrade-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message});throw e;}finally{await c.end();}
