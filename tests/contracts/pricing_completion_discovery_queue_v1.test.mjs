import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,readdirSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openPricingCompletionDiscoveryQueueV1,pricingCompletionDiscoveryKeyV1} from '../../backend/pricing/pricing_completion_discovery_queue_v1.mjs';

const NOW=1700000000000;
const sha=v=>createHash('sha256').update(String(v)).digest('hex');
function setup(options={}){const directory=mkdtempSync(join(tmpdir(),'discovery-queue-'));return {directory,q:openPricingCompletionDiscoveryQueueV1({directory,...options})};}
function row(id=1,extra={}){return {identity:{kind:'warehouse_product',provider:'tcgcsv',category:'3',productId:String(id)},
  issues:['missing_parent_mapping'],evidence:{hasPositiveQuote:true,activeMappings:0},owner:'catalog-review',nextAction:'Review exact source identity.',...extra};}
function generation(rows=[row()],n=1){return {generationId:sha(`generation-${n}`),observedAt:NOW+n,sourceLinks:{captureSha256:sha(`capture-${n}`),runId:`run-${n}`},observations:rows};}
function ingest(q,rows=[row()],n=1){return q.ingestGeneration(generation(rows,n),{now:NOW+10000});}
function current(directory){return readFileSync(join(directory,'CURRENT.json'),'utf8');}
function object(directory,id){return JSON.parse(readFileSync(join(directory,'objects',`${id}.json`),'utf8'));}
function claims(items){return items.map(i=>({key:i.key,token:i.lease.token}));}

test('three namespaces use real entity identities and never invent printing dimensions',()=>{
  const {q}=setup();const rows=[row(),row(2,{identity:{kind:'catalog_parent',parentId:'11111111-1111-4111-8111-111111111111'}}),
    row(3,{identity:{kind:'master_printing',printingId:'22222222-2222-4222-8222-222222222222',currency:'USD',condition:'NOT_CONDITION_SPECIFIC'}})];
  assert.equal(ingest(q,rows).added,3);assert.equal(q.summary().unresolved,3);assert.equal(q.summary().completed,0);
  assert.equal(new Set(rows.map(r=>pricingCompletionDiscoveryKeyV1(r.identity))).size,3);
  assert.equal(q.resolve,undefined);
  for(const identity of [{kind:'catalog_parent',parentId:'placeholder'},{kind:'warehouse_product',provider:'tcgcsv',category:3,productId:'1'},
    {kind:'master_printing',printingId:'22222222-2222-4222-8222-222222222222',currency:'XXX',condition:'UNKNOWN'}])
    assert.throws(()=>pricingCompletionDiscoveryKeyV1(identity));
});

test('exact replay is idempotent and reopened instance resumes all history',()=>{
  const {q,directory}=setup();ingest(q);const before=current(directory),item=q.get(row().identity);
  assert.equal(ingest(q).replayed,true);assert.equal(current(directory),before);
  const resumed=openPricingCompletionDiscoveryQueueV1({directory});assert.deepEqual(resumed.get(row().identity),item);
  const bad=generation();bad.observations[0].evidence.activeMappings=1;
  assert.throws(()=>q.ingestGeneration(bad,{now:NOW+100}),/generation_replay_conflict/);assert.equal(current(directory),before);
});

test('fresh unchanged capture preserves every item shard and state while provenance advances',()=>{
  const {q,directory}=setup();ingest(q,[row(1),row(2)]);
  const claimed=q.claimBatch({now:NOW+100,limit:1,leaseMs:1000,workerId:'prep'});
  q.deferBatch({now:NOW+101,claims:claims(claimed),reason:'Needs identity authority',owner:'review',nextAction:'Review source.'});
  const before=q.inspect(),beforeReceipt=object(directory,before.receipt),old=q.get(claimed[0].identity);
  const r=ingest(q,[row(2),row(1)],2);assert.equal(r.unchanged,2);assert.equal(r.reopened,0);
  const after=q.inspect(),newItem=q.get(claimed[0].identity);
  assert.deepEqual(after.shards,before.shards);assert.deepEqual(object(directory,after.receipt).memberships,beforeReceipt.memberships);
  assert.equal(newItem.state,'review_needed');assert.deepEqual(newItem.history,old.history);
  assert.equal(newItem.lastSeen,NOW+2);assert.equal(newItem.firstSeen,NOW+1);assert.equal(newItem.sourceLinks.runId,'run-2');
});

