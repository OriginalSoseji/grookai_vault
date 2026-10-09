// Reapply exact qualified candidate on its populated isolated lab, retaining every row.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {snapshotSql,compareSnapshots} from '../schema/vendor_billing_schema_v1.mjs';
const root='C:/gv_product_inventory_export_20261008',base='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008',lab=base+'/release-full-438-v1',project='inv-rel-full-438-v1-20261008',migration='20261009010000_inventory_export_v1.sql';
assert.equal(process.argv.length,2);assert.equal(process.cwd().replaceAll('\\','/'),root);
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),freeze=read(lab+'/freeze.json');
assert.equal(freeze.project,project);const rpc=read(base+'/RELEASE_RPC_V1.json');assert.equal(rpc.status,'passed');assert.equal(rpc.project,project);assert.equal(read(rpc.out+'/result.json').status,'passed');
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest,name);
assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:30000});
const container=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:36020/postgres',connectionTimeoutMillis:10000});await db.connect();
const out=base+'/release-reapply-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});fs.copyFileSync(new URL(import.meta.url),out+'/producer.mjs',fs.constants.COPYFILE_EXCL);
try{
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);assert.equal((await db.query('select enabled from portfolio_history_control')).rows[0].enabled,false);
 const tables=(await db.query("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).rows.map(r=>r.name);
 const rows=async()=>{const result={};for(const table of tables){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);result[table]=(await db.query(`select count(*)::int n,md5(coalesce(string_agg(to_jsonb(t)::text,E'\n' order by to_jsonb(t)::text),'')) digest from ${table} t`)).rows[0];}return result;};
 const schema=async()=>{const results=await db.query(snapshotSql);return results.find(r=>r.rows?.[0]?.receipt).rows[0].receipt;};
 const beforeRows=await rows(),before=await schema();assert.ok(beforeRows['public.vault_item_instances'].n>=5);save('before.private.json',before);save('rows-before.json',beforeRows);
 save('intent.json',{at:new Date().toISOString(),project,migration,sha256:freeze.sourceHashes[migration],consumed:true,productionWrites:0});
 await db.query(fs.readFileSync(root+'/supabase/migrations/'+migration,'utf8'));assert.deepEqual(await rows(),beforeRows);
 const after=await schema();save('after.private.json',after);assert.deepEqual(before.LEDGER,after.LEDGER);
 const comparison=await compareSnapshots(before,after,{output:out+'/parity'});assert.equal(comparison.rawBytes,0);assert.equal(comparison.normalizedBytes,0);
 save('result.json',{status:'passed',at:new Date().toISOString(),project,comparison,retainedTables:tables.length,retainedCopies:beforeRows['public.vault_item_instances'].n,rowsUnchanged:true,migrationSha256:freeze.sourceHashes[migration],productionWrites:0,resets:0});
 fs.writeFileSync(base+'/RELEASE_REAPPLY_V1.json',JSON.stringify({status:'passed',out,project,productionWrites:0},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'passed',out}));
}catch(error){save('failure.json',{status:'failed',message:error.message,stack:error.stack});throw error;}
finally{await db.query('rollback').catch(()=>{});await db.end();}
