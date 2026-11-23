import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {captureSwsh301SourceProof} from '../../backend/catalog/swsh301_promo_source_proof_v1.mjs';
import {runSwsh301PromoRarity,verifySwsh301Snapshots} from '../../backend/catalog/swsh301_promo_rarity_apply_v1.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../docs/audits/swsh301_promo_rarity_review_20261119'),read=f=>fs.readFileSync(path.join(dir,f));
const frozen=JSON.parse(read('swsh301-frozen-readback-v2-20261119.json'));
const evidence={representative:read('swsh301-source-captures-20261119/representative.jpg'),representativeReceipt:JSON.parse(read('swsh301-source-captures-20261119/representative-receipt.json')),
 product:read('swsh301-source-captures-20261119/product.jpg'),productReceipt:JSON.parse(read('swsh301-source-captures-20261119/product.jpg-receipt.json')),
 article:read('swsh301-source-captures-20261119/article.html'),articleReceipt:JSON.parse(read('swsh301-source-captures-20261119/article.html-receipt.json'))};
function fake(data){return {query:async sql=>{
 if(sql.includes('from public.sets s'))return {rows:data.sets.map(row=>({row}))};
 if(sql.includes('from public.card_print_identity'))return {rows:data.identities.map(row=>({row}))};
 if(sql.includes('from public.card_print_traits'))return {rows:data.traits.map(row=>({row}))};
 if(sql.includes('from public.card_printings'))return {rows:data.printings.map(row=>({row}))};
 if(sql.includes('with a as'))return {rows:data.mappings.map(row=>({row}))};
 if(sql.includes('from public.raw_imports'))return {rows:data.raw};
 if(sql.includes('from public.tcgcsv_source_products product'))return {rows:data.groupSets};
 if(sql.includes('from public.tcgcsv_source_products p'))return {rows:data.products};
 if(sql.includes('from public.tcgcsv_source_groups g'))return {rows:data.groups};
 if(sql.includes('from public.tcgcsv_source_sync_runs'))return {rows:data.runs};
 throw Error('unexpected query');
}};}
test('source proof preserves representative image and rejects source or printing drift',async()=>{
 const proof=await captureSwsh301SourceProof(fake(frozen),frozen,evidence);assert.equal(proof.review.retained_image_status,'representative_shared');
 const changed=structuredClone(frozen);changed.mappings[0].owners=2;await assert.rejects(captureSwsh301SourceProof(fake(changed),frozen,evidence),/MAPPINGS_DRIFT/);
 const printing=structuredClone(frozen);printing.printings[0].image_status='exact';await assert.rejects(captureSwsh301SourceProof(fake(printing),frozen,evidence),/PRINTINGS_DRIFT/);
});
test('mutating modes require explicit execution marker before reading configuration',async()=>{
 await assert.rejects(runSwsh301PromoRarity({mode:'apply'}),/PROCEED_REQUIRED/);
 await assert.rejects(runSwsh301PromoRarity({mode:'rollback-proof'}),/PROCEED_REQUIRED/);
});
test('all five source snapshots must match receipt, package and run',async()=>{
 const plan='c9c72df261c1a075afc27368df068282a8f491d0ca7e0a3d929946980b85bd31';
 const expected=Array.from({length:5},(_,i)=>({key:`k${i}`,object:{value:i}})),refs=expected.map((r,i)=>({id:String(i+1),key:r.key}));
 const receipt={payload:{run_id:'run',source_receipts:refs}},records=expected.map((r,i)=>({id:String(i+1),payload:{_kind:'swsh301_promo_source_snapshot',package_fingerprint:plan,run_id:'run',key:r.key,snapshot:r.object}}));
 const db={query:async()=>({rows:records})};await verifySwsh301Snapshots(db,receipt,expected);
 records[0].payload.snapshot={value:99};await assert.rejects(verifySwsh301Snapshots(db,receipt,expected),/SNAPSHOT_DRIFT/);
 records[0].payload.snapshot=expected[0].object;records.pop();await assert.rejects(verifySwsh301Snapshots(db,receipt,expected),/SNAPSHOTS_MISSING/);
});
