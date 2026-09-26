import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {root,project,hash,sql,guard as packageGuard,fixture as previous} from './storefront_production_package_lab_v1.mjs';
import {hashes,docker,container,relay} from './storefront_production_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
export {root,project,hash,sql};
export const fixture=path.join(root,'.local/integration/production-trial-v1');
export const migration='20260926200000_vendor_store_trials_v1.sql';
export const audit=path.join(root,'docs/audits/storefront_production_trials_v1');
const base=hashes(path.join(previous,'supabase/migrations'));assert.equal(Object.keys(base).length,401);
const expected={...base,[migration]:hash(fs.readFileSync(path.join(root,'supabase/migrations',migration)))};
export function guard(){
  assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_store_production_20260926');
  assert.equal(project,'grookai-store-prod-20260926');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json'))).sourceHashes,expected);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),expected);
  assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),hash(fs.readFileSync(path.join(previous,'supabase/config.toml'))));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.equal(db.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  const bridge=JSON.parse(docker('inspect',relay))[0];assert.equal(bridge.State.Running,true);
  for(const p of [29021,29022,29024])assert.deepEqual(bridge.NetworkSettings.Ports[`${p}/tcp`],[{HostIp:'127.0.0.1',HostPort:String(p)}]);
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(expected).map(n=>n.split('_')[0]).sort());
  assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from card_prints)||'|'||(select count(*) from cron.job_run_details)||'|'||(select count(*) from vendor_store_trial_invites);"),'0|0|0|0|0');
  assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from vendor_store_rollout"),'false|false|false');
  assert.equal(sql("select (select enabled::text from vendor_scan_control)||'|'||(select enabled::text from vendor_batch_intake_control)"),'false|false');
  return {project,migrations:402,users:0,cards:0,workers:0,productionWrites:0};
}
function cli(args,name){
  const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
  const r=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
  fs.writeFileSync(path.join(fixture,name+'.private.log'),(r.stdout??'')+(r.stderr??''),{flag:'wx'});assert.equal(r.status,0,'Inspect retained local log before any recovery');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['prepare','replay','inspect'].includes(mode));
  if(mode==='inspect')console.log(JSON.stringify(guard()));
  else if(mode==='prepare'){
    packageGuard();assert.ok(!fs.existsSync(fixture));fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});fs.mkdirSync(audit,{recursive:true});
    fs.writeFileSync(path.join(fixture,'before-401.private.json'),sql(snapshotSql),{flag:'wx'});
    const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
    const before=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'before-footprint.private.json'),JSON.stringify(before),{flag:'wx'});
    for(const name of Object.keys(expected))fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
    fs.copyFileSync(path.join(previous,'supabase/config.toml'),path.join(fixture,'supabase/config.toml'),fs.constants.COPYFILE_EXCL);
    fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
    fs.writeFileSync(path.join(fixture,'preparation.json'),JSON.stringify({at:new Date().toISOString(),project,sourceHashes:expected}),{flag:'wx'});
    cli(['migration','up','--local','--yes'],'upgrade');guard();
    const after=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'after-footprint.private.json'),JSON.stringify(after),{flag:'wx'});
    const key=r=>r.kind+'|'+r.key,map=new Map(after.objects.map(r=>[key(r),r])),oldKeys=new Set(before.objects.map(key));let changed=0;
    for(const old of before.objects){const next=map.get(key(old));assert.ok(next);if(old.kind==='function'&&old.key.startsWith('public.grookai_effective_entitlement_v1(')){assert.deepEqual({...next.value,definition_hash:old.value.definition_hash},old.value);assert.notEqual(next.value.definition_hash,old.value.definition_hash);changed++;}else assert.deepEqual(next,old);}
    assert.equal(changed,1);const added=after.objects.filter(r=>!oldKeys.has(key(r)));assert.ok(added.length>0);for(const r of added)assert.ok(r.key.startsWith('public.vendor_store_trial_'),r.key);
    fs.writeFileSync(path.join(audit,'upgrade.json'),JSON.stringify({at:new Date().toISOString(),status:'passed',migration,sha256:expected[migration],changedFunctions:1,addedObjects:added.length,retainedObjects:before.objects.length-1,productionWrites:0},null,2),{flag:'wx'});
    console.log(JSON.stringify({status:'upgraded_local_only',addedObjects:added.length,changedFunctions:1}));
  }else{
    guard();const tests=JSON.parse(fs.readFileSync(path.join(audit,'runtime.json')));assert.equal(tests.status,'passed');
    assert.ok(!fs.existsSync(path.join(fixture,'replay-intent.json')));const before=JSON.parse(sql(snapshotSql));
    fs.writeFileSync(path.join(fixture,'upgraded-402.private.json'),JSON.stringify(before),{flag:'wx'});
    fs.writeFileSync(path.join(fixture,'replay-intent.json'),JSON.stringify({at:new Date().toISOString(),sourceHashes:expected}),{flag:'wx'});
    cli(['db','reset','--local','--no-seed','--yes'],'replay');const state=guard(),after=JSON.parse(sql(snapshotSql));
    fs.writeFileSync(path.join(fixture,'replayed-402.private.json'),JSON.stringify(after),{flag:'wx'});assert.deepEqual(before.LEDGER,after.LEDGER);
    const comparison=await compareSnapshots(before,after,{output:path.join(fixture,'replay-parity')});
    const report={at:new Date().toISOString(),status:'passed',...state,sourceHashes:expected,comparison};fs.writeFileSync(path.join(audit,'replay.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
  }
}
