import test from 'node:test';import assert from 'node:assert/strict';
import {buildGroupDiscoveryIntakePlan,assertIntakePlan,rawPayload,rawProductIds,hash} from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
import {reconcilePokemonWarehouse} from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';
export function fixture(){
 const products=[1,2,3].map(product_id=>({product_id,category_id:3,group_id:5,name:`Pokemon${product_id}`,image_url:'https://example.test/image',source_url:'https://example.test/source',extended_data:[{name:'Number',value:`00${product_id}/034`}],payload_hash:'a'.repeat(64),source_active:true,raw_payload:{productId:product_id,categoryId:3,groupId:5}}));
 const discovery=[{id:'existing-discovery',source:'tcgcsv',tcgplayer_id:'2',raw_import_id:'9007199254740993'}];
 const raw_receipts=[{id:'9007199254740993',source:'tcgcsv',status:'processed',payload:{tcgplayerId:'2'}}];
 const snapshot={products,parents:[{id:'other-set',gv_id:'other-gv',name:'Pokemon1',number:'001',game:'pokemon',language:'en',set_code:'unrelated',printing_count:1}],mappings:[],discovery,warehouse:[],sealed:[]};
 return {observed_at:'2026-10-02T00:00:00Z',category_id:3,group_id:5,expected_product_ids:['1','2','3'],products,coverage_rows:reconcilePokemonWarehouse(snapshot,{observedAt:'2026-10-02T00:00:00Z'}).rows,raw_receipts,discovery};
}
test('whole group includes cross-set hint and retains existing lineage without asserting finish',()=>{
 const p=buildGroupDiscoveryIntakePlan(fixture());assertIntakePlan(p);assert.equal(p.entries.length,2);assert.equal(p.retained.length,1);
 const e=p.entries[0];assert.equal(e.comparison.coverage_status,'existing_identity_mapping_review');assert.equal(e.comparison.suggested_existing_parents[0].id,'other-set');
 assert.equal(e.gate.finish_key,null);assert.equal(e.gate.canonical_parent_id,null);assert.equal(e.gate.canonical_set_code,null);
 assert.equal(rawPayload(e,p.fingerprint)._grookai_discovery_intake.comparison.hint_authority,'review_lead_only_not_a_source_relationship');
});
for(const [name,mutate,pattern] of [
 ['partial source',s=>s.products.pop(),/complete_source_group/],['partial coverage',s=>s.coverage_rows.pop(),/complete_coverage_group/],
 ['duplicate expected',s=>s.expected_product_ids.push('1'),/duplicate_scope/],['wrong source group',s=>s.products[0].group_id=99,/source_group_scope/],
 ['wrong coverage group',s=>s.coverage_rows[0].group_id=99,/coverage_group_scope/],['changed warehouse hash',s=>s.products[0].payload_hash='b'.repeat(64),/coverage_source_drift/],
 ['missing existing raw',s=>s.raw_receipts=[],/raw_lineage_missing/],['mismatched raw provenance',s=>s.raw_receipts[0].source='justtcg',/raw_source_mismatch/],
 ['mismatched existing raw product',s=>s.raw_receipts[0].payload.tcgplayerId='3',/raw_product_mismatch/],
 ['contradictory existing raw product fields',s=>s.raw_receipts[0].payload.productId='3',/raw_product_mismatch/],
 ['missing discovery inventory',s=>s.discovery=[],/discovery_inventory_drift/],
 ])test(name+' fails closed',()=>{const s=fixture();mutate(s);assert.throws(()=>buildGroupDiscoveryIntakePlan(s),pattern);});
for(const field of ['tcgplayerId','tcgplayer_id','productId','_external_id'])test('orphan raw '+field+' prevents duplicate ingress',()=>{const s=fixture();s.raw_receipts.push({id:'9',source:'tcgcsv',payload:{[field]:field==='_external_id'?'tcgcsv:5:1':'1'}});const p=buildGroupDiscoveryIntakePlan(s);assert.equal(p.entries.length,1);assert.equal(p.held[0].reason,'existing_raw_requires_reconciliation');});
test('upstream group mismatch is held explicitly',()=>{const s=fixture();s.products[0].raw_payload.groupId=9;const p=buildGroupDiscoveryIntakePlan(s);assert.match(p.held[0].reason,/upstream_group_mismatch/);});
for(const relationship of ['canonical_parent_ids','promotion_candidates'])test('hint status cannot bypass '+relationship,()=>{const s=fixture();s.coverage_rows[0][relationship]=['unexpected'];const p=buildGroupDiscoveryIntakePlan(s);assert.equal(p.entries.length,1);assert.equal(p.held.length,1);});
test('unclassified product remains accounted and held',()=>{const s=fixture();s.coverage_rows[2].status='unclassified_product_review';const p=buildGroupDiscoveryIntakePlan(s);assert.equal(p.entries.length,1);assert.equal(p.held[0].product_id,'3');});
test('rehashed plan cannot invent finish or erase hints',()=>{for(const mutate of [p=>p.entries[0].gate.finish_key='normal',p=>p.entries[0].comparison.suggested_existing_parents=[]]){const p=buildGroupDiscoveryIntakePlan(fixture());mutate(p);const {fingerprint,...body}=p;p.fingerprint=hash(body);assert.throws(()=>assertIntakePlan(p),/semantics_or_fingerprint/);}});
test('old plan is not group authority',()=>assert.throws(()=>assertIntakePlan({version:'POKEMON_WAREHOUSE_DISCOVERY_INTAKE_V1'}),/fresh_group_package/));
test('group identity remains separate from provider numeric IDs',()=>{assert.deepEqual(rawProductIds({source:'tcgcsv',payload:{_external_id:'tcgcsv:5:1'}}),['1']);assert.deepEqual(rawProductIds({source:'justtcg',payload:{_external_id:'tcgcsv:5:1'}}),[]);});
