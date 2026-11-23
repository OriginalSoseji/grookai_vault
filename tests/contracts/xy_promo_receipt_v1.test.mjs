import test from 'node:test';import assert from 'node:assert/strict';
import {verifyXyStagedSnapshots} from '../../backend/catalog/xy_promo_rarity_apply_v1.mjs';
import {XY_PROMO_PLAN_FINGERPRINT} from '../../backend/catalog/xy_promo_rarity_apply_policy_v1.mjs';
const expected=Array.from({length:9},(_,i)=>({key:`key:${i}`,object:{id:i,body_base64:`proof-${i}`}}));
const refs=expected.map((x,i)=>({id:String(i+1),key:x.key})),receipt={payload:{run_id:'run-a',source_receipts:refs}};
const rows=expected.map((x,i)=>({id:String(i+1),payload:{key:x.key,_kind:'xy_promo_source_snapshot',
 package_fingerprint:XY_PROMO_PLAN_FINGERPRINT,run_id:'run-a',snapshot:x.object}}));
test('all staged source bytes must survive receipt, payload and run verification',async()=>{
 const client={query:async()=>({rows})};await verifyXyStagedSnapshots(client,receipt,expected);
 await assert.rejects(()=>verifyXyStagedSnapshots({query:async()=>({rows:rows.slice(1)})},receipt,expected),/MISSING/);
 const drift=structuredClone(rows);drift[0].payload.snapshot.body_base64='changed';
 await assert.rejects(()=>verifyXyStagedSnapshots({query:async()=>({rows:drift})},receipt,expected),/DRIFT/);
 const wrong=structuredClone(rows);wrong[0].payload.run_id='other';
 await assert.rejects(()=>verifyXyStagedSnapshots({query:async()=>({rows:wrong})},receipt,expected),/DRIFT/);
 const duplicate=structuredClone(receipt);duplicate.payload.source_receipts[1].id='1';
 await assert.rejects(()=>verifyXyStagedSnapshots(client,duplicate,expected),/RECEIPT_MISMATCH/);
});
