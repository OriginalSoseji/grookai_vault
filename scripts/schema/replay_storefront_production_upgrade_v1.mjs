// Apply only the hash-reviewed 18 candidates to the disposable local baseline.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fixture,project,guard,hash,hashes,sql} from './storefront_production_lab_v1.mjs';
assert.equal(process.argv.length,2);
const before=guard();assert.equal(before.migrations,400);
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/baseline-schema.json')));
assert.equal(baseline.status,'passed');assert.equal(baseline.comparison.normalizedBytes,0);assert.ok(Date.now()-Date.parse(baseline.at)<86400000);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/integration-manifest.json')));
assert.equal(manifest.pendingCandidates.length,18);
const intent=path.join(fixture,'upgrade-intent.json');assert.ok(!fs.existsSync(intent));
const footprintSql=fs.readFileSync('C:/gv_store_billing_20260919/scripts/audits/storefront_schema_footprint_v1.sql','utf8');
const old=JSON.parse(sql(footprintSql));fs.writeFileSync(path.join(fixture,'before-upgrade-footprint.json'),JSON.stringify(old),{flag:'wx'});
for(const item of manifest.pendingCandidates){
  const bytes=fs.readFileSync(path.join('C:/gv_store_billing_20260919/supabase/migrations',item.name));
  assert.equal(hash(bytes),item.sha256);assert.equal(bytes.length,item.bytes);
  fs.writeFileSync(path.join(root,'supabase/migrations',item.name),bytes,{flag:'wx'});
  fs.writeFileSync(path.join(fixture,'supabase/migrations',item.name),bytes,{flag:'wx'});
}
fs.writeFileSync(intent,JSON.stringify({at:new Date().toISOString(),project,before,pending:manifest.pendingCandidates},null,2),{flag:'wx'});
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['migration','up','--local','--include-all','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
const log=(run.stdout??'')+(run.stderr??'');fs.writeFileSync(path.join(fixture,'upgrade-private.log'),log,{flag:'wx'});
assert.equal(run.status,0,'Inspect retained migration log; do not reset or retry automatically');
const expected=hashes(path.join(fixture,'supabase/migrations'));
assert.equal(Object.keys(expected).length,418);
assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(expected).map(n=>n.split('_')[0]).sort());
const current=JSON.parse(sql(footprintSql));fs.writeFileSync(path.join(fixture,'after-upgrade-footprint.json'),JSON.stringify(current),{flag:'wx'});
const key=o=>o.kind+'|'+o.key,previous=new Map(old.objects.map(o=>[key(o),o])),next=new Map(current.objects.map(o=>[key(o),o]));
const added=current.objects.filter(o=>!previous.has(key(o))),removed=old.objects.filter(o=>!next.has(key(o))),changed=current.objects.filter(o=>previous.has(key(o))&&JSON.stringify(o)!==JSON.stringify(previous.get(key(o))));
assert.deepEqual(removed,[],'Upgrade must not remove existing objects');
assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
assert.equal(sql("select enabled::text from public.vendor_batch_intake_control;"),'false');
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0');
const result={at:new Date().toISOString(),status:'passed',project,upgradeFrom:400,applied:418,pending:manifest.pendingCandidates,addedObjects:added,changedObjects:changed,removedObjects:removed,sourceHashes:expected,logSha256:hash(log),productionWrites:0,sharedResets:0,rolloutEnabled:false};
fs.writeFileSync(path.join(root,'docs/audits/storefront_production_20260926/local-upgrade.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({status:result.status,applied:418,added:added.length,changed:changed.map(o=>key(o)),removed:removed.length,rolloutEnabled:false,productionWrites:0}));
