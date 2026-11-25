import test from 'node:test';import assert from 'node:assert/strict';import fs from'node:fs';import{gunzipSync}from'node:zlib';
import{assertJapaneseSixAdmissionProvenanceV2 as verify}from'../../backend/pricing/governed_japanese_six_admission_provenance_v2.mjs';
import{evaluateTcgplayerMarketQualificationV3_3 as evaluate}from'../../backend/pricing/tcgplayer_market_publication_policy_v3_3.mjs';
const raw=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../docs/catalog/governed_japanese_six_admission_provenance_v2/actual-public-audit-fixture.json.gz',import.meta.url))));
const candidates=JSON.parse(gunzipSync(fs.readFileSync(new URL('../../docs/catalog/governed_japanese_six_numbered_single_v1/candidates.local.public.json.gz',import.meta.url))));
for(const row of candidates)row.source_mapping_meta=structuredClone(raw.payload.mappings.find(m=>m.id===row.cross_tcg_printing_mapping_id).meta);
const now=new Date(Math.max(...candidates.map(r=>Date.parse(r.source_mapping_meta.reviewed_at)))+60000);
test('approved actual audit admits the same six original metadata projections without changing prices or runtime decisions',()=>{const before=structuredClone({raw,candidates}),result=verify({raw,candidates,now});assert.equal(result.actualApprovedProducer,'f79fd32f54a00385477845cfaf4a5a8cd5f77a2e621891fbe9dbcc6026011ce4');assert.equal(result.actualApprovedPlan,'1ad34e30ef9437b96e5a74378500d3e85b55a31126e6ae2f5188580c9b722643');assert.equal(result.allSixOriginalImmutableGuardsPreserved,true);assert.equal(result.productionAuthority,false);assert.equal(result.publicationAuthority,false);for(const row of candidates)assert.equal(evaluate(row,{now}).decision,'publish');assert.deepEqual({raw,candidates},before);});
for(const[label,mutate]of[
 ['earlier producer',r=>r.payload.code_fingerprint='b1867d795a72229c1b1cd19bc4c0391e8bb32d9bdc58775b65e9c7b66d2a2a7e'],
 ['unknown producer',r=>r.payload.code_fingerprint='0'.repeat(64)],
 ['different source',r=>r.payload.source_sync_run_id='00000000-0000-4000-8000-000000000001'],
 ['different source bundle',r=>r.payload.source_bundle_sha256='0'.repeat(64)],
 ['partial audit',r=>r.payload.mappings.pop()],
 ['unrelated mapping changed',r=>r.payload.mappings[0].card_printing_id='00000000-0000-4000-8000-000000000001'],
 ['changed boundaries',r=>r.payload.boundaries.owner_writes=1],
 ['different private receipt',r=>r.id='-1'],
 ['old audit timestamp',r=>r.payload.mappings[0].meta.reviewed_at='2000-01-01T00:00:00.000Z']
])test('rejects '+label,()=>{const changed=structuredClone(raw);mutate(changed);assert.throws(()=>verify({raw:changed,candidates,now}));});
test('actual six candidate scope and metadata remain mandatory',()=>{assert.throws(()=>verify({raw,candidates:candidates.slice(1),now}));const duplicate=structuredClone(candidates);duplicate[1]=duplicate[0];assert.throws(()=>verify({raw,candidates:duplicate,now}));const changed=structuredClone(candidates);changed[0].source_mapping_meta.reviewed_at=new Date(now.getTime()-1).toISOString();assert.throws(()=>verify({raw,candidates:changed,now}));const foreign=structuredClone(candidates);foreign[0].source_sync_run_id='00000000-0000-4000-8000-000000000001';assert.throws(()=>verify({raw,candidates:foreign,now}));});
test('provenance acceptance never substitutes for source freshness or real quotes',()=>{for(const row of candidates){const stale=new Date(Date.parse(row.source_sync_finished_at)+36*3600000+1);assert.notEqual(evaluate(row,{now:stale}).decision,'publish');for(const market_price of[null,0,-1])assert.notEqual(evaluate({...row,market_price},{now}).decision,'publish');}});
