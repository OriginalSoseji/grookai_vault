import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {PROJECT,freezePrintingExecution,assertPrintingExecution,readExecutionSchema,readPrintingExecutionState,classifyPrintingExecution,executePrintingRepair} from '../../backend/catalog/master_index_printing_execution_v1.mjs';
import {assertPrintingDatabaseTarget,assertPrintingExecutionAuthority,assertPrintingRollbackReceipt} from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';
import {assertMasterPrintingAuthority} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)),args={};
for(const arg of process.argv.slice(2)) {
 const m=arg.match(/^--(mode|out-dir|env-file|deps-root|code-fingerprint|manifest|artifact-map|candidate|candidate-fingerprint|plan|plan-fingerprint|authority|rollback-receipt)=(.+)$/);
 assert.ok(m&&!Object.hasOwn(args,m[1]),'Unknown/duplicate argument');args[m[1]]=m[2];
}
assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode));
for(const key of ['out-dir','env-file','deps-root','code-fingerprint','manifest','artifact-map'])assert.ok(args[key],`Missing ${key}`);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const files=['scripts/audits/master_index_printing_execution_v1.mjs','backend/catalog/master_index_printing_execution_v1.mjs',
 'backend/catalog/master_index_printing_execution_guard_v1.mjs','backend/catalog/master_index_printing_repair_plan_v1.mjs',
 'backend/catalog/master_index_printing_authority_v1.mjs','backend/catalog/printing_completeness_gate_v1.mjs','scripts/audits/me04_finish_truth_v1.mjs'];