test('absent input neither closes entity nor renews its lastSeen',()=>{
  const {q}=setup();ingest(q,[row(1),row(2)]);ingest(q,[row(2)],2);
  assert.equal(q.get(row(1).identity).lastSeen,NOW+1);assert.equal(q.get(row(2).identity).lastSeen,NOW+2);
  assert.equal(q.summary().unresolved,2);ingest(q,[],3);
  assert.equal(q.get(row(1).identity).lastSeen,NOW+1);assert.equal(q.get(row(2).identity).lastSeen,NOW+2);
  assert.equal(q.summary().total,2);
});

test('semantic change invalidates lease and preserves firstSeen and lifetime attempts',()=>{
  const {q}=setup();ingest(q);const original=q.claimBatch({now:NOW+10,workerId:'prep',leaseMs:1000});
  assert.equal(ingest(q,[row(1,{issues:['missing_parent_mapping','unsupported_variant']})],2).reopened,1);
  const item=q.get(row().identity);assert.equal(item.state,'pending');assert.equal(item.firstSeen,NOW+1);
  assert.equal(item.totalAttempts,1);assert.equal(item.attemptsSinceChange,0);assert.equal(item.semanticChanges,1);
  assert.deepEqual(item.history.map(h=>h.type),['discovered','claimed','semantic_change']);
  assert.throws(()=>q.deferBatch({now:NOW+11,claims:claims(original),reason:'Old result',owner:'review',nextAction:'Review.'}),/stale_claim/);
});

test('generation admission validates every row and duplicates before any mutation',()=>{
  const {q,directory}=setup();ingest(q);const before=current(directory),objects=readdirSync(join(directory,'objects'));
  for(const rows of [[row(2),row(3,{identity:{kind:'catalog_parent',parentId:'bad'}})],[row(2),row(2)]])
    assert.throws(()=>ingest(q,rows,2));
  assert.equal(current(directory),before);assert.deepEqual(readdirSync(join(directory,'objects')),objects);
  assert.throws(()=>ingest(q,[row(2)],0),/stale_or_same_time_generation/);
});

test('exclusive writer lock fails closed even if stale and is never stolen',()=>{
  const {q,directory}=setup();ingest(q);const lock=join(directory,'WRITER.lock');writeFileSync(lock,'{"old":true}');
  const other=openPricingCompletionDiscoveryQueueV1({directory});
  assert.throws(()=>other.claimBatch({now:NOW+10,workerId:'second'}),/writer_locked_no_automatic_recovery/);
  assert.throws(()=>ingest(q,[row()],2),/writer_locked_no_automatic_recovery/);
  assert.equal(readFileSync(lock,'utf8'),'{"old":true}');
});

test('expired lease retries with a new token, stale ack cannot affect its replacement',()=>{
  const {q}=setup();ingest(q);
  const first=q.claimBatch({now:NOW+10,leaseMs:1000,workerId:'a'});
  assert.deepEqual(q.claimBatch({now:NOW+11,workerId:'b'}),[]);
  const second=q.claimBatch({now:NOW+1010,leaseMs:1000,workerId:'b'});
  assert.equal(second.length,1);assert.notEqual(second[0].lease.token,first[0].lease.token);
  assert.equal(second[0].totalAttempts,2);
  assert.throws(()=>q.deferBatch({now:NOW+1011,claims:claims(first),reason:'stale',owner:'review',nextAction:'Review.'}),/stale_claim/);
  assert.equal(q.get(row().identity).lease.token,second[0].lease.token);
});

test('bounded retries and review-needed acknowledgments never count complete',()=>{
  const {q}=setup();ingest(q);const first=q.claimBatch({now:NOW+10,workerId:'a'});
  q.deferBatch({now:NOW+11,claims:claims(first),reason:'Temporary preparation failure',owner:'review',nextAction:'Retry.',retryAfterMs:60000});
  assert.deepEqual(q.claimBatch({now:NOW+60010,workerId:'b'}),[]);
  const second=q.claimBatch({now:NOW+60011,workerId:'b'});
  q.deferBatch({now:NOW+60012,claims:claims(second),reason:'Requires catalog authority',owner:'review',nextAction:'Review.'});
  assert.equal(q.summary().states.review_needed,1);assert.equal(q.summary().completed,0);assert.equal(q.summary().unresolved,1);
  assert.deepEqual(q.claimBatch({now:NOW+1000000,workerId:'c'}),[]);
});

