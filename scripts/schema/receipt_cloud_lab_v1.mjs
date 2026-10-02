// One-use local415 receipt-cloud replay and retained-copy414 upgrade. Local proof only; never remote.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const out='C:/grookai_vault_operator_artifacts/vendor_receipt_cloud_20261002';
const migration='20261002220000_vendor_receipt_cloud_v1.sql';
const hash=b=>createHash('sha256').update(b).digest('hex');
const hashes=dir=>Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(path.join(dir,n)))]));
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
assert.equal(process.argv.length,3);
const mode=process.argv[2];assert.ok(['full','upgrade'].includes(mode));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_vendor_receipt_cloud_20261002');
const port=mode==='full'?64700:64720,project=`receipt-cloud-${mode}-415-v3-20261002`,fixture=out+'/'+mode+'-415-v3';
const relay=project+'-relay',container='supabase_db_'+project,subnet=mode==='full'?'10.250.246.0/24':'10.250.247.0/24';
const save=(name,value)=>fs.writeFileSync(fixture+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024}).trim();
const sources=hashes(root+'supabase/migrations');assert.equal(Object.keys(sources).length,415);
const baseline={output:'source-only baseline8dffbf8a; production comparison still required'};
const baseFiles=execFileSync('git',['ls-tree','-r','--name-only','8dffbf8ae0cca55c03dd37b93d4c083314888103','--','supabase/migrations'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(n=>/^supabase\/migrations\/[^/]+\.sql$/.test(n));
assert.equal(baseFiles.length,414);
for(const file of baseFiles)assert.equal(hash(fs.readFileSync(root+file)),hash(execFileSync('git',['show','8dffbf8ae0cca55c03dd37b93d4c083314888103:'+file],{cwd:root,maxBuffer:16*1024*1024})));
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
  assert.deepEqual(hashes(fixture+'/supabase/migrations'),Object.fromEntries(Object.entries(sources).filter(([n])=>count===415||n!==migration)));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
  assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
  for(const bindings of Object.values(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports))for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version').split(/\r?\n/),Object.keys(sources).filter(n=>count===415||n!==migration).map(n=>n.split('_')[0]).sort());
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from card_prints),'copies',(select count(*) from vault_item_instances),'stores',(select count(*) from vendor_stores),'runs',(select count(*) from cron.job_run_details),'workers',current_setting('max_worker_processes'))"));
  assert.equal(state.workers,'0');assert.equal(state.runs,0);assert.equal(state.stores,0);
  if(empty){assert.equal(state.users,0);assert.equal(state.cards,0);assert.equal(state.copies,0);}
  assert.equal(sql('select app_enabled::text||web_enabled::text||custom_enabled::text from vendor_store_rollout'),'falsefalsefalse');
  assert.equal(sql('select enabled::text from vendor_store_team_control'),'false');
  if(count===415)assert.equal(sql('select enabled::text from vendor_receipt_cloud_control'),'false');
  return state;
}

