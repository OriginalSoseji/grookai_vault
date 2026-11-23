// Freeze the single-record source and visual review. This script has no writer.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { evaluateXy150Candidate } from './xy150_candidate_policy_20261119.mjs';
const read = name => fs.readFileSync(new URL(name, import.meta.url));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const snapshotBytes = read('./xy150-frozen-readback-20261119.json');
const snapshot = JSON.parse(snapshotBytes);
const catalog = read('./xy-remaining-image-review-20261119/XY150.webp');
const product = read('./xy-remaining-image-review-20261119/XY150-product.jpg');
const article = read('./xy-remaining-checklists-20261119/XY150.html');
const receipt = JSON.parse(read('./xy-remaining-checklists-20261119/XY150-receipt.json'));
const review = evaluateXy150Candidate(snapshot, catalog, product, article, receipt);
assert.equal(review.status, 'review_candidate_only');
const body = { version:'XY150_PROMO_RARITY_PLAN_V1', status:'FROZEN_GUARDED_PACKAGE', target:'ycdxbpibncqcchqiihfz',
  scope:{ table:'card_prints', field:'rarity', count:1 }, snapshot_sha256:hash(snapshotBytes),
  article_sha256:hash(article), catalog_image_sha256:hash(catalog), product_image_sha256:hash(product),
  visual_observation:'Catalog image shows printed XY150 and PROMO star; mapped product image shows the same card design. Images are not physical-copy inspection and do not prove finish.',
  decision_basis:'Exact printed design and mapped TCGplayer and Pokémon API classifications support Promo for this record; retain the conflicting TCGdex trait. No general source-precedence rule.',
  changes:[{ id:review.card_print_id, gv_id:'GV-PK-PR-XY-XY150', before:'None', after:'Promo', identity_key_hash:review.identity_key_hash, protected_trait_id:review.tcgdex_trait_id }] };
const plan = { ...body, fingerprint_sha256:hash(JSON.stringify(body)) };
fs.writeFileSync(new URL('./xy150-execution-plan.json', import.meta.url), JSON.stringify(plan,null,2)+'\n', { flag:'wx' });
console.log(JSON.stringify({fingerprint_sha256:plan.fingerprint_sha256, candidate:review.status, rows:plan.changes.length}));
