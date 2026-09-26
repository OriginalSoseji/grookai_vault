// Reuse only this task's empty synthetic lab. Preserve the proven 419-file
// fixture and snapshots; replay the release package from a separate directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {root,fixture as original,project,container,relay,guard as originalGuard,hash,hashes,docker,sql} from './storefront_production_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
export {root,project,hash,sql};
export const fixture=path.join(root,'.local/integration/production-package-v1');
const audit=path.join(root,'docs/audits/storefront_production_package_v1');
const source=JSON.parse(fs.readFileSync(path.join(audit,'consolidation.json')));
const baseline=JSON.parse(fs.readFileSync(path.join(original,'preparation.json')));
const expected={...baseline.sourceHashes,[source.output.name]:source.output.sha256};
assert.equal(Object.keys(expected).length,401);
export function guard(){
  assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
  assert.equal(project,'grookai-store-prod-20260926');
  assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),baseline.configSha256);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),expected);
  const state=JSON.parse(docker('inspect',container))[0];
  assert.equal(state.State.Running,true);assert.equal(state.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  const bridge=JSON.parse(docker('inspect',relay))[0];assert.equal(bridge.State.Running,true);
  for(const port of [29021,29022,29024])assert.deepEqual(bridge.NetworkSettings.Ports[`${port}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(expected).map(n=>n.split('_')[0]).sort());
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0|0');
  assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from vendor_store_rollout"),'false|false|false');
  assert.equal(sql("select enabled::text from vendor_batch_intake_control"),'false');
  assert.equal(sql("select enabled::text from vendor_scan_control"),'false');
  return {project,migrations:401,workers:0,users:0,cards:0,productionWrites:0};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert.ok(['replay','inspect'].includes(process.argv[2]));
  if(process.argv[2]==='inspect')console.log(JSON.stringify(guard()));
  else {
    originalGuard({full:true,scan:true});assert.ok(!fs.existsSync(fixture),'One-use replay; preserve failed evidence');
    const before=JSON.parse(sql(snapshotSql));assert.equal(before.LEDGER.length,419);
    const saved=JSON.parse(fs.readFileSync(path.join(original,'replayed-schema-419.private.json')));
    await compareSnapshots(saved,before);
    fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});
    for(const [name,digest] of Object.entries(baseline.sourceHashes)){
      const bytes=fs.readFileSync(path.join(original,'supabase/migrations',name));assert.equal(hash(bytes),digest);
      fs.writeFileSync(path.join(fixture,'supabase/migrations',name),bytes,{flag:'wx'});
    }
    const bytes=fs.readFileSync(path.join(audit,source.output.name));assert.equal(hash(bytes),source.output.sha256);
    fs.writeFileSync(path.join(fixture,'supabase/migrations',source.output.name),bytes,{flag:'wx'});
    fs.copyFileSync(path.join(original,'supabase/config.toml'),path.join(fixture,'supabase/config.toml'),fs.constants.COPYFILE_EXCL);
    fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
    fs.writeFileSync(path.join(fixture,'before-419.private.json'),JSON.stringify(before),{flag:'wx'});
    fs.writeFileSync(path.join(fixture,'replay-intent.json'),JSON.stringify({at:new Date().toISOString(),project,sourceHashes:expected,scriptSha256:hash(fs.readFileSync(new URL(import.meta.url)))}),{flag:'wx'});
    const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
    const run=spawnSync('supabase',['db','reset','--local','--no-seed','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
    const log=(run.stdout??'')+(run.stderr??'');fs.writeFileSync(path.join(fixture,'replay.private.log'),log,{flag:'wx'});
    assert.equal(run.status,0,'Inspect retained log; no automatic retry');
    const state=guard(),after=JSON.parse(sql(snapshotSql));
    fs.writeFileSync(path.join(fixture,'after-401.private.json'),JSON.stringify(after),{flag:'wx'});
    const comparison=await compareSnapshots(before,after,{output:path.join(fixture,'package-parity')});
    const report={at:new Date().toISOString(),status:'passed',...state,source:source.output,comparison,logSha256:hash(log),sharedResets:0,rolloutEnabled:false};
    fs.writeFileSync(path.join(audit,'replay.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
  }
}
