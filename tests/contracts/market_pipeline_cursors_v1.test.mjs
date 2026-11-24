import test from 'node:test';import assert from 'node:assert/strict';
import {readMarketCursorBatchesV1} from '../../backend/pricing/market_pipeline_cursors_v1.mjs';
import {readMarketLedgerBatchesV2} from '../../backend/pricing/tcgplayer_market_streaming_v2.mjs';
import {writeMarketSnapshotBatchesV2} from '../../backend/pricing/market_snapshot_batches_v2.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,runId=id(999999);
function clientFor(rows){let offset=0;return{calls:[],async query(sql,values){this.calls.push({sql,values});if(sql.startsWith('declare ')){offset=0;return{rows:[]};}if(sql.startsWith('close '))return{rows:[]};assert.match(sql,/^fetch forward \d+ from market_rows_[a-f0-9]{32}$/);const n=Number(sql.split(' ')[2]),page=rows.slice(offset,offset+n);offset+=page.length;return{rows:page};}};}
const consume=async iterator=>{const result=[];for await(const page of iterator)result.push(...page);return result;};
test('a traversal sorts once, binds scope, fetches bounded pages and closes its owned cursor',async()=>{
 const rows=Array.from({length:2347},(_,i)=>({id:id(i+1)})),c=clientFor(rows);assert.deepEqual(await consume(readMarketCursorBatchesV1(c,{query:'select id from qualified where run_id=$1 order by id',values:[runId],batchSize:500})),rows);assert.equal(c.calls.filter(c=>c.sql.startsWith('declare')).length,1);assert.deepEqual(c.calls[0].values,[runId]);assert.match(c.calls[0].sql,/no scroll cursor with hold/);assert.equal(c.calls.filter(c=>c.sql.startsWith('fetch')).length,6);assert.match(c.calls.at(-1).sql,/^close /);
});
test('early exit, consumer failure and fetch failure close the cursor; invalid configuration cannot query',async()=>{
 for(const mode of ['break','consumer','fetch']){const c=clientFor([{id:id(1)},{id:id(2)}]),query=c.query;c.query=async function(sql,values){if(mode==='fetch'&&sql.startsWith('fetch'))throw Error('fetch failure');return query.call(this,sql,values);};const run=async()=>{for await(const rows of readMarketCursorBatchesV1(c,{query:'select id from qualified',batchSize:1})){if(mode==='consumer')throw Error('consumer failure');break;}};if(mode==='break')await run();else await assert.rejects(run,/failure/);assert.match(c.calls.at(-1).sql,/^close /);}
 for(const options of [{query:'delete from qualified'},{query:'select 1',batchSize:0},{query:'select 1',batchSize:2001},{query:'select 1',batchSize:1.5},{query:'select 1',values:null}])await assert.rejects(consume(readMarketCursorBatchesV1({query:()=>{throw Error('must not query');}},options)),/configuration/);
});
test('candidate ledger rejects duplicated observations across pages',async()=>{
 const row={id:id(1),source_observation_id:id(2),source_product_id:1,source_subtype_name:'Normal',candidate_payload:{}};const c=clientFor([row,{...row,id:id(3)}]);await assert.rejects(consume(readMarketLedgerBatchesV2(c,'candidates',runId,1)),/duplicate/);assert.match(c.calls.at(-1).sql,/^close /);assert.match(c.calls[0].sql,/where run_id=\$1/);
});
test('snapshot restart traverses every eligible decision and fills holes without replacing old lineage',async()=>{
 const rows=Array.from({length:1203},(_,i)=>({id:id(i+1)})),store=new Map();let calls=0;const insert=phase=>async ids=>{if(phase==='first'&&++calls===2)throw Error('interrupted');let count=0;for(const key of ids)if(!store.has(key)){store.set(key,phase);count++;}return count;};const first=clientFor(rows);await assert.rejects(writeMarketSnapshotBatchesV2(first,{runId,expectedCount:1203,insertBatch:insert('first')}),/interrupted/);assert.equal(store.size,500);assert.match(first.calls.at(-1).sql,/^close /);const next=clientFor(rows),result=await writeMarketSnapshotBatchesV2(next,{runId,expectedCount:1203,insertBatch:insert('second')});assert.deepEqual(result,{pages:3,selected:1203,inserted:703});assert.equal(store.get(id(1)),'first');assert.equal(store.get(id(501)),'second');assert.match(next.calls[0].sql,/eligible=true and decision='publish' and publication_lane='current'/);
});
test('snapshot holes, excessive pages, duplicate IDs and ambiguous insert counts cannot complete',async()=>{
 await assert.rejects(writeMarketSnapshotBatchesV2(clientFor([{id:id(1)}]),{runId,expectedCount:2,insertBatch:async ids=>ids.length}),/count mismatch/);
 for(const [rows,expected]of [[[id(1),id(2)],1],[[id(1),id(1)],2]]){let wrote=false;await assert.rejects(writeMarketSnapshotBatchesV2(clientFor(rows.map(id=>({id}))),{runId,expectedCount:expected,insertBatch:async()=>{wrote=true;return 0;}}));assert.equal(wrote,false);}
 for(const count of [-1,2,null,0.5])await assert.rejects(writeMarketSnapshotBatchesV2(clientFor([{id:id(1)}]),{runId,expectedCount:1,insertBatch:async()=>count}),/insert count/);
 assert.deepEqual(await writeMarketSnapshotBatchesV2(clientFor([]),{runId,expectedCount:0,insertBatch:async()=>{throw Error('unexpected');}}),{pages:0,selected:0,inserted:0});
});
