// Freeze a new, exact two-record correction package; no database access.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {evaluateReviewedXyPromo} from '../../../backend/pokemon/xy_promo_visual_policy_v1.mjs';
const dir=new URL('./',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const reviewBytes=read('xy-rarity-visual-review.json'),review=JSON.parse(reviewBytes),{fingerprint_sha256,...body}=review;
assert.equal(review.status,'REVIEWED_NONEXECUTABLE');assert.equal(sha(JSON.stringify(body)),fingerprint_sha256);
assert.equal(fingerprint_sha256,'4fb9d460f93df2c553b1ad3d7ddbcb8dc8a343bb3ab661f3e6c932b4b0298b0a');
const candidatesBytes=read('xy-rarity-review-candidates.json'),candidates=JSON.parse(candidatesBytes),visual=JSON.parse(read('xy-exact-image-review.json'));
assert.equal(review.rows.length,2);assert.equal(candidates.rows.length,2);
for(let i=0;i<2;i++){
 const input=candidates.rows[i].input,p=input.parent,n=p.number,slug=n==='XY177'?'karen':'camerupt';
 const article={receipt:JSON.parse(read(`checklists/${slug}-receipt.json`)),bytes:read(`checklists/${slug}.html`)};
 const images={productReceipt:JSON.parse(read(`product_images/${n}-receipt.json`)),productBytes:read(`product_images/${n}.jpg`),
  catalogReceipt:JSON.parse(read(`catalog_images/${n}-receipt.json`)),catalogBytes:read(`catalog_images/${n}.webp`)};
 assert.deepEqual(evaluateReviewedXyPromo(input,article,images,visual),review.rows[i].review);
}
const plan={...body,version:'XY_PROMO_RARITY_EXECUTION_PLAN_V1',status:'FROZEN_GUARDED_PACKAGE',no_writer:false,
 source_review_fingerprint:fingerprint_sha256,candidate_sha256:sha(candidatesBytes),
 authorization:'User provided PROCEED for catalog cleanup and asked to complete without micro approvals.',
 outstanding:'Fresh locked source and identity readback, a same-writer rollback proof, raw-first staging, protected-state proofs, and durable readback are required.'};
plan.fingerprint_sha256=sha(JSON.stringify(plan));
fs.writeFileSync(new URL('xy-rarity-execution-plan.json',dir),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:plan.status,count:plan.rows.length,fingerprint_sha256:plan.fingerprint_sha256}));
