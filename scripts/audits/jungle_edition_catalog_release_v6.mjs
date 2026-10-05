// Governed production-only entry point. Prepare/preflight/readback force read-only.
// Rollback/apply require the original exact approval record; no default apply.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {jungleProducerV6, freezeJungleReleaseV6, executeJungleReleaseV6, assertJunglePlanV6, assertJungleAuthorityV6, assertJungleRollbackV6, JUNGLE_PROJECT_V6} from '../../backend/catalog/jungle_edition_catalog_release_v6.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {buildJungleExecutionRows} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {reviewJungleEditionSourcesV4} from '../../backend/pricing/jungle_edition_source_review_v4.mjs';

process.umask(0o077);
const args = {}, keys = ['mode','out-dir','env-file','deps-root','code-fingerprint','manifest','artifact-map','source-snapshot','source-artifact-map','account-review','plan','plan-fingerprint','authority','approval-record','rollback-receipt'];
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([a-z-]+)=(.+)$/); assert.ok(match && keys.includes(match[1]) && !Object.hasOwn(args,match[1]), 'unknown_or_duplicate_argument'); args[match[1]] = match[2];
}
assert.ok(['prepare','preflight','rollback','apply','readback'].includes(args.mode),'explicit_mode_required');
for (const key of ['out-dir','env-file','deps-root','code-fingerprint','manifest','artifact-map','source-artifact-map']) assert.ok(args[key], 'missing_' + key);
const sha = b => crypto.createHash('sha256').update(b).digest('hex'), files = new Map();
const bytes = name => {const file=path.resolve(name),value=fs.readFileSync(file);files.set(file,sha(value));return value;};
const json = name => JSON.parse(bytes(name));
const producer = jungleProducerV6(); assert.equal(producer.fingerprint,args['code-fingerprint'],'producer_fingerprint_required');
const manifest=json(args.manifest), physicalMap=json(args['artifact-map']), sourceMap=json(args['source-artifact-map']);
const artifacts=new Map(physicalMap.map(r=>[r.ref,bytes(path.resolve(path.dirname(args['artifact-map']),r.path))]));
const sourceArtifacts=new Map(sourceMap.map(r=>[r.id,bytes(path.resolve(path.dirname(args['source-artifact-map']),r.path))]));
assert.equal(artifacts.size,physicalMap.length);assert.equal(sourceArtifacts.size,sourceMap.length);
// Validate actual physical bytes before credentials are loaded or any connection.
const original=JSON.parse(String(artifacts.get('jungle:production-snapshot')));buildJungleExecutionRows(manifest,artifacts,{asOf:original.at});
let plan,authority,rollbackReceipt,sourceCapture,accountReview;
if(args.mode==='prepare') {
  assert.ok(args['source-snapshot']);assert.ok(!args.plan && !args.authority && !args['rollback-receipt']);
  sourceCapture=json(args['source-snapshot']);accountReview=args['account-review']?json(args['account-review']):null;
  const reviewed=reviewJungleEditionSourcesV4({manifest,snapshot:sourceCapture,artifactBytes:sourceArtifacts,asOf:new Date().toISOString()});assert.equal(reviewed.summary.compatible,128);assert.equal(reviewed.summary.held,0);
} else {
  assert.ok(args.plan && args['plan-fingerprint']);plan=json(args.plan);assert.equal(plan.target,'production');assert.equal(plan.fingerprint,args['plan-fingerprint']);
  assertJunglePlanV6(plan,{manifest,artifacts,sourceArtifacts,readback:args.mode==='readback'});
}
if(['rollback','apply'].includes(args.mode)) {
  assert.ok(args.authority && args['approval-record'],'original_approval_record_required');authority=json(args.authority);
  const record=bytes(args['approval-record']);assert.equal(sha(record),authority.approvalRecordSha256);assert.equal(record.toString('utf8'),authority.approvalText);
  assertJungleAuthorityV6(authority,plan,args.mode);
  if(args.mode==='apply') {assert.ok(args['rollback-receipt']);rollbackReceipt=json(args['rollback-receipt']);assertJungleRollbackV6(rollbackReceipt,plan,authority);}
} else assert.ok(!args.authority && !args['approval-record'] && !args['rollback-receipt'],'read_only_mode_must_not_carry_write_authority');

