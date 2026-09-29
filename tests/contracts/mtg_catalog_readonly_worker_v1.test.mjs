import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { publicSupervisorGitHubReadV1, verifiedSupervisorDatabaseOptionsV1, runMtgCatalogSupervisorV1 } from '../../scripts/audits/mtg_catalog_supervisor_v1.mjs';
import { runMtgReadonlyWorkerV1, checkMtgWorkerCapacityV1 } from '../../scripts/workers/mtg_catalog_readonly_worker_v1.mjs';
import { classifyMtgWorkerEvidenceV1, readMtgWorkerEvidenceV1, MTG_WORKER_SCHEMA_V1,
  MTG_WORKER_MANIFEST_SHA_V1, MTG_WORKER_RUNNER_SHA_V1 } from '../../backend/operations/mtg_worker_evidence_v1.mjs';
import { applyMtgWorkerEvidenceV1 } from '../../scripts/audits/production_live_control_plane_v1.mjs';

const SHA = 'a'.repeat(40);
const NOW = new Date('2026-09-29T14:00:00Z');
const boundary = { database_writes:false, release_control_writes:false, image_or_storage_writes:false,
  pricing_or_publication_writes:false, app_visibility_activation:false };
function fixture(time = NOW.toISOString()) {
  return {
    receipt:{schema_version:MTG_WORKER_SCHEMA_V1,producer_commit_sha:SHA,status:'completed',started_at:time,completed_at:time},
    summary:{repository:'OriginalSoseji/grookai_vault',completed_at:time,dispatched:false,shadow_only:true,
      target_commit_sha:MTG_WORKER_RUNNER_SHA_V1,findings:[],boundaries:{...boundary},active_run_count:0,
      status:'eligible_catalog_complete_public_no_dispatch',catalog:{eligible_set_count:945,complete_exact_count:945,absent_count:0,partial_or_drifted_count:0}},
    plan:{recorded_at:time,manifest_sha256:MTG_WORKER_MANIFEST_SHA_V1,dispatch_requested:false,shadow_only:true,
      target_commit_sha:MTG_WORKER_RUNNER_SHA_V1,boundaries:{...boundary}},
    readback:{recorded_at:time,transaction_read_only:true,tls_verified:true},
  };
}
const classify = (f, options={}) => classifyMtgWorkerEvidenceV1(f.receipt,f.summary,f.plan,f.readback,{now:NOW,expectedCommit:SHA,...options});

test('public transport only reads the frozen repository endpoints without credentials', async () => {
  const args={repository:'OriginalSoseji/grookai_vault',shadowOnly:true,dispatch:false};
  const endpoint='/actions/workflows/335602786/runs?per_page=100';
  const payload={workflow_runs:[]};
  assert.equal(await publicSupervisorGitHubReadV1(args,endpoint,{request:async (url,options)=>{
    assert.equal(new URL(url).searchParams.has('event'),false);
    assert.equal(options.headers.Authorization,undefined);
    assert.ok(options.signal instanceof AbortSignal);
    return {ok:true,json:async()=>payload};
  }}),payload);
  await assert.rejects(publicSupervisorGitHubReadV1({...args,dispatch:true},endpoint),/read-only/);
  await assert.rejects(publicSupervisorGitHubReadV1(args,'/actions/workflows/335602786/dispatches'),/authority/);
  await assert.rejects(publicSupervisorGitHubReadV1(args,endpoint,{request:async()=>({ok:false,status:403})}),/HTTP 403/);
});

test('public mode rejects dispatch and non-shadow operation before provider access', async () => {
  await assert.rejects(runMtgCatalogSupervisorV1(['--repository=OriginalSoseji/grookai_vault','--public-read-only']),/requires shadow-only/);
  await assert.rejects(runMtgCatalogSupervisorV1(['--repository=OriginalSoseji/grookai_vault','--public-read-only','--shadow-only','--dispatch']),/forbidden/);
});

test('worker database options preserve verified TLS and enforce bounded read-only sessions', () => {
  const url='postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=disable';
  const options=verifiedSupervisorDatabaseOptionsV1(url,'-----BEGIN CERTIFICATE-----\nfixture');
  assert.equal(options.ssl.rejectUnauthorized,true);
  assert.equal(new URL(options.connectionString).searchParams.has('sslmode'),false);
  assert.match(options.options,/default_transaction_read_only=on/);
  assert.equal(options.statement_timeout,60000);
  assert.throws(()=>verifiedSupervisorDatabaseOptionsV1(url.replace(':5432',':6543'),'-----BEGIN CERTIFICATE-----'),/endpoint/);
  assert.throws(()=>verifiedSupervisorDatabaseOptionsV1(url,''),/CA/);
});

