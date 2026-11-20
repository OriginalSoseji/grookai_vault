import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {articleText,reviewXyPromoFamily} from '../../backend/pokemon/xy_promo_family_review_v1.mjs';
const dir=new URL('../../docs/audits/xy_promo_rarity_review_20261118/',import.meta.url);
const snapshot=JSON.parse(fs.readFileSync(new URL('xy-rarity-review-candidates.json',dir)));
test('review binds complete article bytes to exact candidate and never promotes rarity',()=>{
 for(const row of snapshot.rows){
  const slug=row.input.parent.number==='XY177'?'karen':'camerupt';
  const receipt=JSON.parse(fs.readFileSync(new URL(`checklists/${slug}-receipt.json`,dir)));
  const bytes=fs.readFileSync(new URL(`checklists/${slug}.html`,dir));
  const review=reviewXyPromoFamily(row.input,receipt,bytes);
  assert.equal(review.status,'family_corroborated_review_only');assert.equal(review.preserved_conflict.tcgdex_trait,'Common');
  assert.equal(review.preserved_conflict.pokemonapi,'Promo');
  assert.equal(reviewXyPromoFamily(row.input,receipt,Buffer.concat([bytes,Buffer.from(' ')])).status,'checklist_receipt_mismatch');
  assert.notEqual(reviewXyPromoFamily({...row.input,parent:{...row.input.parent,number:'XY177a'}},receipt,bytes).status,'family_corroborated_review_only');
 }
});
test('article text excludes script and style contents with valid spaced closing tags',()=>{
 const text=articleText('<p>Visible</p><script>hidden script</script ><style>hidden style</style ><p>End</p>');
 assert.match(text,/Visible/);assert.match(text,/End/);assert.doesNotMatch(text,/hidden/);
});
