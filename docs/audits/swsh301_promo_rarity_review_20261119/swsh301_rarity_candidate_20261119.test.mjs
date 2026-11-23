import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {evaluateSwsh301Candidate} from './swsh301_rarity_candidate_20261119.mjs';
const read=f=>fs.readFileSync(new URL(f,import.meta.url)),snapshot=JSON.parse(read('./swsh301-frozen-readback-v2-20261119.json'));
const evidence={representative:read('./swsh301-source-captures-20261119/representative.jpg'),representativeReceipt:JSON.parse(read('./swsh301-source-captures-20261119/representative-receipt.json')),
 product:read('./swsh301-source-captures-20261119/product.jpg'),productReceipt:JSON.parse(read('./swsh301-source-captures-20261119/product.jpg-receipt.json')),
 article:read('./swsh301-source-captures-20261119/article.html'),articleReceipt:JSON.parse(read('./swsh301-source-captures-20261119/article.html-receipt.json'))};
test('exact SWSH301 source review keeps representative image status and six traits',()=>{
 const r=evaluateSwsh301Candidate(snapshot,evidence);assert.equal(r.status,'review_candidate_only');assert.equal(r.retained_image_status,'representative_shared');assert.equal(r.protected_trait_ids.length,6);
});
test('identity, mapping ownership, image status, source sync and evidence bytes fail closed',()=>{
 const id=structuredClone(snapshot);id.identities[0].printed_number='SWSH301a';assert.equal(evaluateSwsh301Candidate(id,evidence).status,'identity_mismatch');
 const mapping=structuredClone(snapshot);mapping.mappings.find(m=>m.source==='tcgplayer').owners=2;assert.equal(evaluateSwsh301Candidate(mapping,evidence).status,'mapping_mismatch');
 const image=structuredClone(snapshot);image.parents[0].image_status='exact';assert.equal(evaluateSwsh301Candidate(image,evidence).status,'parent_mismatch');
 const run=structuredClone(snapshot);run.runs[0].status='running';assert.equal(evaluateSwsh301Candidate(run,evidence).status,'source_sync_incomplete');
 assert.equal(evaluateSwsh301Candidate(snapshot,{...evidence,representative:Buffer.from('changed')}).status,'image_mismatch');
});
