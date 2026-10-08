import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyMtgReleasedCoverageV1,assertMtgReleasedCoverageV1,MTG_RELEASED_COVERAGE_SHA,mtgCoverageRowsDigestV1,captureMtgReleasedCoverageV1} from '../../backend/pricing/mtg_released_coverage_v1.mjs';
import {buildMtgCatalogExecutionOrderV1} from '../../scripts/audits/mtg_canonical_catalog_ingestion_envelope_v1.mjs';
const coverage=JSON.parse(fs.readFileSync(new URL('../../docs/truth/mtg/reality_fracture_supervisor_coverage_20261007.json',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(new URL('../../docs/audits/pricing/mtg_canonical_catalog_batch_manifest_v1/2026-08-13T22-10-07Z/manifest.json',import.meta.url)));
const order=buildMtgCatalogExecutionOrderV1(manifest),evidence={version:'MTG_RELEASED_COVERAGE_V1',sha256:MTG_RELEASED_COVERAGE_SHA,exact:true,held_absent:10,unpriced_parents:7};
test('reviewed coverage adjusts only two specific source sets',()=>{
 const result=applyMtgReleasedCoverageV1(order,coverage,evidence,'2026-10-08','public');
 assert.equal(result.length,order.length);
 for(let i=0;i<order.length;i++)if(!['fra','frc'].includes(order[i].code))assert.deepEqual(result[i],order[i]);
 assert.equal(result.find(b=>b.code==='fra').candidate_count,452);assert.equal(result.find(b=>b.code==='frc').card_printings,105);
});
test('hold expiry, early use and tampered counts never relax completeness',()=>{
 for(const date of ['2026-10-06','2026-10-23','2026-10-24'])assert.throws(()=>assertMtgReleasedCoverageV1(coverage,date));
 const changed=structuredClone(coverage);changed.sets[0].row_counts.card_prints--;assert.throws(()=>assertMtgReleasedCoverageV1(changed,'2026-10-08'));
});
test('missing or substituted identity proof and hidden release cannot use coverage',()=>{
 for(const proof of [null,{...evidence,exact:false},{...evidence,held_absent:9},{...evidence,sha256:'a'.repeat(64)}])assert.throws(()=>applyMtgReleasedCoverageV1(order,coverage,proof,'2026-10-08','public'));
 assert.throws(()=>applyMtgReleasedCoverageV1(order,coverage,evidence,'2026-10-08','hidden'));
 const wrong=order.map(b=>b.code==='fra'?{...b,source_set_id:'another'}:b);assert.throws(()=>applyMtgReleasedCoverageV1(wrong,coverage,evidence,'2026-10-08','public'));
});
test('row digests ignore row/key ordering but retain identity/finish differences',()=>{
 const a=[{id:'a',finish:'foil'},{id:'b',finish:'normal'}];
 assert.equal(mtgCoverageRowsDigestV1(a),mtgCoverageRowsDigestV1([{finish:'normal',id:'b'},{finish:'foil',id:'a'}]));
 assert.notEqual(mtgCoverageRowsDigestV1(a),mtgCoverageRowsDigestV1([{id:'a',finish:'normal'},a[1]]));
});
test('coverage readback rejects writable transactions before accessing catalog',async()=>{
 let calls=0;await assert.rejects(()=>captureMtgReleasedCoverageV1({query:async()=>{calls++;return {rows:[{transaction_read_only:'off'}]}}},coverage,'2026-10-08'));assert.equal(calls,1);
});
