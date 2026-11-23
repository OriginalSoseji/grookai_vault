import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStagedSnapshots} from '../../backend/catalog/mcd22_rarity_apply_v1.mjs';
import {MCD22_PLAN_FINGERPRINT} from '../../backend/catalog/mcd22_rarity_policy_v1.mjs';
const source={products:Array.from({length:15},(_,i)=>({product_id:i+1,name:'record '+i})),groups:[{group_id:3150,name:'group'}]};
const entries=[...source.products.map(x=>({key:'product:'+x.product_id,object:x})),{key:'group:3150',object:source.groups[0]}];
const refs=entries.map((x,i)=>({id:String(i+1),key:x.key}));
const receipt={payload:{run_id:'run-a',source_receipts:refs}};
const rows=entries.map((x,i)=>({id:String(i+1),payload:{key:x.key,_kind:'mcd22_source_snapshot',
 package_fingerprint:MCD22_PLAN_FINGERPRINT,run_id:'run-a',snapshot:x.object}}));
test('durable snapshots must match the receipt, run and original source payloads',async()=>{
 const client={query:async()=>({rows})};await verifyStagedSnapshots(client,receipt,source);
 await assert.rejects(()=>verifyStagedSnapshots({query:async()=>({rows:rows.slice(1)})},receipt,source),/MISSING/);
 const drift=structuredClone(rows);drift[0].payload.snapshot.name='changed';
 await assert.rejects(()=>verifyStagedSnapshots({query:async()=>({rows:drift})},receipt,source),/DRIFT/);
 const otherRun=structuredClone(rows);otherRun[0].payload.run_id='other';
 await assert.rejects(()=>verifyStagedSnapshots({query:async()=>({rows:otherRun})},receipt,source),/DRIFT/);
 const duplicate=structuredClone(receipt);duplicate.payload.source_receipts[1].id='1';
 await assert.rejects(()=>verifyStagedSnapshots(client,duplicate,source),/RECEIPT_MISMATCH/);
});
