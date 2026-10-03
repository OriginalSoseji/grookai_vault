// One-use local421 replay and retained-copy414-to-421 upgrade. Never targets remote.
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
const migration='20261001050000_jungle_edition_foundation_v1.sql';
const pending=["20261001050000_jungle_edition_foundation_v1.sql","20261001203000_jungle_edition_price_reader_integration_v1.sql","20261001211000_jungle_edition_current_artifact_date_v1.sql","20261001213000_jungle_edition_artifact_date_lineage_v1.sql","20261001220000_jungle_edition_scoped_lineage_validation_v1.sql","20261001223000_jungle_edition_resolved_readiness_v1.sql","20261001224000_jungle_edition_search_v5_integration_v1.sql"];
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.equal(mode,'full');
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const port=mode==='full'?65200:65500,project=`jungle-edition-${mode}-421-v22-20261001`,fixture=out+'/'+mode+'-421-v22';
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.248.13.0/24':'10.248.14.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync(process.execPath,[root+'scripts/schema/jungle_lab_sql_gateway_v1.mjs',project],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,421);
const baseline=JSON.parse(fs.readFileSync('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/jungle-search-baseline-414-latest.json'));
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
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===421||!pending.includes(n))));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===421||!pending.includes(n)).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  return state;
}

assert.ok(!fs.existsSync(fixture+'/reset-intent.json'));assert.ok(!fs.existsSync(fixture+'/finish-cli-intent.json'));
const frozen=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));assert.deepEqual(frozen.sourceHashes,sources);
assert.equal(frozen.project,project);assert.equal(frozen.configSha256,hash(fs.readFileSync(fixture+'/supabase/config.toml')));
assert.equal(frozen.scriptSha256,hash(fs.readFileSync(root+'scripts/schema/jungle_edition_lab_v22.mjs')));
assert.ok(fs.readFileSync(fixture+'/start.private.log','utf8').includes('Started supabase'));
assert.ok(fs.existsSync(fixture+'/cli-continuation-intent.json'));
save('finish-cli-intent.json',{at:new Date().toISOString(),consumed:true,project,reason:'CLI start completed; replace unsupported named-pipe interactive exec with pinned local PostgreSQL transport',sourceHashes:sources,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))});
const initial=guard(mode==='full'?421:414);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(mode==='full'?421:414);
if(mode==='full'){
  cli(['db','push','--local','--yes'],'push-noop');
  save('replayed.private.json',JSON.parse(sql(snapshotSql)));
  save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:421,project,productionWrites:0,retainedFixtureResets:0,state:guard(421)});
}else{
  const before=JSON.parse(sql(snapshotSql));save('baseline.private.json',before);
  const user=randomUUID(),card=randomUUID(),set=randomUUID(),gvId='GV-PK-UPGRADE-'+randomUUID();
  save('fixture-intent.json',{at:new Date().toISOString(),user,card,set,gvId,scope:'synthetic two-copy retention',consumed:true});
  sql(`begin;insert into auth.users(id,aud,role,email) values('${user}','authenticated','authenticated','${user}@native-upgrade.invalid');
    insert into public.sets(id,code,name,game) values('${set}','${set}','Jungle foundation upgrade fixture','pokemon');
    insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Jungle foundation upgrade card','1','${gvId}',(select id from games where code='pokemon'));
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'LP');
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'NM');commit;`);
  const retainedSql="select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(t order by id) from sets t))";
  const retained=JSON.parse(sql(retainedSql));save('before-upgrade.private.json',retained);
  guard(414,{empty:false});for(const name of pending)fs.copyFileSync(root+'supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
  save('upgrade-intent.json',{at:new Date().toISOString(),project,migration,sha256:sources[migration],consumed:true});
  cli(['db','push','--local','--include-all','--yes'],'upgrade');guard(421,{empty:false});
  assert.deepEqual(JSON.parse(sql(retainedSql)),retained);
  const after=JSON.parse(sql(snapshotSql));save('upgraded.private.json',after);
  const clean=JSON.parse(fs.readFileSync(out+'/full-421-v22/replayed.private.json'));assert.deepEqual(after.LEDGER,clean.LEDGER);
  const comparison=await compareSnapshots(after,clean,{output:fixture+'/parity'});
  save('upgrade-result.json',{status:'passed',at:new Date().toISOString(),migrations:421,project,retainedCopies:retained.copies.length,allFixtureRowsUnchanged:true,comparison,productionWrites:0,resetsAfterPopulation:0});
}
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:421}));
