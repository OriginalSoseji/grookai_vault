// One-use fresh local422 CLI replay; V30 fresh full-source durable rehearsal. Never targets remote or resets retained labs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const migration='20261002010000_jungle_slab_atomic_intake_v1.sql';
const pending=["20261001050000_jungle_edition_foundation_v1.sql","20261001203000_jungle_edition_price_reader_integration_v1.sql","20261001211000_jungle_edition_current_artifact_date_v1.sql","20261001213000_jungle_edition_artifact_date_lineage_v1.sql","20261001220000_jungle_edition_scoped_lineage_validation_v1.sql","20261001223000_jungle_edition_resolved_readiness_v1.sql","20261001224000_jungle_edition_search_v5_integration_v1.sql","20261002010000_jungle_slab_atomic_intake_v1.sql"];
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.equal(mode,'full');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const port=mode==='full'?53400:53420,project=`jungle-edition-${mode}-422-v30-20261001`,fixture=out+'/'+mode+'-422-v30';
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.248.21.0/24':'10.248.22.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,422);
const baseline=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/jungle-slab-baseline-414-latest.json'));
assert.equal(baseline.status,'passed');assert.equal(baseline.migrations,414);assert.equal(baseline.productionWrites,0);
assert.ok(Date.now()-Date.parse(baseline.at)<6*3600000,'Fresh baseline required');
for(const [n,h]of Object.entries(baseline.sourceHashes))assert.equal(sources[n],h);
assert.ok(sources[migration]);
const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
function cli(args,label){
  const fd=fs.openSync(fixture+'/'+label+'.private.log','wx');let r;
  try{r=spawnSync('supabase',[...args,'--workdir',fixture,'--network-id',project],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true,timeout:600000});}finally{fs.closeSync(fd);}
  assert.ifError(r.error);assert.equal(r.status,0,`${label} failed. Preserve this fixture and consumed intent.`);
}
function guard(count,{empty=true}={}){
  const plan=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
  assert.equal(plan.project,project);assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),plan.configSha256);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===422||!pending.includes(n))));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===422||!pending.includes(n)).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  return state;
}



// Resume after the already consumed reset; never replay it.
assert.ok(fs.existsSync(fixture+'/reset-intent.json'));assert.ok(!fs.existsSync(fixture+'/replay-result.json'));
const frozen=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));assert.deepEqual(frozen.sourceHashes,sources);assert.equal(frozen.scriptSha256,hash(fs.readFileSync(root+'scripts/schema/jungle_edition_lab_v30.mjs')));
const resetLog=fs.readFileSync(fixture+'/full-reset.private.log','utf8');assert.ok(resetLog.includes('Applying migration 20261002010000_jungle_slab_atomic_intake_v1.sql'));assert.ok(resetLog.includes('Restarting containers...'));assert.ok(resetLog.includes('Error status 502'));
const state=guard(422),current=JSON.parse(sql(snapshotSql));
const qualified=JSON.parse(fs.readFileSync(out+'/full-422-v25/replayed.private.json'));assert.deepEqual(current.LEDGER,qualified.LEDGER);
assert.deepEqual(JSON.parse(fs.readFileSync(out+'/full-422-v25/freeze.json')).sourceHashes,sources);
const comparison=await compareSnapshots(current,qualified,{output:fixture+'/qualified-422-parity'});
save('completion-intent.json',{at:new Date().toISOString(),project,consumed:true,priorCliResetStatus:'failed_post_restart_502',reason:'All422 applied; exact independent schema/ledger comparison and empty-state guard passed; no reset replay',comparison,sourceHashes:sources,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))});
cli(['db','push','--local','--yes'],'push-noop');guard(422);
save('replayed.private.json',JSON.parse(sql(snapshotSql)));
save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:422,project,productionWrites:0,retainedFixtureResets:0,priorCliResetStatus:'failed_post_restart_502',qualifiedByIndependentSchemaComparison:true,comparison,state:guard(422)});
console.log(JSON.stringify({status:'passed',project,migrations:422,comparison}));
