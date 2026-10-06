import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { writeMarketSnapshotBatchesV1 } from '../../backend/pricing/market_snapshot_batches_v1.mjs';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const runId = id(999999);
function clientFor(ids) {
  return { queries:[], async query(sql,values) {
    this.queries.push({sql,values});
    const cursor = values.length===3 ? values[1] : null;
    return {rows:ids.filter(i=>!cursor||i>cursor).slice(0,values.at(-1)).map(id=>({id}))};
  }};
}
test('complete uneven ledger is bounded and every decision is selected once',async()=>{
  const ids=Array.from({length:2347},(_,n)=>id(n+1)),client=clientFor(ids),seen=[];
  const r=await writeMarketSnapshotBatchesV1(client,{runId,expectedCount:ids.length,batchSize:500,insertBatch:async batch=>{assert.ok(batch.length<=500);seen.push(...batch);return batch.length;}});
  assert.deepEqual(seen,ids);assert.deepEqual(r,{pages:5,selected:2347,inserted:2347});
  for(const q of client.queries){assert.match(q.sql,/eligible = true and decision = 'publish'/);assert.match(q.sql,/publication_lane = 'current'/);assert.doesNotMatch(q.sql,/offset/i);assert.equal(q.values[0],runId);}
});
test('interruption retains prior pages and restart fills holes without replacing phase lineage',async()=>{
  const ids=Array.from({length:1203},(_,n)=>id(n+1)),store=new Map();let pages=0;
  const insert=phase=>async batch=>{if(phase==='first'&&++pages===2)throw new Error('interrupted');let n=0;for(const key of batch)if(!store.has(key)){store.set(key,phase);n++;}return n;};
  await assert.rejects(()=>writeMarketSnapshotBatchesV1(clientFor(ids),{runId,expectedCount:ids.length,insertBatch:insert('first')}),/interrupted/);
  assert.equal(store.size,500);
  const result=await writeMarketSnapshotBatchesV1(clientFor(ids),{runId,expectedCount:ids.length,insertBatch:insert('second')});
  assert.equal(result.inserted,703);assert.equal(store.size,1203);assert.equal(store.get(id(1)),'first');assert.equal(store.get(id(501)),'second');
});
test('missing, excessive or duplicate decision pages stop before publication completion',async()=>{
  await assert.rejects(()=>writeMarketSnapshotBatchesV1(clientFor([id(1)]),{runId,expectedCount:2,insertBatch:async x=>x.length}),/count mismatch/);
  let wrote=false;await assert.rejects(()=>writeMarketSnapshotBatchesV1(clientFor([id(1),id(2)]),{runId,expectedCount:1,insertBatch:async()=>{wrote=true;return 2;}}),/exceeded/);assert.equal(wrote,false);
  await assert.rejects(()=>writeMarketSnapshotBatchesV1({query:async()=>({rows:[{id:id(1)},{id:id(1)}]})},{runId,expectedCount:2,insertBatch:async()=>2}),/cursor/);
});
test('invalid bounds and malformed ids cannot reach a write',async()=>{
  for(const batchSize of [0,2001,1.5,NaN]) await assert.rejects(()=>writeMarketSnapshotBatchesV1(null,{runId,expectedCount:1,batchSize,insertBatch:async()=>1}),/configuration/);
  for(const rows of [[{id:'invalid'}],Array.from({length:501},(_,n)=>({id:id(n+1)}))]){
    let wrote=false;await assert.rejects(()=>writeMarketSnapshotBatchesV1({query:async()=>({rows})},{runId,expectedCount:999,insertBatch:async()=>{wrote=true;return 1;}}));assert.equal(wrote,false);
  }
});
test('zero eligible decisions and duplicate-only resumed pages complete honestly',async()=>{
  const zero=await writeMarketSnapshotBatchesV1(clientFor([]),{runId,expectedCount:0,insertBatch:async()=>{throw Error('unexpected write');}});assert.deepEqual(zero,{pages:0,selected:0,inserted:0});
  const resumed=await writeMarketSnapshotBatchesV1(clientFor([id(1)]),{runId,expectedCount:1,insertBatch:async()=>0});assert.equal(resumed.inserted,0);assert.equal(resumed.selected,1);
});
test('batch insert accounting rejects ambiguous or oversized results',async()=>{
  for(const count of [-1,2,null,0.5])await assert.rejects(()=>writeMarketSnapshotBatchesV1(clientFor([id(1)]),{runId,expectedCount:1,insertBatch:async()=>count}),/insert count/);
});
test('worker scopes inserts to the selected decision IDs and retains reconciliation before activation',()=>{
  const source=fs.readFileSync(new URL('../../scripts/workers/tcgplayer_market_publication_worker_v1.mjs',import.meta.url),'utf8');
  assert.match(source,/and decision\.id = any\(\$6::uuid\[\]\)/);
  assert.match(source,/insertBatch: ids => insertSnapshotBatch\(client, run, publicationSet, phaseAttemptId, ids\)/);
  assert.match(source,/snapshotCount !== counts\.eligible_count/);
  assert.match(source,/await evaluateProductionActivationGuard\(client, run, publicationSet\)/);
});
