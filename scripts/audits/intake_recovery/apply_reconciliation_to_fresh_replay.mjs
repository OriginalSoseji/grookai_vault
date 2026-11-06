// Apply the already-tested exact candidate only to the new successful replay.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {execFileSync,spawnSync} from 'node:child_process';
const root='C:/gv_intake_recovery_20261027',work='C:/gv_intake_recovery_private_20261027/full-replay-476-v5';
const project='intake-ready-replay-476-v5-20261027',container='supabase_db_'+project;
const audit='docs/audits/intake_recovery_20261027';
const candidate=JSON.parse(fs.readFileSync(audit+'/baseline-reconciliation-candidate.json'));
const tested=JSON.parse(fs.readFileSync(audit+'/baseline-reconciliation-tests.json'));
const replay=JSON.parse(fs.readFileSync(audit+'/historical-replay-v5.json'));
assert.equal(tested.pass,true);assert.equal(tested.sourceSha256,candidate.sha256);assert.equal(replay.cliResetSucceeded,true);
assert.equal(JSON.parse(fs.readFileSync(work+'/gateway-reset-result.json')).pass,true);
assert.equal(fs.existsSync(work+'/supabase/.temp/project-ref'),false);
const hash=value=>createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(root+'/'+candidate.path);assert.equal(hash(bytes),candidate.sha256);
const plan=JSON.parse(fs.readFileSync(work+'/freeze.json'));
for(const [name,digest] of Object.entries(plan.sources)){
  assert.equal(hash(fs.readFileSync(work+'/supabase/migrations/'+name)),digest);
  assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest);
}
const info=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=query=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',timeout:60000,maxBuffer:16_000_000}).trim();
assert.equal(sql("select (select count(*) from auth.users)::text||':'||(select count(*) from vault_item_instances)::text||':'||current_setting('max_worker_processes')"),'0:0:0');
const versions=()=>JSON.parse(sql('select json_agg(version order by version) from supabase_migrations.schema_migrations'));
assert.equal(versions().length,476);assert.equal(versions().at(-1),'20261023120000');
const dataSql=`select json_build_object(
 'cards',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from card_prints t),
 'sets',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from sets t),
 'aliases',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'[]'),'UTF8')),'hex') from card_print_identity_aliases t));`;
const before=JSON.parse(sql(dataSql));
assert.equal(fs.existsSync(work+'/'+candidate.path),false);
fs.writeFileSync(work+'/'+candidate.path,bytes,{flag:'wx'});
fs.writeFileSync(work+'/fresh-reconciliation-intent.json',JSON.stringify({at:new Date().toISOString(),before,sourceSha256:hash(bytes),onlyLocal:true,consumed:true},null,2),{flag:'wx'});
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|^PG(?:HOST|PORT|USER|PASSWORD|DATABASE|SSLMODE)$/.test(key))delete env[key];
for(const label of ['fresh-reconciliation-push','fresh-reconciliation-noop']){
  const fd=fs.openSync(work+'/'+label+'.log','wx');let result;
  try{result=spawnSync('supabase',['db','push','--local','--yes','--workdir',work,'--network-id',project],{cwd:work,env,windowsHide:true,stdio:['ignore',fd,fd],timeout:300000});}finally{fs.closeSync(fd);}
  assert.ifError(result.error);assert.equal(result.status,0,label+' failed');
}
const after=JSON.parse(sql(dataSql));assert.ok(isDeepStrictEqual(after,before),'Existing prerequisite data changed');
assert.equal(versions().length,477);assert.equal(versions().at(-1),'20261027230000');
const report={at:new Date().toISOString(),pass:true,sourceSha256:hash(bytes),realCliResetPassed:true,originalHistoryVersions:476,reconciledLocalVersions:477,localCliPushPassed:true,localNoopPushPassed:true,dataDigestsUnchanged:true,before,after,remoteWrites:0,productionReleaseQualified:false};
fs.writeFileSync(audit+'/fresh-reconciliation-proof.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({pass:true,realCliResetPassed:true,localVersions:477,dataUnchanged:true,remoteWrites:0}));
