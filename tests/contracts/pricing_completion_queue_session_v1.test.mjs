import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openPricingCompletionQueueV1,pricingCompletionDigestV1} from '../../backend/pricing/pricing_completion_queue_v1.mjs';

// Execute only in the separately approved credential-free test environment.
const NOW=1791849600000;
function fixture(t){
  const directory=fs.mkdtempSync(join(tmpdir(),'pricing-queue-session-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  return {directory,file:join(directory,'queue.json'),queue:openPricingCompletionQueueV1({directory})};
}
function observation(productId='1',revision=1){return {
  identity:{kind:'source',provider:'tcgcsv',category:'3',productId,subtype:'Holofoil',currency:'USD',condition:'NOT_CONDITION_SPECIFIC'},
  sourceRunId:`source-${revision}`,reason:'missing_active_source_mapping',scope:'pokemon:fixture',
  evidence:{priceBasis:'TCGPLAYER_MARKET',value:revision,nested:{preserved:true}},owner:'reviewer',nextAction:'Review exact source identity.'
};}
function claim(queue,now=NOW){return queue.claim({owner:'preparer',runId:'run-1',limit:2,leaseMs:1000,now});}
function deferrals(rows){return rows.map(row=>({key:row.key,leaseToken:row.lease.token,reason:'packet preserved',nextAction:'Acquire independent evidence.',reviewRequired:true}));}
function disk(f){return JSON.parse(fs.readFileSync(f.file,'utf8'));}
function assertEnvelope(envelope){assert.equal(envelope.digest,pricingCompletionDigestV1(envelope.state));}

test('session preserves ordinary revisions, histories, fairness, changed sources and absent work',t=>{
  const ordinary=fixture(t),session=fixture(t);
  function cycle(q,rows,now){const ingestion=q.ingest(rows,{now});const claims=claim(q,now+1);if(claims.length)q.deferBatch({items:deferrals(claims),now:now+2});return {ingestion,summary:q.summary({now:now+3})};}
  for(const [rows,now] of [[[observation('1'),observation('2'),observation('3')],NOW],[[observation('1',2),observation('2')],NOW+100]]){
    const expected=cycle(ordinary.queue,rows,now);
    const actual=session.queue.withPreparationSession(q=>cycle(q,rows,now));
    assert.deepEqual(actual,expected);
    assert.deepEqual(disk(session),disk(ordinary));
  }
  const state=disk(session).state;
  assert.equal(state.revision,6);assert.equal(state.items.length,3);
  assert.equal(state.items.find(row=>row.identity.productId==='3').lastSeen,NOW);
  assert.ok(state.items.every(row=>row.state==='review_needed'&&row.resolution===null));
});

test('one snapshot read and one lock retain three durable commits and detached results',t=>{
  const f=fixture(t);f.queue.ingest([observation('1'),observation('2')],{now:NOW});
  const originalOpen=fs.openSync,originalRename=fs.renameSync;
  let reads=0,locks=0,commits=0;
  fs.openSync=function(path,flags,...rest){const fd=originalOpen.call(this,path,flags,...rest);if(path===f.file&&flags==='r')reads++;if(path===join(f.directory,'writer.lock')&&flags==='wx')locks++;return fd;};
  fs.renameSync=function(from,to){if(to===f.file)commits++;return originalRename.call(this,from,to);};
  syncBuiltinESMExports();
  try{f.queue.withPreparationSession(q=>{
    q.ingest([observation('1'),observation('2')],{now:NOW+1});
    const rows=claim(q,NOW+2);const fd=originalOpen(f.file,'r');let saved;
    try{saved=JSON.parse(fs.readFileSync(fd,'utf8'));}finally{fs.closeSync(fd);}assertEnvelope(saved);
    assert.equal(saved.state.revision,3);assert.equal(saved.state.items.filter(row=>row.state==='leased').length,2);
    rows[0].evidence.nested.preserved=false;rows[0].history.push({arbitrary:true});
    assert.throws(()=>openPricingCompletionQueueV1({directory:f.directory}).summary(),/writer lock present/);
    q.deferBatch({items:deferrals(rows),now:NOW+3});
    assert.equal(q.summary({now:NOW+4}).revision,4);
  });}finally{fs.openSync=originalOpen;fs.renameSync=originalRename;syncBuiltinESMExports();}
  assert.deepEqual({reads,locks,commits},{reads:1,locks:1,commits:3});
  assert.ok(disk(f).state.items.every(row=>row.evidence.nested.preserved===true&&!row.history.some(event=>event.arbitrary)));
});

test('callback failure after a claim preserves leases and permits later expiry/backoff recovery',t=>{
  const f=fixture(t);
  assert.throws(()=>f.queue.withPreparationSession(q=>{
    q.ingest([observation()],{now:NOW});claim(q,NOW+1);throw new Error('packet_io_failed');
  }),/packet_io_failed/);
  assert.equal(fs.existsSync(join(f.directory,'writer.lock')),false);
  const retained=disk(f);assertEnvelope(retained);assert.equal(retained.state.revision,2);
  assert.equal(retained.state.items[0].state,'leased');
  const resumed=openPricingCompletionQueueV1({directory:f.directory});
  assert.equal(claim(resumed,NOW+1001).length,0);
  const expired=resumed.snapshot().items[0];assert.equal(expired.state,'retry');
  assert.equal(claim(resumed,expired.nextAttemptAt).length,1);
  assert.equal(resumed.snapshot().items[0].totalAttempts,2);
});

test('caught partial mutation failure poisons the session and cannot commit partial deferrals',t=>{
  const f=fixture(t);f.queue.ingest([observation('1'),observation('2')],{now:NOW});
  let retained;
  assert.throws(()=>f.queue.withPreparationSession(q=>{
    const rows=claim(q);retained=fs.readFileSync(f.file);
    const invalid=deferrals(rows);invalid[1].leaseToken='wrong-token';
    assert.throws(()=>q.deferBatch({items:invalid,now:NOW+1}),/stale or missing lease/);
    assert.throws(()=>q.summary({now:NOW+2}),/stale or missing lease/);
    return 'caller swallowed failure';
  }),/stale or missing lease/);
  assert.deepEqual(fs.readFileSync(f.file),retained);
  assert.equal(f.queue.summary({now:NOW+2}).counts.leased,2);
});

test('rename failure poisons the session and retains the last durable checkpoint',t=>{
  const f=fixture(t);f.queue.ingest([observation()],{now:NOW});
  const original=fs.renameSync;let retained,injected=false;
  try{assert.throws(()=>f.queue.withPreparationSession(q=>{
    q.ingest([observation()],{now:NOW+1});retained=fs.readFileSync(f.file);
    fs.renameSync=function(from,to){if(to===f.file){injected=true;throw new Error('injected_rename_failure');}return original.call(this,from,to);};syncBuiltinESMExports();
    assert.throws(()=>claim(q,NOW+2),/injected_rename_failure/);
    fs.renameSync=original;syncBuiltinESMExports();
    assert.throws(()=>q.ingest([],{now:NOW+3}),/injected_rename_failure/);
  }),/injected_rename_failure/);}finally{fs.renameSync=original;syncBuiltinESMExports();}
  assert.equal(injected,true);assert.deepEqual(fs.readFileSync(f.file),retained);
  assert.equal(f.queue.summary({now:NOW+3}).counts.pending,1);
});

test('even a falsy thrown input error poisons a session when the caller catches it',t=>{
  const f=fixture(t);f.queue.ingest([observation()],{now:NOW});const retained=fs.readFileSync(f.file);
  const row=observation();Object.defineProperty(row,'evidence',{get(){throw null;}});
  let outerThrew=false,subsequentThrew=false;
  try{f.queue.withPreparationSession(q=>{
    try{q.ingest([row],{now:NOW+1});}catch(error){assert.equal(error,null);}
    try{claim(q,NOW+2);}catch(error){subsequentThrew=true;assert.equal(error,null);}
  });}catch(error){outerThrew=true;assert.equal(error,null);}
  assert.equal(outerThrew,true);assert.equal(subsequentThrew,true);assert.deepEqual(fs.readFileSync(f.file),retained);
});

test('session validates initial checksum/schema and revokes capabilities after success or error',t=>{
  const f=fixture(t);f.queue.ingest([observation()],{now:NOW});
  const bytes=fs.readFileSync(f.file);const invalid=disk(f);invalid.state.items[0].sourceDigest='0'.repeat(64);
  invalid.digest=pricingCompletionDigestV1(invalid.state);fs.writeFileSync(f.file,JSON.stringify(invalid));
  let invoked=false;
  assert.throws(()=>f.queue.withPreparationSession(()=>{invoked=true;}),/invalid snapshot item/);
  assert.equal(invoked,false);fs.writeFileSync(f.file,bytes);
  let escaped;
  f.queue.withPreparationSession(q=>{
    escaped=q;assert.deepEqual(Object.keys(q).sort(),['claim','deferBatch','ingest','summary']);
    assert.throws(()=>f.queue.summary(),/original queue API unavailable/);
    assert.throws(()=>f.queue.withPreparationSession(()=>{}),/already active/);
    assert.equal(q.summary({now:NOW}).total,1);
  });
  assert.throws(()=>escaped.claim({}),/session is closed/);
  assert.throws(()=>f.queue.withPreparationSession(q=>{escaped=q;return Promise.resolve('unsupported');}),/must be synchronous/);
  assert.throws(()=>escaped.summary(),/session is closed/);
  assert.equal(f.queue.summary().total,1);
});

test('abrupt child exit leaves durable claims and stale lock without automatic recovery',t=>{
  const f=fixture(t);f.queue.ingest([observation()],{now:NOW});
  const moduleUrl=new URL('../../backend/pricing/pricing_completion_queue_v1.mjs',import.meta.url).href;
  const script=`import {openPricingCompletionQueueV1} from ${JSON.stringify(moduleUrl)};const q=openPricingCompletionQueueV1({directory:${JSON.stringify(f.directory)}});q.withPreparationSession(s=>{s.claim({owner:'child',runId:'crashed-run',limit:1,leaseMs:1000,now:${NOW+1}});process.exit(23);});`;
  const env=Object.fromEntries(['SystemRoot','WINDIR','TEMP','TMP'].filter(name=>process.env[name]).map(name=>[name,process.env[name]]));
  const child=spawnSync(process.execPath,['--jitless','--max-old-space-size=128','--input-type=module','-e',script],{env,encoding:'utf8',timeout:10000,windowsHide:true});
  assert.equal(child.error,undefined);assert.equal(child.status,23,child.stderr);
  assert.equal(disk(f).state.items[0].state,'leased');assertEnvelope(disk(f));
  assert.throws(()=>f.queue.withPreparationSession(()=>{}),/writer lock present/);
  // Synthetic operator recovery only: spawnSync proved this exact child exited.
  const retainedLock=fs.readFileSync(join(f.directory,'writer.lock'));assert.ok(retainedLock.length>0);
  fs.renameSync(join(f.directory,'writer.lock'),join(f.directory,'retained-crash.lock'));
  assert.equal(claim(f.queue,NOW+1001).length,0);
  const item=f.queue.snapshot().items[0];assert.equal(item.state,'retry');assert.equal(item.totalAttempts,1);
  assert.equal(claim(f.queue,item.nextAttemptAt).length,1);
});
