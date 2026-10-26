import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runPricingCompletionFeedCycleV1} from '../../backend/pricing/pricing_completion_feed_v1.mjs';
import {parsePricingCompletionFeedArgumentsV1} from '../../scripts/workers/pricing_completion_feed_worker_v1.mjs';
import {feedCaptureFixtureV1,publishFeedFixtureV1,FEED_COLLECTOR_SHA,FEED_SQL_SHA} from '../fixtures/pricing_completion_feed_v1.mjs';
const NOW=Date.parse('2026-10-15T00:00:00.000Z');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'pricing-feed-contract-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const options={feedDirectory:path.join(root,'feed'),cacheDirectory:path.join(root,'cache'),stateDirectory:path.join(root,'state'),outputDirectory:path.join(root,'output'),expectedCollectorSha256:FEED_COLLECTOR_SHA,expectedSqlSha256:FEED_SQL_SHA,now:NOW};return {root,options,published:publishFeedFixtureV1(options.feedDirectory,feedCaptureFixtureV1(NOW),NOW)};}
function stateBytes(directory){return fs.existsSync(directory)?Object.fromEntries(fs.readdirSync(directory).sort().filter(n=>fs.statSync(path.join(directory,n)).isFile()).map(n=>[n,fs.readFileSync(path.join(directory,n),'utf8')])):{};}
test('valid V2 generation produces immutable normalization and uses existing preparation queue',async t=>{
  const f=fixture(t),first=await runPricingCompletionFeedCycleV1(f.options);assert.equal(first.state,'prepared');assert.equal(first.unresolved,1);assert.equal(first.worker.coverage.masterToPrice.status,'unknown');assert.equal(first.completionAllowed,false);
  const cache=path.join(f.options.cacheDirectory,'generations',f.published.generationId),before=stateBytes(cache);
  const again=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+1000});assert.equal(again.state,'prepared');assert.deepEqual(stateBytes(cache),before);assert.equal(again.unresolved,1);
});
test('newer generation merges new work and absence never closes old unresolved records',async t=>{
  const f=fixture(t);await runPricingCompletionFeedCycleV1(f.options);
  publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(NOW+60000,{seed:2}),NOW+60000);
  const second=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});assert.equal(second.state,'prepared');assert.equal(second.unresolved,2);
  publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(NOW+120000,{seed:3,missing:false}),NOW+120000);
  const empty=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+120000});assert.equal(empty.state,'prepared');assert.equal(empty.unresolved,2);assert.equal(empty.completionAllowed,false);
  const completed=fs.readdirSync(path.join(f.options.cacheDirectory,'generations')).filter(n=>/^[a-f0-9]{64}$/.test(n));assert.equal(completed.length,2);assert.equal(completed.includes(f.published.generationId),false);
  assert.equal(empty.cacheRetention.removed.length,1);assert.ok(fs.readdirSync(f.options.outputDirectory).some(n=>n.startsWith('packet-')));
});
test('missing, tampered, stale, failed or malformed feed fails before queue mutation and leaves durable heartbeat',async t=>{
  const changes=[f=>fs.unlinkSync(path.join(f.options.feedDirectory,'status.json')),f=>fs.appendFileSync(path.join(f.published.directory,'capture.json'),' '),
    f=>fs.writeFileSync(path.join(f.options.feedDirectory,'latest.json'),'{'),f=>fs.writeFileSync(path.join(f.options.feedDirectory,'latest.json'),JSON.stringify({...f.published.latest,generationPath:'../../escape'})),
    f=>fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),JSON.stringify({...f.published.status,state:'failed',generationId:null,errorCode:'publisher_attempt_in_progress'})),
    f=>{f.options.expectedCollectorSha256='0'.repeat(64);},f=>{f.options.expectedSqlSha256='0'.repeat(64);},f=>{f.options.now=NOW+1800001;},
    f=>fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),JSON.stringify({...f.published.status,attemptedAt:'2026-02-30T00:00:00.000Z'}))];
  for(const change of changes){const f=fixture(t);await runPricingCompletionFeedCycleV1(f.options);const before=stateBytes(f.options.stateDirectory);change(f);
    const result=await runPricingCompletionFeedCycleV1(f.options);assert.equal(result.state,'failed');assert.equal(result.queueCycleInvoked,false);assert.deepEqual(stateBytes(f.options.stateDirectory),before);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.options.outputDirectory,'heartbeat.json'))).state,'failed');assert.ok(fs.readdirSync(f.options.outputDirectory).some(n=>n.startsWith('feed-failure-')));
  }
});
test('previously accepted generation cannot roll back after a newer generation or source clock',async t=>{
  const f=fixture(t),oldLatest=fs.readFileSync(path.join(f.options.feedDirectory,'latest.json'));await runPricingCompletionFeedCycleV1(f.options);
  publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(NOW+60000,{seed:2}),NOW+60000);await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});
  const before=stateBytes(f.options.stateDirectory);fs.writeFileSync(path.join(f.options.feedDirectory,'latest.json'),oldLatest);fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),JSON.stringify({...f.published.status,attemptedAt:new Date(NOW+60000).toISOString()}));
  const result=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});assert.equal(result.errorCode,'FEED_GENERATION_ROLLBACK');assert.deepEqual(stateBytes(f.options.stateDirectory),before);
});
test('source freshness does not reset with fresh capture and corrupted cache cannot be trusted',async t=>{
  const f=fixture(t),capture=feedCaptureFixtureV1(NOW);capture.records.find(r=>r.kind==='source_run').rows[0].source_finished_at=new Date(NOW-86400001).toISOString();publishFeedFixtureV1(f.options.feedDirectory,capture,NOW);
  assert.equal((await runPricingCompletionFeedCycleV1(f.options)).state,'failed');assert.deepEqual(stateBytes(f.options.stateDirectory),{});
  const g=fixture(t);await runPricingCompletionFeedCycleV1(g.options);fs.appendFileSync(path.join(g.options.cacheDirectory,'generations',g.published.generationId,'snapshot.json'),' ');
  assert.equal((await runPricingCompletionFeedCycleV1(g.options)).errorCode,'FEED_CACHE_CONTENT_MISMATCH');
});
test('validated high-water mark survives late preparation failure and prevents old feed rollback',async t=>{
  const f=fixture(t),oldLatest=fs.readFileSync(path.join(f.options.feedDirectory,'latest.json'));await runPricingCompletionFeedCycleV1(f.options);
  const newer=publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(NOW+60000,{seed:2}),NOW+60000);
  // Fail the worker's final report after it has ingested/prepared queue entries.
  fs.unlinkSync(path.join(f.options.outputDirectory,'latest.json'));fs.mkdirSync(path.join(f.options.outputDirectory,'latest.json'));
  const failed=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});assert.equal(failed.state,'failed');assert.equal(failed.queueCycleInvoked,true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.options.cacheDirectory,'accepted-feed.json'))).generationId,newer.generationId);
  fs.writeFileSync(path.join(f.options.feedDirectory,'latest.json'),oldLatest);fs.writeFileSync(path.join(f.options.feedDirectory,'status.json'),JSON.stringify({...f.published.status,attemptedAt:new Date(NOW+60000).toISOString()}));
  const blocked=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});assert.equal(blocked.errorCode,'FEED_GENERATION_ROLLBACK');assert.equal(blocked.queueCycleInvoked,false);
  const code=fs.readFileSync(new URL('../../backend/pricing/pricing_completion_feed_v1.mjs',import.meta.url),'utf8');
  const cursor=code.indexOf("writePricingArtifactV1(cacheDirectory,'accepted-feed.json'");
  const durable=code.indexOf('syncDirectory(cacheDirectory);',cursor),cycle=code.indexOf('queueCycleInvoked=true;',cursor);
  assert.ok(cursor>0&&durable>cursor&&cycle>durable);
});
test('PAUSE preserves queue and CLI requires preparation, pins and disjoint absolute directories',async t=>{
  const f=fixture(t);fs.mkdirSync(f.options.stateDirectory);fs.writeFileSync(path.join(f.options.stateDirectory,'PAUSE'),'');assert.equal((await runPricingCompletionFeedCycleV1(f.options)).state,'paused');
  const args=['--prepare-only',`--feed-dir=${f.options.feedDirectory}`,`--cache-dir=${f.options.cacheDirectory}`,`--state-dir=${f.options.stateDirectory}`,`--out-dir=${f.options.outputDirectory}`,`--expected-collector-sha256=${FEED_COLLECTOR_SHA}`,`--expected-sql-sha256=${FEED_SQL_SHA}`];
  assert.equal(parsePricingCompletionFeedArgumentsV1(args).watch,false);assert.equal(parsePricingCompletionFeedArgumentsV1([...args,'--watch']).watch,true);
  for(const bad of [args.filter(x=>x!=='--prepare-only'),[...args,'--apply'],[...args,'--watch=true'],[...args,'--batch-size=501']])assert.throws(()=>parsePricingCompletionFeedArgumentsV1(bad));
  await assert.rejects(runPricingCompletionFeedCycleV1({...f.options,outputDirectory:f.options.feedDirectory}),/DISJOINT/);
});
test('cache retention never deletes unknown files or follows redirects and fails before further queue mutation',async t=>{
  const f=fixture(t);await runPricingCompletionFeedCycleV1(f.options);const before=stateBytes(f.options.stateDirectory);
  const dir=path.join(f.options.cacheDirectory,'generations',f.published.generationId);fs.writeFileSync(path.join(dir,'unrelated.txt'),'preserve me');
  publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(NOW+60000,{seed:2}),NOW+60000);
  const rejected=await runPricingCompletionFeedCycleV1({...f.options,now:NOW+60000});assert.equal(rejected.state,'failed');assert.equal(rejected.queueCycleInvoked,false);
  assert.equal(fs.readFileSync(path.join(dir,'unrelated.txt'),'utf8'),'preserve me');assert.deepEqual(stateBytes(f.options.stateDirectory),before);
  const g=fixture(t);await runPricingCompletionFeedCycleV1(g.options);
  for(let n=1;n<=3;n++)fs.mkdirSync(path.join(g.options.cacheDirectory,'generations',`.pending-00000000-0000-4000-8000-${String(n).padStart(12,'0')}`));
  assert.equal((await runPricingCompletionFeedCycleV1(g.options)).errorCode,'FEED_CACHE_PENDING_LIMIT');
});
test('repeated late failures cannot accumulate unbounded completed cache generations',async t=>{
  const f=fixture(t);await runPricingCompletionFeedCycleV1(f.options);
  fs.unlinkSync(path.join(f.options.outputDirectory,'latest.json'));fs.mkdirSync(path.join(f.options.outputDirectory,'latest.json'));
  for(let seed=2;seed<=3;seed++){
    const now=NOW+(seed-1)*60000;publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(now,{seed}),now);
    const failed=await runPricingCompletionFeedCycleV1({...f.options,now});assert.equal(failed.state,'failed');assert.equal(failed.queueCycleInvoked,true);
  }
  const now=NOW+180000;publishFeedFixtureV1(f.options.feedDirectory,feedCaptureFixtureV1(now,{seed:4}),now);
  const before=stateBytes(f.options.stateDirectory),blocked=await runPricingCompletionFeedCycleV1({...f.options,now});
  assert.equal(blocked.errorCode,'FEED_CACHE_COMPLETED_LIMIT');assert.equal(blocked.queueCycleInvoked,false);assert.deepEqual(stateBytes(f.options.stateDirectory),before);
  assert.equal(fs.readdirSync(path.join(f.options.cacheDirectory,'generations')).filter(n=>/^[a-f0-9]{64}$/.test(n)).length,3);
});
