import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PROJECT,SET_IDS,assertBestOfGameExecution,freezeBestOfGameExecution,readBestOfGameExecutionSchema,readBestOfGameExecutionState,classifyBestOfGameExecution,executeBestOfGamePrintingRepair} from '../../backend/catalog/best_of_game_printing_execution_v1.mjs';
import {assertBestOfGameDatabaseTarget,assertBestOfGameExecutionAuthority,assertBestOfGameRollbackReceipt} from '../../backend/catalog/best_of_game_printing_execution_guard_v1.mjs';
import {loadBestOfGameAuthority} from './best_of_game_printing_repair_prepare_v1.mjs';
import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const producerFiles=['scripts/audits/best_of_game_printing_execution_v1.mjs','backend/catalog/best_of_game_printing_execution_v1.mjs','backend/catalog/best_of_game_printing_execution_guard_v1.mjs',
 'backend/catalog/master_index_printing_execution_v1.mjs','backend/catalog/master_index_printing_execution_guard_v1.mjs','backend/catalog/master_index_printing_authority_v1.mjs',
 'backend/catalog/master_index_printing_repair_plan_v1.mjs','backend/catalog/printing_completeness_gate_v1.mjs','scripts/audits/me04_finish_truth_v1.mjs',
 'scripts/audits/best_of_game_printing_repair_prepare_v1.mjs','scripts/schema/audit_best_of_game_printing_baseline_v1.mjs','scripts/schema/best_of_game_printing_baseline_binding_v1.json',
 'scripts/migration_preflight_strict.ps1','docs/catalog/master_printing_authority_v1/bp/manifest.json','docs/catalog/master_printing_authority_v1/bp/review.json',
 'docs/catalog/master_printing_authority_v1/bp/checked_source_fields.json','docs/contracts/BEST_OF_GAME_PRINTING_EXECUTION_V1.md'];
export function bestOfGameExecutionCodeBinding(){
 const {manifest}=loadBestOfGameAuthority();
 const files=[...producerFiles,manifest.master_index_ref].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
 return {files,fingerprint:hash(files)};
}

export function assertBestOfGameBaselineReceipt(receipt,{mode,now=Date.now()}){
 assert.equal(receipt.version,'BEST_OF_GAME_PRINTING_BASELINE_V1');assert.equal(receipt.project,PROJECT);assert.equal(receipt.phase,'AuditLinkedSchema');
 assert.equal(receipt.pass,true);assert.equal(receipt.productionWrites,0);assert.equal(receipt.migrations,511);assert.equal(receipt.remainingSqlBytes,0);assert.equal(receipt.securityExact,true);assert.equal(receipt.allAppliedSourceBytesExact,true);
 const age=now-Date.parse(receipt.finishedAt);assert.ok(Number.isFinite(age)&&age>=0,'Invalid baseline time');
 if(mode!=='readback')assert.ok(age<3600000,'Fresh511 strict baseline required');
 assert.ok(receipt.sanity.cards>=40000&&receipt.sanity.sets>=150&&receipt.sanity.traits>=5000);
}

