// A new, one-use replay in the dedicated 294xx team lab only. Retains V1 bytes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,project,fixture as initial,guard as initialGuard,hash,hashes,sql,docker,container,relay} from './store_team_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
export const fixture=path.join(root,'.local/integration/store-team-replay-v2');
export const migration='20260927060000_vendor_store_team_v1.sql';
export const audit=path.join(root,'docs/audits/store_team_v1');
export {root,project,hash,sql};
export function guard(){
  initialGuard();
  const plan=JSON.parse(fs.readFileSync(path.join(fixture,'intent.json')));
  assert.deepEqual(hashes(path.join(root,'supabase/migrations')),plan.sourceHashes);
  assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),plan.sourceHashes);
  assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),plan.configSha256);
  assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  return {project,migrations:403,productionWrites:0};
}
function cli(args,label){
  const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
  const run=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
  fs.writeFileSync(path.join(fixture,`${label}.private.log`),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
  assert.equal(run.status,0,'Inspect retained replay log. Do not rerun consumed reset intents.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,2);initialGuard();assert.ok(!fs.existsSync(fixture));
  const sourceHashes=hashes(path.join(root,'supabase/migrations'));assert.equal(Object.keys(sourceHashes).length,403);
  const original=JSON.parse(fs.readFileSync(path.join(initial,'preparation.json')));
  for(const [name,value] of Object.entries(original.sourceHashes))if(name!==migration)assert.equal(sourceHashes[name],value);
  fs.mkdirSync(path.join(fixture,'supabase/migrations'),{recursive:true});fs.mkdirSync(audit,{recursive:true});
  fs.copyFileSync(path.join(initial,'supabase/config.toml'),path.join(fixture,'supabase/config.toml'),fs.constants.COPYFILE_EXCL);
  fs.mkdirSync(path.join(fixture,'supabase/.temp'));fs.writeFileSync(path.join(fixture,'supabase/.temp/postgres-version'),'17.6.1.113',{flag:'wx'});
  for(const name of Object.keys(sourceHashes))if(name!==migration)fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(fixture,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(fixture,'intent.json'),JSON.stringify({at:new Date().toISOString(),project,container,relay,sourceHashes,configSha256:hash(fs.readFileSync(path.join(fixture,'supabase/config.toml')))},null,2),{flag:'wx'});
  // Exact container/network and zero-data guard above authorizes this new lab reset only.
  cli(['db','reset','--local','--no-seed','--yes'],'baseline-402');
  assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'402');
  const footprint=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
  const before=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'baseline-footprint.private.json'),JSON.stringify(before),{flag:'wx'});
  fs.copyFileSync(path.join(root,'supabase/migrations',migration),path.join(fixture,'supabase/migrations',migration),fs.constants.COPYFILE_EXCL);
  cli(['migration','up','--local','--yes'],'upgrade-403');guard();
  const after=JSON.parse(sql(footprint));fs.writeFileSync(path.join(fixture,'upgrade-footprint.private.json'),JSON.stringify(after),{flag:'wx'});
  const key=r=>`${r.kind}|${r.key}`,next=new Map(after.objects.map(r=>[key(r),r])),old=new Set(before.objects.map(key));
  for(const row of before.objects)assert.deepEqual(next.get(key(row)),row,`Existing object changed: ${key(row)}`);
  const added=after.objects.filter(r=>!old.has(key(r)));for(const row of added)assert.ok(row.key.includes('vendor_store_team_'),key(row));
  const upgraded=JSON.parse(sql(snapshotSql));fs.writeFileSync(path.join(fixture,'upgraded.private.json'),JSON.stringify(upgraded),{flag:'wx'});
  cli(['db','reset','--local','--no-seed','--yes'],'full-403');guard();
  cli(['db','push','--local','--yes'],'push-noop');
  const replayed=JSON.parse(sql(snapshotSql));fs.writeFileSync(path.join(fixture,'replayed.private.json'),JSON.stringify(replayed),{flag:'wx'});
  assert.deepEqual(upgraded.LEDGER,replayed.LEDGER);const comparison=await compareSnapshots(upgraded,replayed,{output:path.join(fixture,'parity')});
  const report={at:new Date().toISOString(),status:'passed',...guard(),sourceHashes,retainedObjects:before.objects.length,addedObjects:added.length,comparison};
  fs.writeFileSync(path.join(audit,'replay.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',retainedObjects:before.objects.length,addedObjects:added.length,productionWrites:0}));
}
