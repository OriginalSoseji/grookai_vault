import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateXySuffixCandidate} from './xy_suffix_rarity_candidate_20261119.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url));
const snapshot=JSON.parse(read('./xy-suffix-rarity-frozen-20261119.json'));
for(const number of ['XY200a','XY67a']){
 const evidence={catalog:read(`./xy-remaining-image-review-20261119/${number}.webp`),product:read(`./xy-remaining-image-review-20261119/${number}-product.jpg`),
  article:read(`./xy-remaining-checklists-20261119/${number}.html`),articleReceipt:JSON.parse(read(`./xy-remaining-checklists-20261119/${number}-receipt.json`))};
 test(`${number} exact Yellow A record is review-only and retains its source trait`,()=>{
  const result=evaluateXySuffixCandidate(snapshot,number,evidence);
  assert.equal(result.status,'review_candidate_only');assert.equal(result.before,'Common');assert.equal(result.proposed,'Promo');
 });
 test(`${number} refuses substituted identity, mapped product and image bytes`,()=>{
  const changed=structuredClone(snapshot);changed.identities.find(x=>x.printed_number===number).printed_number=number.slice(0,-1);
  assert.equal(evaluateXySuffixCandidate(changed,number,evidence).status,'identity_mismatch');
  const mapped=structuredClone(snapshot);const id=number==='XY200a'?148346:148343;
  mapped.products.find(x=>x.row.product_id===id).active_mappings.push({id:'unexpected'});
  assert.equal(evaluateXySuffixCandidate(mapped,number,evidence).status,'product_mismatch');
  assert.equal(evaluateXySuffixCandidate(snapshot,number,{...evidence,catalog:Buffer.from('changed')}).status,'image_mismatch');
 });
}
