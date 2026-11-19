import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {evaluateReviewedXyPromo} from '../../backend/pokemon/xy_promo_visual_policy_v1.mjs';
const dir=new URL('../../docs/audits/xy_promo_rarity_review_20261118/',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir));
const candidates=JSON.parse(read('xy-rarity-review-candidates.json')),visual=JSON.parse(read('xy-exact-image-review.json'));
for(const row of candidates.rows){
 const number=row.input.parent.number,slug=number==='XY177'?'karen':'camerupt';
 const article={receipt:JSON.parse(read(`checklists/${slug}-receipt.json`)),bytes:read(`checklists/${slug}.html`)};
 const images={productReceipt:JSON.parse(read(`product_images/${number}-receipt.json`)),productBytes:read(`product_images/${number}.jpg`),
  catalogReceipt:JSON.parse(read(`catalog_images/${number}-receipt.json`)),catalogBytes:read(`catalog_images/${number}.webp`)};
 test(`${number} reviewed source decision preserves conflicting traits and rejects image changes`,()=>{
  const decision=evaluateReviewedXyPromo(row.input,article,images,visual);
  assert.equal(decision.status,'record_scoped_review_candidate');assert.equal(decision.tcgdex_trait_preserved,true);
  assert.equal(evaluateReviewedXyPromo(row.input,article,{...images,catalogBytes:Buffer.concat([images.catalogBytes,Buffer.from('x')])},visual).status,'visual_review_mismatch');
  assert.notEqual(evaluateReviewedXyPromo({...row.input,traits:[]},article,images,visual).status,'record_scoped_review_candidate');
 });
}
