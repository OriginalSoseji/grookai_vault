// Freeze one reviewed rarity correction; this preparatory script has no writer.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {evaluateSwsh301Candidate} from './swsh301_rarity_candidate_20261119.mjs';
const read=f=>fs.readFileSync(new URL(f,import.meta.url)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const snapshotBytes=read('./swsh301-frozen-readback-v2-20261119.json'),snapshot=JSON.parse(snapshotBytes);
const evidence={representative:read('./swsh301-source-captures-20261119/representative.jpg'),representativeReceipt:JSON.parse(read('./swsh301-source-captures-20261119/representative-receipt.json')),
 product:read('./swsh301-source-captures-20261119/product.jpg'),productReceipt:JSON.parse(read('./swsh301-source-captures-20261119/product.jpg-receipt.json')),
 article:read('./swsh301-source-captures-20261119/article.html'),articleReceipt:JSON.parse(read('./swsh301-source-captures-20261119/article.html-receipt.json'))};
const candidate=evaluateSwsh301Candidate(snapshot,evidence);assert.equal(candidate.status,'review_candidate_only');
const body={version:'SWSH301_PROMO_RARITY_PLAN_V1',status:'FROZEN_GUARDED_PACKAGE',target:'ycdxbpibncqcchqiihfz',
 scope:{table:'card_prints',field:'rarity',count:1},snapshot_sha256:hash(snapshotBytes),representative_image_sha256:hash(evidence.representative),
 product_image_sha256:hash(evidence.product),article_sha256:hash(evidence.article),
 visual_observation:'The existing representative card-design image shows SWSH301 and PROMO star and matches the mapped product image. Representative image status stays unchanged; no physical copy or finish is asserted.',
 decision_basis:'Exact mapped source product says Promo and the captured published checklist corroborates SWSH301 and matching illustrator; preserve all TCGdex traits and do not generalize source precedence.',
 changes:[{id:candidate.id,gv_id:candidate.gv_id,before:'None',after:'Promo',identity_key_hash:candidate.identity_key_hash,protected_trait_ids:candidate.protected_trait_ids,product_id:candidate.product_id,retained_image_status:candidate.retained_image_status}]};
const plan={...body,fingerprint_sha256:hash(JSON.stringify(body))};
fs.writeFileSync(new URL('./swsh301-execution-plan-20261119.json',import.meta.url),JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:plan.status,fingerprint_sha256:plan.fingerprint_sha256,count:plan.changes.length}));
