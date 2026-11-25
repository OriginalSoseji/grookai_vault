import assert from 'node:assert/strict';
import admission from './governed_japanese_six_admission_provenance_v2.json' with {type:'json'};
import registry from './governed_japanese_six_numbered_single_registry_v1.json' with {type:'json'};
import {printingManifestHash as hash} from '../catalog/printing_completeness_gate_v1.mjs';
import {resolveGovernedJapaneseSixNumberedSingleV1} from './governed_japanese_six_numbered_single_v1.mjs';
const {fingerprint,...body}=admission;
assert.equal(fingerprint,'5589b029d3130c05b88c51460a1573880ccca1cb234005dea86caa86ba61a27b');assert.equal(hash(body),fingerprint);
assert.equal(admission.predecessor_registry_fingerprint,registry.fingerprint);
assert.equal(admission.predecessor_source_producer,registry.expected_source_producer);
const fields=['id','source','status','notes','payload'];
// Release-time evidence only. It never creates mappings, changes a runtime
// decision, clears a stamp hold or authorizes publication.
export function assertJapaneseSixAdmissionProvenanceV2({raw,candidates,now=Date.now()}={}) {
 assert.ok(raw&&typeof raw==='object');
 const projection=Object.fromEntries(fields.map(k=>[k,raw[k]]));
 assert.equal(hash(projection),admission.raw_projection_fingerprint,'Genuine approved V4 audit required');
 assert.equal(raw.payload.code_fingerprint,admission.actual_approved_source_producer);
 assert.equal(raw.payload.mappings.length,admission.mapping_count);
 assert.equal(raw.payload.source_sync_run_id,admission.source_sync_run_id);
 assert.equal(raw.payload.source_bundle_sha256,admission.source_bundle_sha256);
 assert.equal(candidates?.length,6);const products=new Set();
 for(const row of candidates){const proof=resolveGovernedJapaneseSixNumberedSingleV1(row,{now});assert.ok(proof,'Original six immutable physical/mapping guards required');assert.equal(row.source_sync_run_id,admission.source_sync_run_id);assert.equal(products.has(proof.product),false);products.add(proof.product);const mapped=raw.payload.mappings.filter(m=>m.id===proof.mapping);assert.equal(mapped.length,1);assert.deepEqual(mapped[0].meta,row.source_mapping_meta);assert.equal(mapped[0].card_printing_id,proof.printing);}
 assert.deepEqual([...products].sort((a,b)=>a-b),[...admission.products].sort((a,b)=>a-b));
 return{version:admission.version,admission:fingerprint,actualApprovedPlan:admission.actual_approved_plan,actualApprovedProducer:admission.actual_approved_source_producer,predecessorRegistry:registry.fingerprint,allSixOriginalImmutableGuardsPreserved:true,productionAuthority:false,publicationAuthority:false};
}
