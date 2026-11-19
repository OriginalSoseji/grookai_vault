import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { captureXy150SourceProof } from '../../backend/catalog/xy150_promo_source_proof_v1.mjs';
import { runXy150PromoRarity, verifyXy150Snapshots } from '../../backend/catalog/xy150_promo_rarity_apply_v1.mjs';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../docs/audits/xy150_promo_review_20261119');
const read = name => fs.readFileSync(path.join(dir,name));
const frozen = JSON.parse(read('xy150-frozen-readback-20261119.json'));
const evidence = {catalog:read('xy-remaining-image-review-20261119/XY150.webp'),product:read('xy-remaining-image-review-20261119/XY150-product.jpg'),
  article:read('xy-remaining-checklists-20261119/XY150.html'),articleReceipt:JSON.parse(read('xy-remaining-checklists-20261119/XY150-receipt.json'))};
function fakeSource(data) { return { query:async sql => {
  if (sql.includes('from public.sets s')) return {rows:data.sets.map(row=>({row}))};
  if (sql.includes('from public.card_print_identity')) return {rows:data.identities.map(row=>({row}))};
  if (sql.includes('from public.card_print_traits')) return {rows:data.traits.map(row=>({row}))};
  if (sql.includes('with a as')) return {rows:data.mappings.map(row=>({row}))};
  if (sql.includes('from public.raw_imports')) return {rows:data.raw};
  if (sql.includes('from public.tcgcsv_source_products product')) return {rows:data.groupSets};
  if (sql.includes('from public.tcgcsv_source_products p')) return {rows:data.products};
  if (sql.includes('from public.tcgcsv_source_groups g')) return {rows:data.groups};
  if (sql.includes('from public.tcgcsv_source_sync_runs')) return {rows:data.runs};
  throw Error('unexpected query');
} }; }
test('frozen source proof rejects changed source rows and incomplete sync', async()=>{
  const proof=await captureXy150SourceProof(fakeSource(frozen),frozen,evidence);
  assert.equal(proof.review.status,'review_candidate_only');
  const changed=structuredClone(frozen);changed.mappings[0].owners=2;
  await assert.rejects(captureXy150SourceProof(fakeSource(changed),frozen,evidence),/MAPPINGS_DRIFT/);
  const running=structuredClone(frozen);running.runs[0].status='running';
  await assert.rejects(captureXy150SourceProof(fakeSource(running),frozen,evidence),/RUNS_DRIFT/);
});
test('mutation modes require explicit execution marker before reading configuration',async()=>{
  await assert.rejects(runXy150PromoRarity({mode:'apply'}),/PROCEED_REQUIRED/);
  await assert.rejects(runXy150PromoRarity({mode:'rollback-proof'}),/PROCEED_REQUIRED/);
});
test('all five staged evidence snapshots are bound to their receipt and run',async()=>{
  const plan='328b9ad74f4822494f90a962421c6f47c1321e1c7ffa67f8c86c78355405f3f8';
  const expected=Array.from({length:5},(_,i)=>({key:`k${i}`,object:{value:i}}));
  const refs=expected.map((r,i)=>({id:String(i+1),key:r.key}));
  const receipt={payload:{run_id:'run',source_receipts:refs}};
  const records=expected.map((r,i)=>({id:String(i+1),payload:{_kind:'xy150_promo_source_snapshot',package_fingerprint:plan,run_id:'run',key:r.key,snapshot:r.object}}));
  const db={query:async()=>({rows:records})};
  await verifyXy150Snapshots(db,receipt,expected);
  records[0].payload.snapshot={value:99};await assert.rejects(verifyXy150Snapshots(db,receipt,expected),/SNAPSHOT_DRIFT/);
  records[0].payload.snapshot=expected[0].object;records.pop();await assert.rejects(verifyXy150Snapshots(db,receipt,expected),/SNAPSHOTS_MISSING/);
});
