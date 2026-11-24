// Closed positive-finish subset. This is not the V1 complete-family manifest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {MANIFEST as heldManifest} from './stamp_identity_admission_hold_v1.mjs';

export const AUTHORITY_VERSION='RETAIL_COSMOS_FINISH_SUBSET_AUTHORITY_V1';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const indexBytes=fs.readFileSync(new URL('../../docs/catalog/retail_stamp_cosmos_four_v2/index.json',import.meta.url));
assert.equal(sha(indexBytes),'885dbf127e53a339607186dd89be3f9d6711b14b3f1661253231dddd1bd8b7f4','Closed Cosmos source index changed');
const index=JSON.parse(indexBytes);
assert.equal(index.authorityModel,AUTHORITY_VERSION);
assert.equal(index.executionAuthority,false);
assert.equal(index.wholeSetCompletion,false);
assert.equal(index.scopes.length,4);
assert.equal(index.preservedBaseline.length,4);
assert.match(heldManifest,/^[a-f0-9]{64}$/);

export function assertRetailCosmosOutsideHeldStampTargets(){
 const held=fs.readFileSync(new URL('../../docs/catalog/stamp_identity_admission_hold_v1/index.json',import.meta.url),'utf8');
 for(const scope of index.scopes)assert.ok(!held.includes(scope.parentId),'Retail target overlaps a frozen held stamp parent');
 return {held_stamp_admission_unchanged:true,exact_parent_uuid_overlaps:0,execution_authority:false};
}

export function assertRetailCosmosSubsetManifest(manifest){
 assertRetailCosmosOutsideHeldStampTargets();
 const scope=index.scopes.find(s=>s.setCode===manifest?.set_code);
 assert.ok(scope,'Unknown retail Cosmos scope');
 const {fingerprint,...body}=manifest;
 assert.equal(hash(body),fingerprint,'Subset manifest fingerprint changed');
 assert.equal(fingerprint,scope.manifestFingerprint,'Scope is not the frozen reviewed Cosmos subset');
 assert.equal(manifest.version,AUTHORITY_VERSION);
 assert.equal(manifest.scope,'verified_finish_subset');
 assert.equal(manifest.game,'pokemon');assert.equal(manifest.language,'en');
 assert.equal(manifest.identity_policy_version,'POKEMON_EN_PHYSICAL_V1');
 assert.equal(manifest.parents.length,1);assert.equal(manifest.parents[0].id,scope.parentId);
 assert.equal(manifest.parents[0].set_id,scope.setId);
 assert.equal(manifest.parents[0].identity_domain,'pokemon_eng_standard');
 assert.equal(manifest.printings.length,1);
 const child=manifest.printings[0];
 assert.equal(child.card_print_id,scope.parentId);assert.equal(child.finish_key,'cosmos');
 assert.equal(child.printing_gv_id,manifest.parents[0].gv_id+'-COSMOS');
 assert.equal(child.review_status,'verified');
 assert.deepEqual(manifest.expected,{parents:1,admitted_printings:1,retained_unadjudicated_printings:1,finishes:{cosmos:1}});
 assert.equal(manifest.unresolved_variants.length,1);
 const unresolved=manifest.unresolved_variants[0];
 assert.equal(unresolved.key,scope.retainedReverseId);assert.equal(unresolved.card_print_id,scope.parentId);
 assert.equal(unresolved.status,'needs_review');assert.equal(unresolved.scope,'retained_unadjudicated_existing_finish');
 assert.deepEqual(manifest.suppressed_printing_facts,[]);
 const authority=manifest.authority;
 assert.equal(authority.version,AUTHORITY_VERSION);assert.equal(authority.status,'verified_positive_subset');
 assert.equal(authority.set_id,scope.setId);assert.deepEqual(authority.conflicts,[]);assert.deepEqual(authority.forbidden_facts,[]);
 assert.deepEqual(authority.protected_facts,[{card_print_id:scope.parentId,finish_key:'cosmos'}]);
 assert.deepEqual(child.evidence,[{kind:'checked_checklist',source_ref:'exact-human-reference',sha256:authority.source_artifacts.find(s=>s.ref==='exact-human-reference').sha256,card_print_id:scope.parentId,finish_key:'cosmos'}]);
 assert.equal(authority.source_artifacts.length,2);
 assert.deepEqual(authority.source_artifacts.map(s=>s.ref).sort(),['exact-card-image','exact-human-reference']);
 return manifest;
}

