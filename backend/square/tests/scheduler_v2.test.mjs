import {test} from 'node:test';import assert from 'node:assert/strict';
import {squareScheduledConnections} from '../scheduler_batch_v2.mjs';
test('bounded periodic batches eventually include every seller, independent of RPC order',()=>{
 for(const count of [1,10,11,20,27,101]){
  const rows=Array.from({length:count},(_,n)=>({connectionId:String(n).padStart(4,'0')})),seen=new Set();
  for(let tick=0;tick<count;tick++){
   const result=squareScheduledConnections(rows,{now:tick*300000});assert.ok(result.length<=10);
   assert.deepEqual(result,squareScheduledConnections([...rows].reverse(),{now:tick*300000}));
   for(const row of result)seen.add(row.connectionId);
  }
  assert.equal(seen.size,count);
 }
});
