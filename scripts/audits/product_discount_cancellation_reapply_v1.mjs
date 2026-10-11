// Exact migration reapplication on the populated upgrade fixture; no reset or remote path.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {snapshotSql,compareSnapshots} from '../schema/vendor_billing_schema_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_discount_20261008');
const base='C:/grookai_vault_operator_artifacts/product_discount_20261008',lab=base+'/upgrade-436-v1',project='discount-upgrade-436-v1-20261008',migration='20261008170000_vendor_discount_cancellation_v1.sql';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),upgraded=read(lab+'/upgrade-result.json');assert.equal(freeze.project,project);assert.equal(upgraded.status,'passed');assert.equal(upgraded.migrations,436);assert.equal(upgraded.retainedCostSnapshots,3);
assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34620/postgres',connectionTimeoutMillis:10000});await db.connect();
const out=base+'/cancellation-reapply-'+Date.now();fs.mkdirSync(out);const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
try{
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,436);
 const prior=read(lab+'/before-upgrade.private.json');
 const tables=[...Object.keys(prior),'public.vendor_event_control','public.vendor_discount_control','public.vendor_sales_cart_cancellations'];
 const rows=async()=>{const result={};for(const t of tables)result[t]=(await db.query(`select to_jsonb(t) row from ${t} t order by to_jsonb(t)::text`)).rows.map(r=>r.row);return result;};
 const beforeRows=await rows();for(const t of Object.keys(prior))assert.deepEqual(beforeRows[t],prior[t],t);
 assert.equal(beforeRows['public.vendor_event_control'][0].enabled,false);assert.equal(beforeRows['public.vendor_discount_control'][0].enabled,false);
 const schema=async()=>{const results=await db.query(snapshotSql);const found=results.find(r=>r.rows?.[0]?.receipt);assert.ok(found);return found.rows[0].receipt;};
 const before=await schema();save('before.private.json',before);save('rows-before.private.json',beforeRows);
 save('intent.json',{at:new Date().toISOString(),project,migration,sha256:freeze.sourceHashes[migration],consumed:true,productionWrites:0});
 await db.query(fs.readFileSync(root+'supabase/migrations/'+migration,'utf8'));
 assert.deepEqual(await rows(),beforeRows);
 const after=await schema();save('after.private.json',after);assert.deepEqual(after.LEDGER,before.LEDGER);
 const comparison=await compareSnapshots(before,after,{output:out+'/parity'});assert.equal(comparison.rawBytes,0);assert.equal(comparison.normalizedBytes,0);
 save('result.json',{at:new Date().toISOString(),status:'passed',project,comparison,retainedTables:tables.length,rowsUnchanged:true,migrationSha256:freeze.sourceHashes[migration],productionWrites:0,resets:0});
 console.log(JSON.stringify({status:'passed',out}));
}finally{await db.query('rollback').catch(()=>{});await db.end();}
