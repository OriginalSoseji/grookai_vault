// Recover the completed V2 replay's final readback after Docker Desktop crashed.
// Never starts, stops, resets, migrates or changes an existing database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {snapshotSql} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,2);
const root='C:/gv_store_seller_link_20260928',project='grookai-seller-review-20260929';
const fixture=root+'/.local/integration/seller-adoption-v2/replay-409';
const hash=b=>createHash('sha256').update(b).digest('hex');
const intent=JSON.parse(fs.readFileSync(fixture+'/intent.json'));assert.equal(intent.project,project);assert.equal(intent.consumed,true);
assert.ok(!fs.existsSync(fixture+'/receipt.json'),'Readback already completed; do not overwrite evidence');
assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),intent.configSha256);
const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
assert.equal(Object.keys(sources).length,409);assert.deepEqual(sources,intent.sourceHashes);
for(const [name,digest]of Object.entries(sources))assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+name)),digest);
const logs=Object.fromEntries(['start','full-reset','push-noop'].map(n=>[n,fs.readFileSync(fixture+'/'+n+'.private.log','utf8')]));
assert.match(logs['full-reset'],/Finished supabase db reset/);assert.match(logs['push-noop'],/Remote database is up to date/);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);
assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:'begin read only;'+q+';rollback;',encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from vendor_seller_accounts)||'|'||(select count(*) from card_prints)||'|'||(select count(*) from cron.job_run_details)"),'0|0|0|0|0');
assert.equal(sql('select onboarding_enabled::text from vendor_seller_rollout'),'false');assert.equal(sql('select orders_enabled::text from vendor_orders_rollout'),'false');
// snapshotSql already opens an explicit read-only transaction.
const replayed=JSON.parse(execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:snapshotSql,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}));
assert.equal(replayed.read_only,'on');assert.deepEqual(replayed.LEDGER.map(r=>r.version),Object.keys(sources).map(n=>n.split('_')[0]).sort());
fs.writeFileSync(fixture+'/replayed.private.json',JSON.stringify(replayed,null,2),{flag:'wx'});
const receipt={status:'passed',at:new Date().toISOString(),project,migrations:409,fullReplay:true,noOpPush:true,sourceHashes:sources,productionWrites:0,recoveredReadback:true,
 originalCommandLogs:Object.fromEntries(Object.entries(logs).map(([n,v])=>[n,hash(v)])),databaseResetDuringRecovery:false};
fs.writeFileSync(fixture+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',project,migrations:409,recoveredReadback:true,databaseResetDuringRecovery:false}));