async function codeBinding(){const records=[];for(const file of files)records.push({file,sha256:digest(await fs.readFile(path.join(root,file)))});return {files:records,fingerprint:hash(records)};}
const code=await codeBinding();assert.equal(code.fingerprint,args['code-fingerprint'],'Wrong producer');
const boundFiles=new Map();
const boundJson=async file=>{const bytes=await fs.readFile(file);boundFiles.set(path.resolve(file),digest(bytes));return JSON.parse(bytes);};
const manifest=await boundJson(args.manifest),map=await boundJson(args['artifact-map']),artifacts=new Map();
for(const entry of map) {
 assert.ok(!artifacts.has(entry.ref),'Duplicate source reference');
 const file=path.resolve(path.dirname(args['artifact-map']),entry.path),bytes=await fs.readFile(file);
 artifacts.set(entry.ref,bytes);boundFiles.set(file,digest(bytes));
}
assertMasterPrintingAuthority(manifest,artifacts);
let plan,candidate,authority;
if(args.mode==='prepare') {
 assert.ok(args.candidate&&args['candidate-fingerprint']);candidate=await boundJson(args.candidate);
 assert.equal(candidate.fingerprint,args['candidate-fingerprint']);
 const {fingerprint,...body}=candidate;assert.equal(hash(body),fingerprint);
} else {
 assert.ok(args.plan&&args['plan-fingerprint']);plan=await boundJson(args.plan);
 assertPrintingExecution(plan,args['plan-fingerprint']);assert.deepEqual(plan.raw.payload.master_manifest,manifest);
}
if(['rollback','apply'].includes(args.mode)) {
 assert.ok(args.authority,'Explicit bounded authority file required');authority=await boundJson(args.authority);
 assertPrintingExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
 if(args.mode==='apply') {
  assert.ok(args['rollback-receipt'],'Fresh rollback receipt required');
  assertPrintingRollbackReceipt(await boundJson(args['rollback-receipt']),{plan,codeFingerprint:code.fingerprint});
 }
}
const out=path.resolve(args['out-dir']);await fs.mkdir(out,{recursive:false});
const write=(file,value)=>fs.writeFile(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await write('run_plan.json',{at:new Date().toISOString(),project_ref:PROJECT,mode:args.mode,code,
 manifest_fingerprint:manifest.fingerprint,plan_fingerprint:plan?.fingerprint??null,candidate_fingerprint:candidate?.fingerprint??plan?.candidate_fingerprint,
 authority_fingerprint:authority?.fingerprint??null,expected:plan?.expected??candidate?.expected_mutation_counts,
 boundaries:plan?.boundaries??{database_writes:0},input_hashes:[...boundFiles].map(([file,sha256])=>({file:path.basename(file),sha256}))});
const require=createRequire(path.join(path.resolve(args['deps-root']),'package.json'));
let client;
async function revalidateInputs() {
 assert.deepEqual(await codeBinding(),code,'Producer changed');
 for(const [file,sha] of boundFiles)assert.equal(digest(await fs.readFile(file)),sha,'Frozen input changed');
 if(authority)assertPrintingExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
}
try {
 const env=require('dotenv').parse(await fs.readFile(args['env-file'])),url=assertPrintingDatabaseTarget(env.SUPABASE_DB_URL);
 // Inspect without credentials, verify pinned CA chain, then authenticate over verified TLS.
 const chainText=execFileSync('openssl',['s_client','-starttls','postgres','-connect',`${url.hostname}:${url.port}`,'-servername',url.hostname,'-showcerts'],{input:'',encoding:'utf8',timeout:15000,stdio:['pipe','pipe','ignore']});
 const pems=chainText.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);assert.equal(pems?.length,3);
 const certs=pems.map(p=>new crypto.X509Certificate(p));
 assert.equal(digest(certs[2].raw),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');
 assert.equal(digest(certs[1].raw),'303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea');
 assert.ok(certs[0].checkHost(url.hostname));
 for(const c of certs)assert.ok(Date.parse(c.validFrom)<Date.now()&&Date.parse(c.validTo)>Date.now());
 assert.ok(certs[0].verify(certs[1].publicKey)&&certs[1].verify(certs[2].publicKey)&&certs[2].verify(certs[2].publicKey));
 client=new (require('pg').Client)({connectionString:url.href,ssl:{ca:pems.slice(1),rejectUnauthorized:true,servername:url.hostname},
  application_name:'grookai_master_printing_execution_v1',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000,
  options:['prepare','preflight','readback'].includes(args.mode)?'-c default_transaction_read_only=on':undefined});
 await client.connect();assert.equal(client.connection.stream.authorized,true);
 const sanity=(await client.query('select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];
 assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Canonical environment sanity failed');
 await write('environment.json',{project_ref:PROJECT,sanity,tls_authorized:true,node:process.version});
 await revalidateInputs();
 if(args.mode==='prepare') {
  await client.query('begin isolation level repeatable read read only');
  await client.query("set local statement_timeout='45s'");
  const parents=(await client.query('select to_jsonb(p) row from public.card_prints p where set_id=$1 order by id',[manifest.authority.set_id])).rows.map(r=>r.row);
  const schema=await readExecutionSchema(client);
  plan=freezePrintingExecution({candidate,manifest,artifacts,parents,schema,protectedFootprints:[]});
  const state=await readPrintingExecutionState(client,plan);assert.equal(classifyPrintingExecution(plan,state),'before');
  plan=freezePrintingExecution({candidate,manifest,artifacts,parents,schema,protectedFootprints:state.footprints});
  await revalidateInputs();await client.query('rollback');
  await write('execution_plan.json',plan);await write('snapshot.json',state);
  await write('result.json',{mode:'prepare',code,fingerprint:plan.fingerprint,status:'prepared_not_authorized',database_writes:0,finished_at:new Date().toISOString()});
  console.log(JSON.stringify({status:'prepared_not_authorized',fingerprint:plan.fingerprint,database_writes:0}));
 } else {
  const result=await executePrintingRepair({client,plan,expectedFingerprint:args['plan-fingerprint'],mode:args.mode,
   beforeCommit:async proof=>{await revalidateInputs();await write('precommit_readback.json',proof);}});
  await write('result.json',{...result,project_ref:PROJECT,code,finished_at:new Date().toISOString()});console.log(JSON.stringify(result));
 }
} catch(error) {
 await client?.query('rollback').catch(()=>{});
 await write('failure.json',{at:new Date().toISOString(),error:error.message,sqlstate:error.code,commit_uncertain:error.commit_uncertain??false,rollback_uncertain:error.rollback_uncertain??false,action:'Stop; independently read back uncertain outcomes. Do not automatically retry.'});
 console.error(error.message);process.exitCode=1;
} finally {await client?.end().catch(()=>{});}
