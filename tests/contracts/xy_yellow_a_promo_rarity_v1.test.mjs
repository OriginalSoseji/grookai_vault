import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {captureYellowASourceProof} from '../../backend/catalog/xy_yellow_a_promo_source_proof_v1.mjs';
import {runYellowAPromoRarity,verifyYellowASnapshots} from '../../backend/catalog/xy_yellow_a_promo_rarity_apply_v1.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../docs/audits/xy_yellow_a_promo_review_20261119'),read=f=>fs.readFileSync(path.join(dir,f));
const frozen=JSON.parse(read('xy-suffix-rarity-frozen-20261119.json')),evidence={};
for(const n of ['XY200a','XY67a'])evidence[n]={catalog:read(`xy-remaining-image-review-20261119/${n}.webp`),product:read(`xy-remaining-image-review-20261119/${n}-product.jpg`),
 article:read(`xy-remaining-checklists-20261119/${n}.html`),articleReceipt:JSON.parse(read(`xy-remaining-checklists-20261119/${n}-receipt.json`))};
function fake(data){return {query:async sql=>{
 if(sql.includes('from public.sets s'))return {rows:data.sets.map(row=>({row}))};
 if(sql.includes('from public.card_print_identity'))return {rows:data.identities.map(row=>({row}))};
 if(sql.includes('from public.card_print_traits'))return {rows:data.traits.map(row=>({row}))};
 if(sql.includes('with a as'))return {rows:data.mappings.map(row=>({row}))};
 if(sql.includes('from public.raw_imports'))return {rows:data.raw};
 if(sql.includes('from public.tcgcsv_source_products p'))return {rows:data.products};
 if(sql.includes('from public.tcgcsv_source_groups g'))return {rows:data.groups};
 if(sql.includes('from public.tcgcsv_source_sync_runs'))return {rows:data.runs};
 throw Error('unexpected query');
}};}
test('source proof holds when a provider product acquires an owner or a source changes',async()=>{
 const proof=await captureYellowASourceProof(fake(frozen),frozen,evidence);assert.equal(proof.reviews.length,2);
 const mapped=structuredClone(frozen);mapped.products[0].active_mappings.push({id:'unexpected'});
 await assert.rejects(captureYellowASourceProof(fake(mapped),frozen,evidence),/PRODUCTS_DRIFT/);
 const changed=structuredClone(frozen);changed.mappings[0].owners=2;
 await assert.rejects(captureYellowASourceProof(fake(changed),frozen,evidence),/MAPPINGS_DRIFT/);
});
test('mutating modes require explicit execution marker before reading configuration',async()=>{
 await assert.rejects(runYellowAPromoRarity({mode:'apply'}),/PROCEED_REQUIRED/);
 await assert.rejects(runYellowAPromoRarity({mode:'rollback-proof'}),/PROCEED_REQUIRED/);
});
test('all nine source snapshots must match their receipt, package, and run',async()=>{
 const plan='6d6277151ca1384f6bcd3bb9d607f8a348e85b892aaa752dfeb74a56f5aa19e5';
 const expected=Array.from({length:9},(_,i)=>({key:`k${i}`,object:{value:i}})),refs=expected.map((r,i)=>({id:String(i+1),key:r.key}));
 const receipt={payload:{run_id:'run',source_receipts:refs}},records=expected.map((r,i)=>({id:String(i+1),payload:{_kind:'xy_yellow_a_source_snapshot',package_fingerprint:plan,run_id:'run',key:r.key,snapshot:r.object}}));
 const db={query:async()=>({rows:records})};await verifyYellowASnapshots(db,receipt,expected);
 records[0].payload.snapshot={value:99};await assert.rejects(verifyYellowASnapshots(db,receipt,expected),/SNAPSHOT_DRIFT/);
 records[0].payload.snapshot=expected[0].object;records.pop();await assert.rejects(verifyYellowASnapshots(db,receipt,expected),/SNAPSHOTS_MISSING/);
});
