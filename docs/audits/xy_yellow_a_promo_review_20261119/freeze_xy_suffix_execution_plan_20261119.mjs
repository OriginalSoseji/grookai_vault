// Freeze exact reviewed rarity preimages; this preparatory script has no writer.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {evaluateXySuffixCandidate} from './xy_suffix_rarity_candidate_20261119.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const snapshotBytes=read('./xy-suffix-rarity-frozen-20261119.json'),snapshot=JSON.parse(snapshotBytes);
const prior=JSON.parse(read('./xy-suffix-rarity-review-packet-20261119.json'));
const {fingerprint_sha256,...reviewBody}=prior;
assert.equal(prior.status,'REVIEW_ONLY_NO_WRITER');assert.equal(hash(JSON.stringify(reviewBody)),fingerprint_sha256);
assert.equal(prior.snapshot_sha256,hash(snapshotBytes));assert.equal(prior.records.length,2);
const rows=[];
for(const number of ['XY200a','XY67a']){
 const catalog=read(`./xy-remaining-image-review-20261119/${number}.webp`),product=read(`./xy-remaining-image-review-20261119/${number}-product.jpg`),
  article=read(`./xy-remaining-checklists-20261119/${number}.html`),articleReceipt=JSON.parse(read(`./xy-remaining-checklists-20261119/${number}-receipt.json`));
 const candidate=evaluateXySuffixCandidate(snapshot,number,{catalog,product,article,articleReceipt}),priorRecord=prior.records.find(r=>r.number===number);
 assert.equal(candidate.status,'review_candidate_only');
 for(const [key,value] of Object.entries(candidate))assert.deepEqual(priorRecord?.[key],value);
 assert.equal(priorRecord.catalog_image_sha256,hash(catalog));assert.equal(priorRecord.product_image_sha256,hash(product));assert.equal(priorRecord.article_sha256,hash(article));
 rows.push({id:candidate.id,gv_id:candidate.gv_id,number,before:'Common',after:'Promo',identity_key_hash:candidate.identity_key_hash,
  protected_trait_id:candidate.protected_trait_id,unmapped_product_id:candidate.unmapped_product_id,
  catalog_image_sha256:hash(catalog),product_image_sha256:hash(product),article_sha256:hash(article)});
}
assert.equal(new Set(rows.map(r=>r.id)).size,2);
const body={version:'XY_SUFFIX_RARITY_EXECUTION_PLAN_V1',status:'FROZEN_GUARDED_PACKAGE',target:'ycdxbpibncqcchqiihfz',
 scope:{table:'card_prints',field:'rarity',count:2},snapshot_sha256:hash(snapshotBytes),review_fingerprint:fingerprint_sha256,rows,
 decision_basis:'Printed PROMO stars on exact Yellow A designs, matching unowned provider product images and explicit provider rarity, alongside Pokémon API; preserve TCGdex traits and all mappings. No physical-copy or finish claim.'};
const plan={...body,fingerprint_sha256:hash(JSON.stringify(body))};
fs.writeFileSync(new URL('./xy-suffix-rarity-execution-plan-20261119.json',import.meta.url),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:plan.status,rows:plan.rows.length,fingerprint_sha256:plan.fingerprint_sha256}));
