// Resume only a reset that never reached CLI invocation (monitor startup timed out).
// Existing consumed attempts and populated labs are never reset by this command.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const work='C:/gv_intake_recovery_private_20261027/full-replay-476-v5',root='C:/gv_intake_recovery_20261027';
const project='intake-ready-replay-476-v5-20261027',container='supabase_db_'+project;
const plan=JSON.parse(fs.readFileSync(work+'/freeze.json'));
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(fs.existsSync(work+'/reset-prefix.log'),false,'A reset already ran; do not repeat it');
assert.equal(fs.existsSync(work+'/reset-command-start-intent.json'),false);
assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false);
assert.equal(hash(fs.readFileSync(work+'/supabase/config.toml')),plan.configSha256);
const actual=Object.fromEntries(fs.readdirSync(work+'/supabase/migrations').filter(n=>/^\d+.*\.sql$/.test(n)).sort().map(n=>[n,hash(fs.readFileSync(work+'/supabase/migrations/'+n))]));assert.deepEqual(actual,plan.sources);
for(const [name,digest] of Object.entries(plan.sources))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest);
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=query=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:15000}).trim();
const state=()=>JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'workers',current_setting('max_worker_processes'),'ledger',(select json_agg(version order by version) from supabase_migrations.schema_migrations))"));
const before=state();assert.equal(before.users,0);assert.equal(before.cards,0);assert.equal(before.copies,0);assert.equal(before.workers,'0');
assert.deepEqual(before.ledger,Object.keys(plan.sources).map(n=>n.match(/^\d+/)[0]).filter(n=>n<=plan.cutoff).sort());
const descriptor=fs.openSync(work+'/gateway-monitor-retry.log','wx');
const monitor=spawn(process.execPath,[fileURLToPath(new URL('./restart_owned_gateway_after_storage.mjs',import.meta.url)),project],{windowsHide:true,stdio:['ignore',descriptor,descriptor]});fs.closeSync(descriptor);
for(let n=0;n<1000&&!fs.existsSync(work+'/gateway-monitor-ready.json');n++){
  assert.equal(monitor.exitCode,null,'Gateway monitor exited before readiness');await new Promise(resolve=>setTimeout(resolve,50));
}
assert.ok(fs.existsSync(work+'/gateway-monitor-ready.json'),'Gateway monitor failed to initialize');
fs.writeFileSync(work+'/reset-command-start-intent.json',JSON.stringify({at:new Date().toISOString(),firstActualResetInvocation:true,earlierFailure:'monitor_startup_before_cli',before,consumed:true},null,2),{flag:'wx'});
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const log=fs.openSync(work+'/reset-prefix.log','wx');let result;
try{result=spawnSync('supabase',['db','reset','--local','--version',plan.cutoff,'--no-seed','--yes','--workdir',work,'--network-id',project],{cwd:work,env,windowsHide:true,stdio:['ignore',log,log],timeout:600000});}finally{fs.closeSync(log);}
assert.ifError(result.error);assert.equal(result.status,0,'Real reset failed; retain the failed receipt');
assert.equal(JSON.parse(fs.readFileSync(work+'/gateway-reset-result.json')).pass,true);
const after=state();assert.deepEqual(after,before,'Prefix reset did not restore exact empty baseline');
fs.writeFileSync(work+'/reset-prefix-result.json',JSON.stringify({cliResetExitPass:true,gatewayRecoveryPassed:true,state:after},null,2),{flag:'wx'});
console.log(JSON.stringify({pass:true,realCliResetPassed:true,remoteWrites:0,emptyOwnedLab:true}));
