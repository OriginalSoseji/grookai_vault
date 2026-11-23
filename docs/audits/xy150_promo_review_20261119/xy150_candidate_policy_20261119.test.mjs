import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluateXy150Candidate } from './xy150_candidate_policy_20261119.mjs';
const snapshot = JSON.parse(fs.readFileSync(new URL('./xy150-frozen-readback-20261119.json', import.meta.url)));
const catalog = fs.readFileSync(new URL('./xy-remaining-image-review-20261119/XY150.webp', import.meta.url));
const product = fs.readFileSync(new URL('./xy-remaining-image-review-20261119/XY150-product.jpg', import.meta.url));
const article = fs.readFileSync(new URL('./xy-remaining-checklists-20261119/XY150.html', import.meta.url));
const receipt = JSON.parse(fs.readFileSync(new URL('./xy-remaining-checklists-20261119/XY150-receipt.json', import.meta.url)));
test('exact XY150 evidence remains a review candidate only', () => {
  const result = evaluateXy150Candidate(snapshot, catalog, product, article, receipt);
  assert.equal(result.status, 'review_candidate_only');
  assert.equal(result.before, 'None'); assert.equal(result.proposed, 'Promo');
  assert.equal(result.tcgdex_trait_id, 39385);
});
test('identity, provider ownership, incomplete sync and image drift fail closed', () => {
  const identity = structuredClone(snapshot); identity.identities[0].printed_number = 'XY150a';
  assert.equal(evaluateXy150Candidate(identity, catalog, product, article, receipt).status, 'identity_mismatch');
  const owners = structuredClone(snapshot); owners.mappings.find(m => m.source === 'tcgplayer').owners = 2;
  assert.equal(evaluateXy150Candidate(owners, catalog, product, article, receipt).status, 'mapping_mismatch');
  const sync = structuredClone(snapshot); sync.runs[0].status = 'running';
  assert.equal(evaluateXy150Candidate(sync, catalog, product, article, receipt).status, 'source_sync_incomplete');
  assert.equal(evaluateXy150Candidate(snapshot, Buffer.from('altered'), product, article, receipt).status, 'image_mismatch');
  assert.equal(evaluateXy150Candidate(snapshot, catalog, product, Buffer.from('altered'), receipt).status, 'checklist_mismatch');
});
