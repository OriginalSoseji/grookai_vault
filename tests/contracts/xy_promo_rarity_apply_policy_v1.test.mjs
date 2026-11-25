import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateXyPromoPlan,classifyXyPromoState} from '../../backend/catalog/xy_promo_rarity_apply_policy_v1.mjs';
const dir=new URL('../../docs/audits/xy_promo_rarity_review_20261118/',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir));
const plan=JSON.parse(read('xy-rarity-execution-plan.json'));
const evidence={snapshotBytes:read('xy-pair-postsync-readback.json'),preflightBytes:read('xy-review-preflight.json'),
 candidateBytes:read('xy-rarity-review-candidates.json'),visualBytes:read('xy-exact-image-review.json'),articles:{},images:{}};
for(const [n,s] of [['XY177','karen'],['XY198','camerupt']]){
 evidence.articles[n]={receipt:JSON.parse(read(`checklists/${s}-receipt.json`)),bytes:read(`checklists/${s}.html`)};
 evidence.images[n]={productReceipt:JSON.parse(read(`product_images/${n}-receipt.json`)),productBytes:read(`product_images/${n}.jpg`),
  catalogReceipt:JSON.parse(read(`catalog_images/${n}-receipt.json`)),catalogBytes:read(`catalog_images/${n}.webp`)};
}
test('exact reviewed package accepts only both protected before states',()=>{
 const {snapshot}=validateXyPromoPlan(plan,evidence);assert.equal(classifyXyPromoState(snapshot,snapshot.parents,false),'pending');
 const after=snapshot.parents.map(p=>({...p,rarity:'Promo'}));assert.equal(classifyXyPromoState(snapshot,after,true),'already_applied');
 assert.throws(()=>classifyXyPromoState(snapshot,after,false),/PARTIAL_OR_MISSING/);
 assert.throws(()=>classifyXyPromoState(snapshot,[after[0],snapshot.parents[1]],false),/PARTIAL_OR_MISSING/);
 assert.throws(()=>classifyXyPromoState(snapshot,[{...after[0],name:'wrong'},after[1]],true),/PARENT_DRIFT/);
});
test('evidence changes and package tampering fail closed',()=>{
 assert.throws(()=>validateXyPromoPlan({...plan,rows:plan.rows.slice(1)},evidence),/HASH_MISMATCH/);
 assert.throws(()=>validateXyPromoPlan(plan,{...evidence,snapshotBytes:Buffer.concat([evidence.snapshotBytes,Buffer.from(' ')])}),/HASH_MISMATCH/);
 const bad={...evidence,images:{...evidence.images,XY177:{...evidence.images.XY177,catalogBytes:Buffer.from('changed')}}};
 assert.throws(()=>validateXyPromoPlan(plan,bad),/REVIEW_MISMATCH/);
});
