// MAINTENANCE-ONLY EXECUTION BOUNDARY
// Launch only through run_identity_maintenance_v1.mjs with
// ENABLE_IDENTITY_MAINTENANCE_MODE=true and IDENTITY_MAINTENANCE_MODE=EXPLICIT.
// IDENTITY_MAINTENANCE_DRY_RUN defaults to true. Explicit write intent also
// requires the exact approved release context; prepare/readback remain read-only.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{fileURLToPath,pathToFileURL}from'node:url';import{gzipSync,gunzipSync}from'node:zlib';import{createHash}from'node:crypto';
import dotenv from 'dotenv';import pg from 'pg';
import{installIdentityMaintenanceBoundaryV1,assertMaintenanceWriteAllowed,getIdentityMaintenanceDryRunV1,IDENTITY_MAINTENANCE_TASK_ENV_V1}from'./identity_maintenance_boundary_v1.mjs';
import{PROJECT,readGameStopRegistrySchema,readGameStopRegistryState,freezeGameStopRegistryPlan,assertGameStopRegistryPlan,classifyGameStopRegistryState,executeGameStopRegistryMaintenanceTransaction}from'../catalog/gamestop_registry_fifteen_v1.mjs';
import{assertGameStopProductionClient,assertGameStopCommittedReceipt}from'../catalog/gamestop_registry_release_guard_v1.mjs';
import{marketPipelineDatabaseConfigV1}from'../pricing/market_pipeline_database_config_v1.mjs';import{marketSessionConnectionStringV1}from'../pricing/market_scheduler_session_v1.mjs';
import{gameStopRegistryCodeBindingV1}from'../catalog/gamestop_registry_code_binding_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),TASK='backend/identity/gamestop_registry_fifteen_repair_v1.mjs',sha=b=>createHash('sha256').update(b).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
export {gameStopRegistryCodeBindingV1};
async function main(){
 if(process.argv.length===3&&process.argv[2]==='--print-code-binding'){console.log(JSON.stringify(gameStopRegistryCodeBindingV1()));return;}
 installIdentityMaintenanceBoundaryV1(import.meta.url);assertMaintenanceWriteAllowed();assert.equal(process.env[IDENTITY_MAINTENANCE_TASK_ENV_V1],TASK,'Use the dedicated maintenance launcher');
 assert.equal(process.version,'v22.23.5','Qualified Node22 runtime required');
 const dryRun=getIdentityMaintenanceDryRunV1();assert.deepEqual(process.argv.slice(2),dryRun?[]:['--apply'],'Unknown maintenance arguments');
 assert.ok(process.env.GAMESTOP_REGISTRY_RELEASE_CONFIG,'Explicit operator configuration required');const configPath=path.resolve(process.env.GAMESTOP_REGISTRY_RELEASE_CONFIG),configBytes=fs.readFileSync(configPath),config=JSON.parse(configBytes);
 const allowed=['mode','outDir','plan','authority','rollbackReceipt','committedReceipt','codeFingerprint','runId','databaseEnvFile','caFile'];assert.ok(Object.keys(config).every(k=>allowed.includes(k)),'Unknown release configuration field');
 assert.ok(['prepare','rollback','apply','readback'].includes(config.mode));if(!dryRun)assert.ok(['rollback','apply'].includes(config.mode),'Apply flag is only for explicit write modes');
 const out=path.resolve(config.outDir),artifactRoot=path.resolve('C:/grookai_vault_operator_artifacts/all_stamped_reverse_holos_20261124'),relative=path.relative(artifactRoot,out);
 assert.ok(relative&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep),'Output must remain within the operator artifact root');
 assert.ok(!fs.existsSync(out),'Preserve existing attempt; do not retry into it');fs.mkdirSync(out,{recursive:true});
 const write=(name,v)=>fs.writeFileSync(path.join(out,name),JSON.stringify(v,null,2)+'\n',{flag:'wx'});let client,auditClient;
 try{
  const code=gameStopRegistryCodeBindingV1();assert.equal(code.fingerprint,config.codeFingerprint,'Exact producer binding required');
  const bound=new Map([[configPath,sha(configBytes)]]),read=file=>{const bytes=fs.readFileSync(file);bound.set(path.resolve(file),sha(bytes));return freeze(JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes));};
  const plan=config.plan?read(config.plan):null;if(plan)assertGameStopRegistryPlan(plan);
  if(config.mode!=='prepare')assert.ok(plan,'Prepared exact plan required');
  const authority=config.authority?read(config.authority):null,rollbackReceipt=config.rollbackReceipt?read(config.rollbackReceipt):null,committedReceipt=config.committedReceipt?read(config.committedReceipt):null;
  const revalidate=()=>{assert.deepEqual(gameStopRegistryCodeBindingV1(),code,'Producer changed');for(const [file,digest]of bound)assert.equal(sha(fs.readFileSync(file)),digest,'Frozen release input changed');};
  const owner=dotenv.parse(fs.readFileSync(config.databaseEnvFile));assert.equal(owner.SUPABASE_URL,'https://'+PROJECT+'.supabase.co');assert.match(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED,'0','Insecure TLS override refused');
  const make=readOnly=>new pg.Client({...marketPipelineDatabaseConfigV1(marketSessionConnectionStringV1(owner.SUPABASE_DB_URL),{SUPABASE_DB_CA_CERT:fs.readFileSync(config.caFile,'utf8')},{readOnly}),application_name:'gamestop_registry_fifteen_maintenance_v1',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000});
  console.log('REMOTE https://'+PROJECT+'.supabase.co — '+(dryRun?'server-enforced read-only qualification':'exact approved maintenance execution'));
  write('intent.json',{at:new Date().toISOString(),requestedMode:config.mode,dryRun,project_ref:PROJECT,runId:config.runId??null,code,planFingerprint:plan?.fingerprint??null,productionAuthorityAsserted:false});
  client=make(dryRun);await client.connect();assertGameStopProductionClient(client);const sanity=(await client.query('select(select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');write('environment.json',{project_ref:PROJECT,sanity,verifiedTls:true});revalidate();
  if(dryRun){
   await client.query('begin isolation level repeatable read read only');assert.equal((await client.query('show transaction_read_only')).rows[0].transaction_read_only,'on');const schema=await readGameStopRegistrySchema(client),state=await readGameStopRegistryState(client,schema);
   const current=plan?classifyGameStopRegistryState(plan,state):'before';if(config.mode==='readback'){assert.equal(current,'exact');assertGameStopCommittedReceipt(committedReceipt,{plan,codeFingerprint:code.fingerprint});assert.deepEqual(state.identities,committedReceipt.identityRows);}
   if(config.mode==='prepare'){const prepared=freezeGameStopRegistryPlan({schema,state,observedAt:new Date((await client.query('select clock_timestamp() at')).rows[0].at).toISOString()});fs.writeFileSync(path.join(out,'plan.private.json.gz'),gzipSync(Buffer.from(JSON.stringify(prepared))),{flag:'wx'});write('plan-summary.json',{fingerprint:prepared.fingerprint,identities:15,productionAuthority:false});}
   await client.query('rollback');write('result.json',{pass:true,dryRun:true,requestedMode:config.mode,currentState:current,productionWrites:0,codeFingerprint:code.fingerprint});return;
  }
  assert.ok(authority&&plan&&config.runId,'Exact release inputs required');auditClient=make(false);await auditClient.connect();assertGameStopProductionClient(auditClient);
  const result=await executeGameStopRegistryMaintenanceTransaction({client,auditClient,plan,mode:config.mode,release:{authority,codeFingerprint:code.fingerprint,runId:config.runId,rollbackReceipt,committedReceipt},revalidate});write('result.json',result);console.log(JSON.stringify({mode:result.mode,inserts:result.inserts,auditRows:result.auditRows,committed:result.committed,auditPersisted:result.auditPersisted}));
 }catch(error){write('failure.json',{at:new Date().toISOString(),code:error.code,message:error.message,commitUncertain:error.commitUncertain??false,rollbackUncertain:error.rollbackUncertain??false,auditCommitUncertain:error.auditCommitUncertain??false,audit:error.audit??null,auditPersistenceFailure:error.auditPersistenceFailure??null,automaticRetry:false});process.exitCode=1;console.error(error.message);}
 finally{await Promise.allSettled([client?.end(),auditClient?.end()]);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
