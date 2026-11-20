// Record two exact source-supported decisions; this file never connects to a database.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {evaluateReviewedXyPromo} from '../../../backend/pokemon/xy_promo_visual_policy_v1.mjs';
const dir=new URL('./',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceBytes=read('xy-pair-postsync-readback.json'),preflightBytes=read('xy-review-preflight.json'),reviewBytes=read('xy-exact-image-review.json');
const candidates=JSON.parse(read('xy-rarity-review-candidates.json')),preflight=JSON.parse(preflightBytes),visual=JSON.parse(reviewBytes);
assert.equal(preflight.status,'review_only_preflight_passed');assert.equal(preflight.snapshot_sha256,sha(sourceBytes));
assert.equal(candidates.count,2);assert.equal(candidates.source_readback_sha256,sha(sourceBytes));
const rows=[];
for(const row of candidates.rows){
 const p=row.input.parent,n=p.number,slug=n==='XY177'?'karen':'camerupt';
 const article={receipt:JSON.parse(read(`checklists/${slug}-receipt.json`)),bytes:read(`checklists/${slug}.html`)};
 const images={productReceipt:JSON.parse(read(`product_images/${n}-receipt.json`)),productBytes:read(`product_images/${n}.jpg`),
  catalogReceipt:JSON.parse(read(`catalog_images/${n}-receipt.json`)),catalogBytes:read(`catalog_images/${n}.webp`)};
 const decision=evaluateReviewedXyPromo(row.input,article,images,visual);assert.equal(decision.status,'record_scoped_review_candidate');
 rows.push({id:p.id,gv_id:p.gv_id,number:n,before:p.rarity,proposed:'Promo',identity_key_hash:decision.identity_key_hash,
  source_raw_ids:[row.decision.pokemonapi_raw_id,row.decision.tcgdex_raw_id],source_product_id:row.decision.source_product_id,
  protected_trait_ids:row.decision.trait_ids,review:decision});
}
const report={version:'XY_PROMO_RARITY_RECORD_REVIEW_V1',status:'REVIEWED_NONEXECUTABLE',target:'ycdxbpibncqcchqiihfz',
 source_snapshot_sha256:sha(sourceBytes),preflight_sha256:sha(preflightBytes),visual_review_sha256:sha(reviewBytes),
 scope:{count:2,table:'card_prints',field:'rarity'},decision_basis:'Exact source payloads and mapped images show Promo-star identities; preserve differing TCGdex source traits. No global rarity rule.',
 no_writer:true,rows};report.fingerprint_sha256=sha(JSON.stringify(report));
fs.writeFileSync(new URL('xy-rarity-visual-review.json',dir),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,count:rows.length,fingerprint_sha256:report.fingerprint_sha256}));