assert.ok(!fs.existsSync(fixture),'Never reuse a prior preparation/reset intent');
assert.equal(docker('ps','-a','--filter','name='+project,'--format','{{.Names}}'),'');
assert.equal(docker('volume','ls','--filter','name='+project,'--format','{{.Name}}'),'');
for(const p of [port,port+1,port+4,port+8])await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(p,'127.0.0.1',()=>server.close(resolve));});
for(const n of JSON.parse(docker('network','inspect',...docker('network','ls','-q').split(/\s+/))))for(const ip of n.IPAM.Config??[])assert.notEqual(ip.Subnet,subnet);
fs.mkdirSync(fixture+'/supabase/migrations',{recursive:true});fs.mkdirSync(fixture+'/supabase/.temp');
let config=fs.readFileSync('C:/grookai_vault_operator_artifacts/audit_vault_write_pause_20260927/replay-411/supabase/config.toml','utf8').replaceAll('audit-vault-pause-411-20260927',project).replace(/5704([0-9])/g,(_,n)=>String(port+Number(n)));
fs.writeFileSync(fixture+'/supabase/config.toml',config,{flag:'wx'});
fs.writeFileSync(fixture+'/supabase/.temp/postgres-version','17.6.1.113',{flag:'wx'});
for(const name of Object.keys(sources))if(mode==='full'||name!==migration)fs.copyFileSync(root+'supabase/migrations/'+name,fixture+'/supabase/migrations/'+name,fs.constants.COPYFILE_EXCL);
save('freeze.json',{at:new Date().toISOString(),project,fixture,mode,sourceHashes:sources,configSha256:hash(config),baselineReceipt:baseline.output,scriptSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url)))});
const relayCode=`import net from 'node:net';for(const [port,service,targetPort] of ${JSON.stringify([[port,'db',5432],[port+1,'kong',8000],[port+4,'inbucket',8025]])}){net.createServer(source=>{const target=net.connect(targetPort,'supabase_'+service+'_${project}');source.on('error',()=>target.destroy());target.on('error',()=>source.destroy());source.on('close',()=>target.destroy());target.on('close',()=>source.destroy());source.pipe(target).pipe(source)}).listen(port,'0.0.0.0')}`;
fs.writeFileSync(fixture+'/relay.mjs',relayCode,{flag:'wx'});
save('start-intent.json',{at:new Date().toISOString(),project,subnet,ports:[port,port+1,port+4],consumed:true});
docker('network','create','--internal','--subnet',subnet,project);
docker('create','--name',relay,'--network','bridge',...([port,port+1,port+4].flatMap(p=>['-p',`127.0.0.1:${p}:${p}`])),'node:22-bookworm-slim','node','/relay.mjs');
docker('cp',fixture+'/relay.mjs',relay+':/relay.mjs');docker('network','connect',project,relay);docker('start',relay);
cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],'start');
const initial=guard(mode==='full'?415:414);save('before-reset.json',initial);
save('reset-intent.json',{at:new Date().toISOString(),project,sourceHashes:sources,initial,consumed:true});
cli(['db','reset','--local','--no-seed','--yes'],'full-reset');guard(mode==='full'?415:414);
if(mode==='full'){
  cli(['db','push','--local','--yes'],'push-noop');
  save('replayed.private.json',JSON.parse(sql(snapshotSql)));
  save('replay-result.json',{status:'passed',at:new Date().toISOString(),fullReplay:true,noOpPush:true,migrations:415,project,productionWrites:0,retainedFixtureResets:0,state:guard(415)});
}else{
  const before=JSON.parse(sql(snapshotSql));save('baseline.private.json',before);
  const user=randomUUID(),card=randomUUID(),set=randomUUID(),gvId='GV-PK-UPGRADE-'+randomUUID();
  save('fixture-intent.json',{at:new Date().toISOString(),user,card,set,gvId,scope:'synthetic two-copy retention',consumed:true});
  sql(`begin;insert into auth.users(id,aud,role,email) values('${user}','authenticated','authenticated','${user}@native-upgrade.invalid');
    insert into public.sets(id,code,name,game) values('${set}','${set}','Search upgrade fixture','pokemon');
    insert into public.card_prints(id,set_id,name,number,gv_id,game_id) values('${card}','${set}','Search upgrade card','1','${gvId}',(select id from games where code='pokemon'));
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'LP');
    select public.admin_vault_instance_create_v1(p_user_id=>'${user}'::uuid,p_card_print_id=>'${card}'::uuid,p_condition_label=>'NM');commit;`);
  const retainedSql="select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(to_jsonb(t)-'search_code_lower' order by id) from sets t))";
  const retained=JSON.parse(sql(retainedSql));save('before-upgrade.private.json',retained);
  guard(414,{empty:false});fs.copyFileSync(root+'supabase/migrations/'+migration,fixture+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
  save('upgrade-intent.json',{at:new Date().toISOString(),project,migration,sha256:sources[migration],consumed:true});
  cli(['db','push','--local','--include-all','--yes'],'upgrade');guard(415,{empty:false});
  assert.deepEqual(JSON.parse(sql(retainedSql)),retained);assert.equal(sql("select count(*) from sets where search_code_lower is distinct from lower(code)"),'0');
  const after=JSON.parse(sql(snapshotSql));save('upgraded.private.json',after);
  const clean=JSON.parse(fs.readFileSync(out+'/full-415-v3/replayed.private.json'));assert.deepEqual(after.LEDGER,clean.LEDGER);
  const comparison=await compareSnapshots(after,clean,{output:fixture+'/parity'});
  save('upgrade-result.json',{status:'passed',at:new Date().toISOString(),migrations:415,project,retainedCopies:retained.copies.length,allFixtureRowsUnchanged:true,comparison,productionWrites:0,resetsAfterPopulation:0});
}
console.log(JSON.stringify({status:'passed',mode,project,fixture,migrations:415}));
