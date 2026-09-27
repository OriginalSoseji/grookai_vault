// Fresh one-use 403→404 upgrade and full replay in the dedicated empty294xx lab.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {root,project,fixture as initial,guard as initialGuard,hash,hashes,sql,docker,container,relay} from './store_team_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
export {root,project,hash,sql};
export const fixture=path.join(root,'.local/integration/store-team-hardening-replay-v1');
export const audit=path.join(root,'docs/audits/store_team_hardening_v1');
export const migration='20260927070000_vendor_store_team_hardening_v1.sql';
export function guard(){
  assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
  const plan=JSON.parse(fs.readFileSync(path.join(fixture,'intent.json')));
  assert.equal(plan.project,project);assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),plan.configSha256);
  const expected=plan.sourceHashes;assert.equal(Object.keys(expected).length,404);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),expected);
  const state=JSON.parse(docker('inspect',container))[0];
  assert.equal(state.State.Running,true);
  assert.equal(state.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.equal(state.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);
  assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  const bridge=JSON.parse(docker('inspect',relay))[0];
  assert.equal(bridge.State.Running,true);
  for(const port of [29421,29422,29424]) assert.deepEqual(bridge.NetworkSettings.Ports[`${port}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
  const versions=sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/);
  assert.deepEqual(versions,Object.keys(expected).map(n=>n.split('_')[0]).sort());
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details);"),'0|0|0|0|0');
  assert.deepEqual(hashes(path.join(root,'supabase/migrations')),expected);
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  return {project,migrations:versions.length,workers:0,users:0,cards:0,productionWrites:0};
}
function cli(args,label){
  const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
  const run=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
  fs.writeFileSync(path.join(fixture,`${label}.private.log`),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
  assert.equal(run.status,0,'Inspect retained replay log. Do not rerun consumed reset intents.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,2);initialGuard();assert.ok(!fs.existsSync(fixture));
 const sourceHashes=hashes(path.join(root,'supabase/migrations'));assert.equal(Object.keys(sourceHashes).length,404);
 const oldHashes=JSON.parse(fs.readFileSync(path.join(root,'.local/integration/store-team-replay-v2/intent.json'))).sourceHashes;
 for(const [name,value] of Object.entries(oldHashes))assert.equal(sourceHashes[name],value);
 const readback=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/store_team_v1/production-applied.json')));assert.equal(readback.status,'passed');assert.equal(readback.migrations,403);
 fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});fs.mkdirSync(audit,{recursive:true});
 fs.copyFileSync(path.join(initial,'supabase/config.toml'),path.join(fixture,'supabase/config.toml'),fs.constants.COPYFILE_EXCL);
 fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
 for(const name of Object.keys(sourceHashes))fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(path.join(fixture,'intent.json'),JSON.stringify({at:new Date().toISOString(),project,container,relay,sourceHashes,configSha256:hash(fs.readFileSync(path.join(fixture,'supabase/config.toml')))},null,2),{flag:'wx'});
 const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
 const before=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'baseline-footprint.private.json'),JSON.stringify(before),{flag:'wx'});
 fs.writeFileSync(path.join(fixture,'baseline.private.json'),sql(snapshotSql),{flag:'wx'});
 cli(['migration','up','--local','--yes'],'upgrade-404');guard();
 const after=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'upgrade-footprint.private.json'),JSON.stringify(after),{flag:'wx'});
 const key=r=>r.kind+'|'+r.key,next=new Map(after.objects.map(r=>[key(r),r])),old=new Map(before.objects.map(r=>[key(r),r]));
 const changed=before.objects.filter(r=>JSON.stringify(next.get(key(r)))!==JSON.stringify(r));
 assert.ok(changed.length>0);for(const r of changed)assert.match(r.key,/vendor_store_team_copy_v1|vendor_store_team_media_insert/);
 const added=after.objects.filter(r=>!old.has(key(r)));for(const r of added)assert.ok(r.key.includes('vendor_store_team_upload_budget_v1'));
 const upgraded=JSON.parse(sql(snapshotSql));fs.writeFileSync(path.join(fixture,'upgraded.private.json'),JSON.stringify(upgraded),{flag:'wx'});
 cli(['db','reset','--local','--no-seed','--yes'],'full-404');guard();cli(['db','push','--local','--yes'],'push-noop');
 const replayed=JSON.parse(sql(snapshotSql));fs.writeFileSync(path.join(fixture,'replayed.private.json'),JSON.stringify(replayed),{flag:'wx'});
 assert.deepEqual(upgraded.LEDGER,replayed.LEDGER);const comparison=await compareSnapshots(upgraded,replayed,{output:path.join(fixture,'parity')});
 const report={at:new Date().toISOString(),status:'passed',...guard(),sourceHashes,changedObjects:changed.map(key),addedObjects:added.map(key),retainedObjects:before.objects.length-changed.length,comparison};
 fs.writeFileSync(path.join(audit,'replay.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',changedObjects:report.changedObjects,addedObjects:report.addedObjects}));
}