test('fresh exact coverage is healthy; stale, future, wrong-release and failed receipts are rejected', () => {
  const good=fixture();
  assert.equal(classify(good).status,'healthy');
  assert.equal(classify(good,{now:new Date(NOW.getTime()+46*60000)}).status,'stale');
  assert.equal(classify(good,{now:new Date(NOW.getTime()-2*60000)}).status,'failed');
  assert.equal(classify(good,{expectedCommit:'b'.repeat(40)}).status,'failed');
  for(const mutation of [f=>f.receipt.status='failed',f=>f.summary.dispatched=true,
    f=>f.plan.manifest_sha256='wrong',f=>f.summary.boundaries.database_writes=true,
    f=>f.summary.completed_at='2026-09-28T00:00:00Z',f=>f.summary.active_run_count=undefined]){
    const f=fixture();mutation(f);assert.equal(classify(f).status,'failed');
  }
  assert.equal(classify(good,{timerState:'inactive'}).status,'failed');
  assert.equal(classify(good,{serviceResult:'timeout'}).status,'failed');
});

test('drift, absent sets, unverified TLS and active writers never appear healthy', () => {
  for(const mutation of [f=>f.summary.catalog.absent_count=1,f=>f.summary.catalog.partial_or_drifted_count=1,
    f=>f.summary.catalog.complete_exact_count=944,f=>f.readback.tls_verified=false,
    f=>f.readback.transaction_read_only=false,f=>f.summary.active_run_count=1]){
    const f=fixture();mutation(f);assert.equal(classify(f).status,'degraded');
  }
});

test('worker persists success and later failure separately; hashes detect modified evidence', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mtg-readonly-contract-'));
  fs.writeFileSync(path.join(root,'RELEASE_COMMIT_SHA'),SHA);
  const output=path.join(root,'evidence');
  const old=process.env.CATALOG_AUTOMATION_MODE;process.env.CATALOG_AUTOMATION_MODE='shadow-only';
  try{
    const first=await runMtgReadonlyWorkerV1({root,output,preflight:()=>({fixture:true}),execute:async argv=>{
      assert.ok(argv.includes('--public-read-only'));assert.ok(argv.includes('--shadow-only'));assert.ok(!argv.includes('--dispatch'));
      const out=argv.find(a=>a.startsWith('--out-dir=')).slice(10);const f=fixture(new Date().toISOString());
      for(const [name,value] of [['summary.json',f.summary],['run_plan.json',f.plan],['catalog_readback.json',f.readback]])fs.writeFileSync(path.join(out,name),JSON.stringify(value));
    }});
    assert.equal((await readMtgWorkerEvidenceV1(output,{expectedCommit:SHA})).status,'healthy');
    const artifact=path.join(output,'runs',first.run_id,'catalog_readback.json');
    const bytes=fs.readFileSync(artifact);fs.appendFileSync(artifact,' ');
    await assert.rejects(readMtgWorkerEvidenceV1(output,{expectedCommit:SHA}),/hash mismatch/);
    fs.writeFileSync(artifact,bytes);
    await assert.rejects(runMtgReadonlyWorkerV1({root,output,preflight:()=>({fixture:true}),execute:async()=>{throw new Error('fixture database unavailable');}}),/unavailable/);
    assert.equal((await readMtgWorkerEvidenceV1(output,{expectedCommit:SHA})).status,'failed');
    assert.equal(fs.readdirSync(path.join(output,'runs')).length,2);
    assert.equal(JSON.parse(fs.readFileSync(path.join(output,'runs',first.run_id,'worker_receipt.json'))).status,'completed');
    const latest=JSON.parse(fs.readFileSync(path.join(output,'latest.json')));latest.run_id='../outside';fs.writeFileSync(path.join(output,'latest.json'),JSON.stringify(latest));
    await assert.rejects(readMtgWorkerEvidenceV1(output,{expectedCommit:SHA}),/identifier/);
  }finally{if(old===undefined)delete process.env.CATALOG_AUTOMATION_MODE;else process.env.CATALOG_AUTOMATION_MODE=old;fs.rmSync(root,{recursive:true,force:true});}
});

test('background audit pauses when capacity or launch-critical health cannot be proved', () => {
  const input={now:NOW,freeBytes:15_000_000_000,control:{launch_status:'healthy',observed_at:NOW.toISOString()}};
  assert.equal(checkMtgWorkerCapacityV1(input).launch_status,'healthy');
  assert.throws(()=>checkMtgWorkerCapacityV1({...input,freeBytes:14_999_999_999}),/capacity/);
  assert.throws(()=>checkMtgWorkerCapacityV1({...input,control:{...input.control,launch_status:'failed'}}),/launch-critical/);
  assert.throws(()=>checkMtgWorkerCapacityV1({...input,now:new Date(NOW.getTime()+46*60000)}),/launch-critical/);
});

test('installed worker health replaces the scheduler dependency but preserves GitHub evidence and failures', () => {
  const github=[{component_id:'mtg-catalog-supervisor',status:'stale',evidence:{run_id:1}},{component_id:'other',status:'healthy'}];
  assert.equal(applyMtgWorkerEvidenceV1(github,null),github);
  for(const status of ['healthy','failed','stale']){
    const result=applyMtgWorkerEvidenceV1(github,{status,reason:'worker receipt',evidence:{run_id:'worker'}});
    assert.equal(result[0].status,status);assert.equal(result[0].evidence.github_workflow.status,'stale');assert.equal(result[1],github[1]);
  }
});