export function assertRetailCosmosSourceAuthority(manifest,artifacts){
 assertRetailCosmosSubsetManifest(manifest);assert.ok(artifacts instanceof Map,'Actual source bytes required');
 const check=(ref,digest)=>{assert.match(digest,/^[a-f0-9]{64}$/);assert.ok(artifacts.has(ref),'Source artifact missing: '+ref);assert.equal(sha(artifacts.get(ref)),digest,'Source artifact changed: '+ref);};
 check(manifest.master_index_ref,manifest.master_index_sha256);
 const master=JSON.parse(artifacts.get(manifest.master_index_ref));
 assert.equal(master.version,'ENGLISH_MASTER_INDEX_RETAIL_COSMOS_ADDENDUM_V2');assert.equal(master.whole_set_completion,false);
 assert.equal(master.facts.length,1);assert.equal(master.facts[0].card_print_id,manifest.parents[0].id);assert.equal(master.facts[0].finish_key,'cosmos');
 for(const source of manifest.authority.source_artifacts){
  assert.ok(['checked_checklist','image_confirmed'].includes(source.kind));
  assert.ok(source.url_or_identifier.startsWith('https://'));assert.ok(Number.isFinite(Date.parse(source.retrieved_at)));
  check(source.ref,source.sha256);
 }
 const link=manifest.authority.review;check(link.ref,link.sha256);const review=JSON.parse(artifacts.get(link.ref));
 assert.equal(review.status,'verified_positive_subset');assert.equal(review.scope,'verified_finish_subset');
 assert.equal(review.production_execution_authority,false);assert.equal(review.whole_set_completion,false);
 assert.equal(review.master_index_sha256,manifest.master_index_sha256);assert.equal(review.set_code,manifest.set_code);
 assert.ok(review.reviewer.trim());assert.ok(Number.isFinite(Date.parse(review.reviewed_at)));
 const projection={...manifest,authority:{...manifest.authority}};delete projection.fingerprint;delete projection.authority.review;
 assert.equal(review.projection_sha256,hash(projection),'Reviewed subset projection changed');
 assert.equal(review.protected_outside_scope_children.length,1);
 const original=review.protected_outside_scope_children[0],scope=index.scopes.find(s=>s.setCode===manifest.set_code);
 assert.equal(original.id,scope.retainedReverseId);assert.equal(original.finishKey,'reverse');assert.equal(original.printingGvId,scope.retainedReverseGvId);
 return manifest;
}

export function assertRetailCosmosRetainedChildren(state){
 for(const profile of index.preservedBaseline){
  const parents=new Set(state.parents.filter(p=>p.set_id===profile.setId).map(p=>p.id));
  const expected=new Map(profile.protectedExistingChildren.map(p=>[p.id,p.sha256]));
  const retained=state.children.filter(p=>parents.has(p.card_print_id)&&expected.has(p.id));
  assert.equal(retained.length,expected.size,'An original scoped child disappeared');
  for(const row of retained)assert.equal(hash(row),expected.get(row.id),'Original scoped child changed');
 }
}

export function retailCosmosSubsetReadiness(){return{authority_version:AUTHORITY_VERSION,admitted_cosmos_facts:4,retained_unadjudicated_reverse_facts:4,collector_ready:false,whole_set_complete:false,database_write_authority:false};}