async function main(){
 if(process.argv.length===3&&process.argv[2]==='--print-code-binding'){console.log(JSON.stringify(bestOfGameExecutionCodeBinding()));return;}
 const args={};for(const token of process.argv.slice(2)){
  const m=/^--(mode|out-dir|env-file|deps-root|code-fingerprint|candidate|candidate-fingerprint|plan|plan-fingerprint|authority|rollback-receipt|baseline-dir|source-dir)=(.+)$/.exec(token);
  assert.ok(m&&!Object.hasOwn(args,m[1]),'Unknown or repeated argument');args[m[1]]=m[2];
 }
 assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode));
 for(const key of ['out-dir','env-file','deps-root','code-fingerprint','source-dir'])assert.ok(args[key],`Missing ${key}`);
 const out=path.resolve(args['out-dir']);fs.mkdirSync(out,{recursive:false});
 const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
 const bound=new Map();let client,plan,authority,rollbackReceipt,code,baselineGate;
 const json=file=>{const full=path.resolve(file),bytes=fs.readFileSync(full);bound.set(full,sha(bytes));return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));};
 try{
  code=bestOfGameExecutionCodeBinding();assert.equal(code.fingerprint,args['code-fingerprint'],'Wrong producer');
  const {manifest,artifacts}=loadBestOfGameAuthority();assertMasterPrintingAuthority(manifest,artifacts);
  const checked=JSON.parse(artifacts.get('pricedex-checklist'));
  for(const source of checked.sources){
   const filename=source.ref==='pricedex-checklist'?'web-checklists-v1.txt':'web-release-information-v1.txt';
   const full=path.join(path.resolve(args['source-dir']),filename),bytes=fs.readFileSync(full);assert.equal(sha(bytes),source.retrieval_sha256,'Preserved original retrieval changed');bound.set(full,sha(bytes));
  }
  let candidate;
  if(args.mode==='prepare'){
   for(const k of ['candidate','candidate-fingerprint','baseline-dir'])assert.ok(args[k],`Missing ${k}`);
   assert.ok(!args.plan&&!args.authority&&!args['rollback-receipt'],'Prepare is read-only');
   candidate=json(args.candidate);assert.equal(candidate.fingerprint,args['candidate-fingerprint']);const {fingerprint,...body}=candidate;assert.equal(hash(body),fingerprint);
   baselineGate={directory:path.resolve(args['baseline-dir']),files:[]};
   for(const name of ['qualification.json','catalog.private.json.gz','security.private.json.gz']){const full=path.join(baselineGate.directory,name);baselineGate.files.push({name,sha256:sha(fs.readFileSync(full))});}
  }else{
   assert.ok(args.plan&&args['plan-fingerprint']);plan=json(args.plan);assertBestOfGameExecution(plan,args['plan-fingerprint']);
   assert.deepEqual(plan.raw.payload.master_manifest,manifest);assert.deepEqual(plan.raw.payload.review,JSON.parse(artifacts.get(manifest.authority.review.ref)));
   assert.deepEqual(plan.raw.payload.source_artifact_bindings,manifest.authority.source_artifacts);baselineGate=plan.baseline_gate;
  }
  assert.ok(baselineGate?.directory&&baselineGate.files?.length===3,'Strict baseline bindings required');
  for(const entry of baselineGate.files){assert.ok(['qualification.json','catalog.private.json.gz','security.private.json.gz'].includes(entry.name));const full=path.join(baselineGate.directory,entry.name),bytes=fs.readFileSync(full);assert.equal(sha(bytes),entry.sha256);bound.set(full,entry.sha256);}
  const baseline=json(path.join(baselineGate.directory,'qualification.json'));assertBestOfGameBaselineReceipt(baseline,{mode:args.mode});
  if(['rollback','apply'].includes(args.mode)){
   assert.ok(args.authority,'Explicit exact founder approval required');authority=json(args.authority);assertBestOfGameExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
   if(args.mode==='apply'){assert.ok(args['rollback-receipt']);rollbackReceipt=json(args['rollback-receipt']);assertBestOfGameRollbackReceipt(rollbackReceipt,{plan,codeFingerprint:code.fingerprint});}
  }else assert.ok(!args.authority&&!args['rollback-receipt'],'Read-only modes do not consume authority');
  write('run_plan.json',{at:new Date().toISOString(),project_ref:PROJECT,mode:args.mode,code,manifest_fingerprint:manifest.fingerprint,plan_fingerprint:plan?.fingerprint??null,candidate_fingerprint:candidate?.fingerprint??plan.candidate_fingerprint,
   authority_fingerprint:authority?.fingerprint??null,expected:plan?.expected??candidate.expected_mutation_counts,input_hashes:[...bound].map(([file,sha256])=>({file:path.basename(file),sha256})),target:'canonical verified-TLS production',read_only:['prepare','preflight','readback'].includes(args.mode)});
  const revalidate=()=>{
   assert.deepEqual(bestOfGameExecutionCodeBinding(),code,'Producer changed');for(const [file,digest]of bound)assert.equal(sha(fs.readFileSync(file)),digest,'Frozen input changed');
   assertMasterPrintingAuthority(manifest,artifacts);assertBestOfGameBaselineReceipt(baseline,{mode:args.mode});
   if(authority)assertBestOfGameExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
   if(rollbackReceipt)assertBestOfGameRollbackReceipt(rollbackReceipt,{plan,codeFingerprint:code.fingerprint});
  };
  const require=createRequire(path.join(path.resolve(args['deps-root']),'package.json')),env=require('dotenv').parse(fs.readFileSync(args['env-file']));
  assert.equal(env.SUPABASE_URL,`https://${PROJECT}.supabase.co`);assert.equal(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim(),PROJECT);
  assert.match(fs.readFileSync(path.join(root,'supabase/config.toml'),'utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
  const url=assertBestOfGameDatabaseTarget(env.SUPABASE_DB_URL);
  const chain=execFileSync('openssl',['s_client','-starttls','postgres','-connect',`${url.hostname}:${url.port}`,'-servername',url.hostname,'-showcerts'],{input:'',encoding:'utf8',timeout:15000,stdio:['pipe','pipe','ignore']});
  const pems=chain.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);assert.equal(pems?.length,3);const certs=pems.map(p=>new crypto.X509Certificate(p));
  assert.equal(sha(certs[2].raw),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');assert.equal(sha(certs[1].raw),'303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea');
  assert.ok(certs[0].checkHost(url.hostname));for(const c of certs)assert.ok(Date.parse(c.validFrom)<Date.now()&&Date.parse(c.validTo)>Date.now());
  assert.ok(certs[0].verify(certs[1].publicKey)&&certs[1].verify(certs[2].publicKey)&&certs[2].verify(certs[2].publicKey));
  client=new(require('pg').Client)({connectionString:url.href,ssl:{ca:pems.slice(1),rejectUnauthorized:true,servername:url.hostname},application_name:'best-of-game-printing-execution-v1',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000,
   options:['prepare','preflight','readback'].includes(args.mode)?'-c default_transaction_read_only=on':undefined});
  await client.connect();assert.equal(client.connection.stream.authorized,true);
  const sanity=(await client.query('select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];
  assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Environment mismatch — fix before proceeding.');write('environment.json',{project_ref:PROJECT,sanity,tls_authorized:true,node:process.version});
  revalidate();
  if(args.mode==='prepare'){
   await client.query('begin isolation level repeatable read read only');await client.query("set local statement_timeout='45s'");
   const rows=async(sql,values)=>(await client.query(sql,values)).rows.map(r=>r.row);
   const family={sets:await rows('select to_jsonb(t) row from public.sets t where id=any($1::uuid[]) order by id',[SET_IDS]),parents:await rows('select to_jsonb(t) row from public.card_prints t where set_id=any($1::uuid[]) order by id',[SET_IDS])};
   family.children=await rows('select to_jsonb(t) row from public.card_printings t where card_print_id=any($1::uuid[]) order by id',[family.parents.map(p=>p.id)]);
   const schema=await readBestOfGameExecutionSchema(client),input={candidate,manifest,artifacts,family,schema,protectedFootprints:[]};
   plan=freezeBestOfGameExecution(input);const before=await readBestOfGameExecutionState(client,plan);assert.equal(classifyBestOfGameExecution(plan,before),'before');
   const frozen=freezeBestOfGameExecution({...input,protectedFootprints:before.footprints});const {fingerprint,...body}=frozen;const finalBody={...body,baseline_gate:baselineGate};plan={...finalBody,fingerprint:hash(finalBody)};
   assertBestOfGameExecution(plan,plan.fingerprint);revalidate();await client.query('rollback');write('execution_plan.private.json',plan);write('snapshot.private.json',before);
   const result={mode:'prepare',status:'prepared_not_authorized',project_ref:PROJECT,code,fingerprint:plan.fingerprint,database_writes:0,foreignKeys:schema.foreign_keys.length,protectedReferenceRelations:before.footprints.length,jsonColumnsInventoried:schema.json_columns.length,finished_at:new Date().toISOString()};write('result.json',result);console.log(JSON.stringify(result));
  }else{
   const result=await executeBestOfGamePrintingRepair({client,plan,expectedFingerprint:args['plan-fingerprint'],mode:args.mode,authority,codeFingerprint:code.fingerprint,rollbackReceipt,beforeFinalCommit:async proof=>{revalidate();write('precommit_readback.json',proof);}});
   write('result.json',{...result,code,finished_at:new Date().toISOString()});console.log(JSON.stringify(result));
  }
 }catch(error){
  await client?.query('rollback').catch(()=>{});write('failure.json',{at:new Date().toISOString(),error:error.message,sqlstate:error.code,commit_uncertain:error.commit_uncertain??false,rollback_uncertain:error.rollback_uncertain??false,action:'Stop; investigate changed state or independently read back uncertain outcomes. Never silently rebaseline or blindly retry.'});throw error;
 }finally{await client?.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
