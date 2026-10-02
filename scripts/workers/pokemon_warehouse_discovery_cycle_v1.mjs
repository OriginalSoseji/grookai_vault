import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {pokemonCoverageDatabaseTarget} from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
import {assertIntakePlan} from '../../backend/catalog/pokemon_warehouse_discovery_intake_v1.mjs';
import {CYCLE_VERSION,sha256,verifyRuntimeRelease,authorizeRecurringPlan,persistCycleRun,compressCompletedCoverage,claimCycleMarker,completeCycleMarker} from '../../backend/catalog/pokemon_warehouse_discovery_runtime_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),args=new Map();
for(const arg of process.argv.slice(2)){const m=arg.match(/^--(policy|state-dir|ca-file)=(.+)$/);assert.ok(m&&!args.has(m[1]));args.set(m[1],m[2]);}
for(const key of ['policy','state-dir','ca-file'])assert.ok(args.get(key),`missing_${key}`);
const policyBytes=fs.readFileSync(args.get('policy')),policy=JSON.parse(policyBytes),producer=policy.producer_commit;
const manifestFile=path.join(root,'release-manifest.json'),manifestBytes=fs.readFileSync(manifestFile),manifest=JSON.parse(manifestBytes);
const state=fs.realpathSync(args.get('state-dir')),runId=randomUUID(),runDir=path.join(state,'runs',runId);
fs.mkdirSync(runDir,{mode:0o700});const save=(name,value)=>fs.writeFileSync(path.join(runDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const run={version:CYCLE_VERSION,run_id:runId,producer_commit:producer,policy_sha256:sha256(policyBytes),started_at:new Date().toISOString(),artifact_dir:runDir};
let jobId=null,db,locked=false,stage='connection';
const inflight=path.join(state,'inflight.json');let ownsInflight=false;
try{
 assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
 const ca=fs.readFileSync(args.get('ca-file'),'utf8');
 const target=pokemonCoverageDatabaseTarget(process.env.SUPABASE_DB_URL);target.port='5432'; // Session locks require a session connection, never transaction pooling.
 db=new pg.Client({connectionString:target.toString(),ssl:{rejectUnauthorized:true,ca},connectionTimeoutMillis:15000,application_name:'pokemon_discovery_cycle_v1',options:'-c default_transaction_read_only=on'});await db.connect();
 locked=(await db.query("select pg_try_advisory_lock(hashtext('pokemon_discovery_cycle_v1')) locked")).rows[0].locked;assert.equal(locked,true,'recurring_intake_already_running');
 stage='interrupted_run_guard';claimCycleMarker(state,run);ownsInflight=true;
 await db.query('begin read write');jobId=await persistCycleRun(db,{status:'running',payload:{...run,stage}});await db.query('commit');save('start.json',{...run,job_id:jobId});
 stage='release_verification';verifyRuntimeRelease(root,manifest,producer);assert.equal(sha256(manifestBytes),policy.release_manifest_sha256);
 // Validate standing scope before spawning even a read-only planner.
 authorizeRecurringPlan(policy,{entries:[],canonical_writes:0,pricing_writes:0,warehouse_promotion_writes:0},{producer,manifestSha:sha256(manifestBytes)});
 const childEnv={...process.env,SUPABASE_DB_CA_CERT:ca,DOTENV_CONFIG_PATH:path.join(root,'no-local-env')};
 function invoke(mode,extra=[]){
  const log=fs.openSync(path.join(runDir,`${mode}.log`),'wx',0o600);
  try{execFileSync(process.execPath,[path.join(root,'scripts/workers/pokemon_warehouse_discovery_intake_v1.mjs'),`--mode=${mode}`,`--out-dir=${path.join(runDir,mode)}`,...extra],{cwd:root,env:childEnv,stdio:['ignore',log,log],timeout:15*60*1000});}finally{fs.closeSync(log);}
 }
 stage='plan';invoke('plan');const planPath=path.join(runDir,'plan','plan.json'),plan=assertIntakePlan(JSON.parse(fs.readFileSync(planPath,'utf8')));
 stage='authorization';const authorization=authorizeRecurringPlan(policy,plan,{producer,manifestSha:sha256(manifestBytes)});save('authorization.json',authorization);
 stage='apply';invoke('apply',[`--plan=${planPath}`,`--authorization=${path.join(runDir,'authorization.json')}`,`--producer-commit=${producer}`,`--release-manifest=${manifestFile}`]);
 const result=JSON.parse(fs.readFileSync(path.join(runDir,'apply','complete.json'),'utf8'));assert.equal(result.status,'passed');assert.equal(result.plan_fingerprint,plan.fingerprint);assert.equal(result.verified,plan.entries.length);
 const concurrentCatalogChanges=['cards','sets','traits','printings'].filter(key=>result.before[key]!==result.after[key]).map(key=>({key,before:result.before[key],after:result.after[key]}));
 stage='archive';const archive=compressCompletedCoverage(runDir);
 const completed={...run,stage:'complete',finished_at:new Date().toISOString(),job_id:jobId,intake_job_id:result.job_id,plan_fingerprint:plan.fingerprint,eligible:plan.entries.length,held:plan.held.length,inserted:result.inserted,verified:result.verified,coverage:result.coverage,archive,concurrent_catalog_count_changes:concurrentCatalogChanges,canonical_writes:0,pricing_writes:0};
 await db.query('begin read write');await persistCycleRun(db,{jobId,status:'succeeded',payload:completed});await db.query('commit');save('complete.json',{status:'passed',...completed});
 const pointer=path.join(state,`last-run-${runId}.tmp`);fs.writeFileSync(pointer,JSON.stringify({status:'passed',...completed},null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(pointer,path.join(state,'last-run.json'));
 completeCycleMarker(inflight,runId);ownsInflight=false;
 console.log(JSON.stringify({status:'passed',run_id:runId,job_id:jobId,intake_job_id:result.job_id,inserted:result.inserted,verified:result.verified,held:plan.held.length,unresolved:result.coverage.unresolved_count}));
}catch(error){
 const failure={...run,stage,job_id:jobId,interrupted_guard_retained:ownsInflight||fs.existsSync(inflight),finished_at:new Date().toISOString(),error_code:error.code??'DISCOVERY_CYCLE_STOPPED',error_detail:String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted database URL]'),recovery:'Inspect child pending/commit receipts and independent readback before any retry; no automatic replay. Clear only the exact reconciled inflight marker.'};
 if(db){try{await db.query('rollback');await db.query('begin read write');jobId=await persistCycleRun(db,{jobId,status:'failed',payload:failure});await db.query('commit');failure.job_id=jobId;}catch(e){failure.failure_persistence_error=String(e.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted database URL]');}}
 save('failure.json',failure);
 if(ownsInflight||!fs.existsSync(inflight)){const pointer=path.join(state,`failed-${runId}.tmp`);fs.writeFileSync(pointer,JSON.stringify({status:'failed',...failure},null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(pointer,path.join(state,'last-run.json'));}
 console.error(JSON.stringify({status:'failed',run_id:runId,stage,job_id:jobId,error_code:failure.error_code}));process.exitCode=1;
}finally{if(db){if(locked)await db.query("select pg_advisory_unlock(hashtext('pokemon_discovery_cycle_v1'))").catch(()=>{});await db.end();}}