const out=path.resolve(args['out-dir']);fs.mkdirSync(out,{recursive:false});
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
save('run-plan.json',{at:new Date().toISOString(),mode:args.mode,project_ref:JUNGLE_PROJECT_V6,producer,manifestFingerprint:manifest.fingerprint,planFingerprint:plan?.fingerprint??null,authorityFingerprint:authority?.fingerprint??null,inputHashes:[...files].map(([file,sha256])=>({file:path.basename(file),sha256})),productionWritesAuthorized:['rollback','apply'].includes(args.mode)});
const require=createRequire(path.join(path.resolve(args['deps-root']),'package.json'));
const revalidate=()=>{
  assert.deepEqual(jungleProducerV6(),producer,'producer_changed');for(const[file,expected]of files)assert.equal(sha(fs.readFileSync(file)),expected,'input_file_changed');
  if(plan)assertJunglePlanV6(plan,{manifest,artifacts,sourceArtifacts,readback:args.mode==='readback'});
  if(authority)assertJungleAuthorityV6(authority,plan,args.mode);
};
let client;
try {
  const env=require('dotenv').parse(fs.readFileSync(args['env-file'])),url=new URL(env.SUPABASE_DB_URL);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol));assert.equal(url.hostname,'aws-1-us-east-2.pooler.supabase.com');assert.equal(decodeURIComponent(url.username),'postgres.'+JUNGLE_PROJECT_V6);assert.equal(url.pathname,'/postgres');assert.ok(['5432','6543'].includes(url.port));
  for(const key of url.searchParams.keys())assert.ok(['sslmode','sslcert','sslkey','sslrootcert'].includes(key),'unexpected_connection_option');url.search='';
  revalidate();
  // No credentials are sent to openssl. Verify the pinned chain before pg login.
  const chain=execFileSync('openssl',['s_client','-starttls','postgres','-connect',url.hostname+':'+url.port,'-servername',url.hostname,'-showcerts'],{input:'',encoding:'utf8',timeout:15000,stdio:['pipe','pipe','ignore']});
  const pems=chain.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);assert.equal(pems?.length,3);
  const certs=pems.map(p=>new crypto.X509Certificate(p));assert.equal(sha(certs[1].raw),'303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea');assert.equal(sha(certs[2].raw),'807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa');
  assert.ok(certs[0].checkHost(url.hostname));for(const c of certs)assert.ok(Date.parse(c.validFrom)<Date.now()&&Date.parse(c.validTo)>Date.now());assert.ok(certs[0].verify(certs[1].publicKey)&&certs[1].verify(certs[2].publicKey)&&certs[2].verify(certs[2].publicKey));
  revalidate();
  client=new(require('pg').Client)({connectionString:url.href,ssl:{ca:pems.slice(1),rejectUnauthorized:true,servername:url.hostname},connectionTimeoutMillis:15000,statement_timeout:15000,query_timeout:20000,application_name:'grookai_jungle_catalog_release_v6',options:['prepare','preflight','readback'].includes(args.mode)?'-c default_transaction_read_only=on':undefined});
  await client.connect();assert.equal(client.connection.stream.authorized,true);revalidate();
  if(args.mode==='prepare') {
    plan=await freezeJungleReleaseV6({client,manifest,artifacts,target:'production',sourceCapture,sourceArtifacts,accountReview});revalidate();save('plan.private.json',plan);
    save('result.json',{status:'prepared_not_authorized',mode:'prepare',planFingerprint:plan.fingerprint,producerFingerprint:producer.fingerprint,reviewHolds:plan.reviewHolds,productionWrites:0,finishedAt:new Date().toISOString()});
    console.log(JSON.stringify({status:'prepared_not_authorized',planFingerprint:plan.fingerprint,reviewHolds:plan.reviewHolds,productionWrites:0}));
  } else {
    const result=await executeJungleReleaseV6({client,plan,expectedFingerprint:args['plan-fingerprint'],manifest,artifacts,sourceArtifacts,mode:args.mode,authority,rollbackReceipt});
    save('result.json',result);console.log(JSON.stringify({status:'verified',mode:args.mode,planFingerprint:plan.fingerprint,committed:result.committed,rollbackProven:result.rollbackProven}));
  }
} catch(error) {
  await client?.query('rollback').catch(()=>{});save('failure.private.json',{at:new Date().toISOString(),message:error.message,code:error.code,committed:error.committed??false,commitUncertain:error.commitUncertain??false,rollbackUncertain:error.rollbackUncertain??false,independentReadbackRequired:error.independentReadbackRequired??false,action:'Stop and independently inspect uncertain results. No automatic retry.'});
  console.error('Jungle execution stopped; see failure.private.json in the requested output directory.');process.exitCode=1;
} finally {await client?.end().catch(()=>{});}
