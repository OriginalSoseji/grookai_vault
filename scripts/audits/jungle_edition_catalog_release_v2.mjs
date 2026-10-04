// Production entry point: default/read modes cannot write; exact authority gates write modes.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {freezeJungleRelease,assertJungleReleasePlan,executeJungleRelease} from '../../backend/catalog/jungle_edition_catalog_release_v2.mjs';
import {assertJungleReleaseDatabaseTarget,assertJungleReleaseExecutionAuthority,assertJungleReleaseRollbackReceipt} from '../../backend/catalog/jungle_edition_catalog_release_guard_v2.mjs';
import {assertJungleExecutionRefreshV1} from '../../backend/catalog/jungle_edition_execution_refresh_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
const PROJECT='ycdxbpibncqcchqiihfz',root=fileURLToPath(new URL('../../',import.meta.url)),args={};
for(const arg of process.argv.slice(2)){
 const m=arg.match(/^--(mode|out-dir|database-env-path|deps-root|code-fingerprint|manifest|artifact-map|execution-refresh|review-package|plan|plan-fingerprint|authority|rollback-receipt)=(.+)$/);
 assert.ok(m&&!Object.hasOwn(args,m[1]),'Unknown/duplicate argument');args[m[1]]=m[2];
}
assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode));
for(const k of ['out-dir','database-env-path','deps-root','code-fingerprint','manifest','artifact-map','execution-refresh','review-package'])assert.ok(args[k],'Missing '+k);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');const digest=sha;
const files=['scripts/audits/jungle_edition_catalog_release_v2.mjs','backend/catalog/jungle_edition_catalog_release_v2.mjs','backend/catalog/jungle_edition_catalog_release_guard_v2.mjs','backend/catalog/jungle_edition_catalog_execution_v1.mjs','backend/catalog/jungle_edition_master_authority_v1.mjs','backend/catalog/jungle_edition_execution_refresh_v1.mjs','backend/catalog/master_index_printing_authority_v1.mjs','backend/catalog/printing_completeness_gate_v1.mjs','scripts/audits/me04_finish_truth_v1.mjs'];
const codeBinding=async()=>{const records=[];for(const file of files)records.push({file,sha256:sha(await fs.readFile(path.join(root,file)))});return {files:records,fingerprint:hash(records)};};
const code=await codeBinding();assert.equal(code.fingerprint,args['code-fingerprint'],'Wrong producer');
const bound=new Map();const bytes=async p=>{const b=await fs.readFile(p);bound.set(path.resolve(p),sha(b));return b;};const json=async p=>JSON.parse(await bytes(p));
const manifest=await json(args.manifest),map=await json(args['artifact-map']),artifacts=new Map();
for(const e of map){assert.ok(!artifacts.has(e.ref));artifacts.set(e.ref,await bytes(path.resolve(path.dirname(args['artifact-map']),e.path)));}
const review=await json(path.join(args['review-package'],'package.json'));assert.equal(review.status,'prepared_for_review');assert.equal(review.project,PROJECT);assert.equal(review.candidateMigrations,422);assert.equal(review.pending.length,8);assert.equal(review.manifestSha256,sha(await fs.readFile(args.manifest)));assert.equal(review.manifestFingerprint,manifest.fingerprint);
for(const p of review.pending){assert.match(p.name,/^\d{14}_[a-z0-9_]+\.sql$/);assert.equal(sha(await bytes(path.join(args['review-package'],'pending-migrations',p.name))),p.sha256);assert.equal(sha(await bytes(path.join(root,'supabase/migrations',p.name))),p.sha256);}
for(const [name,h]of [['catalog-preview.json',review.catalogPreviewSha256],['reviewed-price-bindings.json',review.reviewedBindingsSha256],['source-files.json',review.sourceFilesSha256]])assert.equal(sha(await bytes(path.join(args['review-package'],name))),h);
const refresh=await json(args['execution-refresh']);
let plan,authority;
if(args.mode!=='prepare'){assert.ok(args.plan&&args['plan-fingerprint']);plan=await json(args.plan);assertJungleReleasePlan(plan,args['plan-fingerprint'],manifest,artifacts,{readback:args.mode==='readback'});assert.equal(plan.target,'production');assert.deepEqual(plan.executionRefresh,refresh);assert.equal(plan.reviewPackageSha256,sha(await fs.readFile(path.join(args['review-package'],'package.json'))));}
assertJungleExecutionRefreshV1(manifest,artifacts,refresh,{asOf:args.mode==='readback'?plan.asOf:new Date().toISOString()});
if(['rollback','apply'].includes(args.mode)){
 assert.ok(args.authority,'Explicit bounded authority file required');authority=await json(args.authority);assertJungleReleaseExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
 if(args.mode==='apply'){assert.ok(args['rollback-receipt'],'Fresh production rollback proof required');assertJungleReleaseRollbackReceipt(await json(args['rollback-receipt']),{plan,codeFingerprint:code.fingerprint});}
}
const out=path.resolve(args['out-dir']);await fs.mkdir(out,{recursive:false});const write=(n,v)=>fs.writeFile(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
await write('run_plan.json',{at:new Date().toISOString(),project_ref:PROJECT,mode:args.mode,code,reviewPackageSha256:sha(await fs.readFile(path.join(args['review-package'],'package.json'))),planFingerprint:plan?.fingerprint??null,authorityFingerprint:authority?.fingerprint??null,inputHashes:[...bound].map(([p,h])=>({file:path.basename(p),sha256:h})),activation:false});
const require=createRequire(path.join(path.resolve(args['deps-root']),'package.json'));let client;
async function revalidateInputs(){
 assert.deepEqual(await codeBinding(),code,'Producer changed');for(const [p,h]of bound)assert.equal(sha(await fs.readFile(p)),h,'Frozen input changed');
 assertJungleExecutionRefreshV1(manifest,artifacts,refresh,{asOf:args.mode==='readback'?plan.asOf:new Date().toISOString()});if(authority)assertJungleReleaseExecutionAuthority(authority,{plan,codeFingerprint:code.fingerprint,mode:args.mode});
}
try{
 const env=require('dotenv').parse(await fs.readFile(args['database-env-path'])),url=assertJungleReleaseDatabaseTarget(env.SUPABASE_DB_URL);
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
  application_name:'grookai_jungle_catalog_release_v2',connectionTimeoutMillis:15000,statement_timeout:45000,query_timeout:50000,
  options:['prepare','preflight','readback'].includes(args.mode)?'-c default_transaction_read_only=on':undefined});
 await client.connect();assert.equal(client.connection.stream.authorized,true);
 const sanity=(await client.query('select (select count(*)::int from public.card_prints) cards,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits')).rows[0];
 assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000,'Canonical environment sanity failed');
 await write('environment.json',{project_ref:PROJECT,sanity,tls_authorized:true,node:process.version});

 await revalidateInputs();
 if(args.mode==='prepare'){
  plan=await freezeJungleRelease({client,manifest,artifacts,target:'production',refresh});
  plan.reviewPackageSha256=sha(await fs.readFile(path.join(args['review-package'],'package.json')));delete plan.fingerprint;plan.fingerprint=hash(plan);
  await revalidateInputs();await write('execution_plan.json',plan);await write('result.json',{status:'prepared_not_authorized',fingerprint:plan.fingerprint,code,project_ref:PROJECT,productionWrites:0,activation:false});
  console.log(JSON.stringify({status:'prepared_not_authorized',fingerprint:plan.fingerprint,productionWrites:0}));
 }else{
  const result=await executeJungleRelease({client,plan,expectedFingerprint:args['plan-fingerprint'],manifest,artifacts,mode:args.mode,onPhase:async phase=>{await revalidateInputs();if(phase==='before_commit')await write('precommit.json',{at:new Date().toISOString(),fingerprint:plan.fingerprint});}});
  await write('result.json',{...result,code,rollbackUncertain:false,finished_at:new Date().toISOString()});console.log(JSON.stringify(result));
 }
}catch(e){let rollbackUncertain=e.rollbackUncertain??false;try{await client?.query('rollback');}catch{rollbackUncertain=true;}await write('failure.json',{at:new Date().toISOString(),message:e.message,sqlstate:e.code,committed:e.committed??false,commitUncertain:e.commitUncertain??false,rollbackUncertain,action:'Stop and independently read back. No automatic retry or deletion.'});console.error(e.message);process.exitCode=1;}finally{await client?.end().catch(()=>{});}