test('all acknowledgments validate before any shard commit',()=>{
  const {q,directory}=setup();ingest(q,[row(1),row(2)]);const batch=q.claimBatch({now:NOW+10,workerId:'a'}),before=current(directory);
  const bad=claims(batch);bad[1].token='11111111-1111-4111-8111-111111111111';
  assert.throws(()=>q.deferBatch({now:NOW+11,claims:bad,reason:'hold',owner:'review',nextAction:'Review.'}),/stale_claim/);
  assert.equal(current(directory),before);assert.equal(q.summary().states.leased,2);
});

test('fair bounded claims do not starve untouched entities after semantic reopening',()=>{
  const {q}=setup();const rows=Array.from({length:12},(_,i)=>row(i+1));ingest(q,rows);
  const first=q.claimBatch({now:NOW+10,limit:5,workerId:'a'});
  ingest(q,rows.map(r=>({...r,evidence:{...r.evidence,semanticRevision:2}})),2);
  const second=q.claimBatch({now:NOW+11,limit:5,workerId:'b'});
  assert.equal(second.length,5);assert.ok(second.every(i=>!first.some(f=>f.key===i.key)));
  assert.throws(()=>q.claimBatch({now:NOW+12,limit:501,workerId:'b'}));
});

test('corrupted shard or CURRENT never resets state to empty',()=>{
  for(const location of ['shard','current']){
    const {q,directory}=setup();ingest(q);
    const path=location==='current'?join(directory,'CURRENT.json'):join(directory,'objects',`${Object.values(q.inspect().shards)[0]}.json`);
    writeFileSync(path,'{}');assert.throws(()=>q.summary());assert.throws(()=>ingest(q,[row()],2));
    assert.equal(readFileSync(path,'utf8'),'{}');
  }
});

test('uncommitted generation staging is invisible, initial orphan store fails closed',()=>{
  const {q,directory}=setup();ingest(q);const before=current(directory);
  writeFileSync(join(directory,'objects','.stage-11111111-1111-4111-8111-111111111111.tmp'),'incomplete');
  assert.equal(q.summary().total,1);assert.equal(current(directory),before);
  assert.equal(ingest(q,[row()],2).unchanged,1);
  const fresh=setup();writeFileSync(join(fresh.directory,'objects','.stage-11111111-1111-4111-8111-111111111111.tmp'),'incomplete');
  assert.throws(()=>fresh.q.summary(),/missing_current_requires_recovery/);
  assert.throws(()=>ingest(fresh.q),/missing_current_requires_recovery/);
});

test('retained storage cap rejects an entire generation and preserves last committed pointer',()=>{
  const {q,directory}=setup({maxBytes:1024*1024});ingest(q);const before=current(directory);
  const rows=Array.from({length:400},(_,i)=>row(i+1,{evidence:{payload:'x'.repeat(3500)}}));
  assert.throws(()=>ingest(q,rows,2),/retained_storage_budget/);
  assert.equal(current(directory),before);assert.equal(q.summary().total,1);assert.equal(q.get(row().identity).lastSeen,NOW+1);
});

test('symlink directory boundary is rejected without following target',()=>{
  const root=mkdtempSync(join(tmpdir(),'discovery-path-')),target=join(root,'target'),link=join(root,'link');mkdirSync(target);
  symlinkSync(target,link,process.platform==='win32'?'junction':'dir');
  assert.throws(()=>openPricingCompletionDiscoveryQueueV1({directory:join(link,'queue')}),/symlink_or_non_directory/);
});

test('accidentally selecting legacy state directory rejects before modifying it',()=>{
  const directory=mkdtempSync(join(tmpdir(),'discovery-legacy-'));
  writeFileSync(join(directory,'queue-v1.json'),'preserved legacy bytes');
  assert.throws(()=>openPricingCompletionDiscoveryQueueV1({directory}),/foreign_directory_requires_separate_state/);
  assert.deepEqual(readdirSync(directory),['queue-v1.json']);
  assert.equal(readFileSync(join(directory,'queue-v1.json'),'utf8'),'preserved legacy bytes');
});

test('thousands of entities are sharded and unchanged recapture writes only receipt/manifest',()=>{
  const {q,directory}=setup();const rows=Array.from({length:2000},(_,i)=>row(i+1));ingest(q,rows);
  const before=q.inspect(),count=readdirSync(join(directory,'objects')).length;
  assert.ok(Object.keys(before.shards).length>200);assert.equal(q.summary().total,2000);
  ingest(q,rows,2);assert.deepEqual(q.inspect().shards,before.shards);
  assert.equal(readdirSync(join(directory,'objects')).length,count+2);
});
