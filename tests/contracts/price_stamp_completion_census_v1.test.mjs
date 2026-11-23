import assert from 'node:assert/strict';import test from 'node:test';
import {buildPriceStampCensusV1 as build} from '../../backend/catalog/price_stamp_completion_census_v1.mjs';
const row=(patch={})=>({parent_id:'parent',gv_id:'GV-TEST',game_code:'pokemon',printing_id:'child',active_identities:1,parent_visibility:'visible',is_provisional:false,printing_hidden:false,market_price:null,source_candidates:0,source_positive_quote:false,source_eligible:false,...patch});
const census=(rows,priced=0,stampParentIds=[])=>build({rows,stampParentIds,expectedParents:new Set(rows.map(r=>r.parent_id)).size,current:{state:'verified',snapshot_count:priced},observedAt:'2026-11-22T22:00:00Z'});
test('multiple finishes count a parent once and preserve partial price coverage',()=>{
 const result=census([row({market_price:'1.23'}),row({printing_id:'reverse'})],1,['parent']);
 assert.equal(result.counts.parents,1);assert.equal(result.counts.printings,2);assert.equal(result.counts.missingCurrentMarketPrintings,1);assert.equal(result.byGame.pokemon.partiallyPriced,1);assert.equal(result.gaps[0].printing_id,'reverse');assert.equal(result.gaps[0].write_authority,false);
});
test('a childless record remains a catalog repair and never receives a guessed finish',()=>{
 const result=census([row({printing_id:null})]);assert.equal(result.counts.parentsWithoutPrinting,1);assert.equal(result.counts.printings,0);assert.equal(result.gaps[0].reason,'no_printing_record');assert.equal(result.executionAuthority,false);
});
test('missing public IDs are counted as actual identity defects instead of omitted',()=>{
 const result=census([row({gv_id:null})]);assert.equal(result.gaps[0].reason,'canonical_parent_public_id_missing');assert.equal(result.counts.parents,1);
});
test('duplicate joins and publication-count mismatches cannot inflate completion',()=>{
 assert.throws(()=>census([row(),row()]));assert.throws(()=>census([row({market_price:'1.00'})],0));
});
test('held parent and provisional printing remain explicit holds',()=>{
 const result=census([row({parent_visibility:'suppressed'}),row({parent_id:'other',gv_id:'GV-OTHER',printing_id:'other-child',is_provisional:true})]);assert.deepEqual(result.gaps.map(g=>g.reason),['suppressed_parent_preserved','provisional_or_hidden_printing_preserved']);
});
test('no-positive-source classification requires actual exact decisions',()=>{
 const absent=census([row()]),observed=census([row({source_candidates:2})]);assert.equal(absent.gaps[0].reason,'exact_mapping_or_finish_evidence_review_required');assert.equal(observed.gaps[0].reason,'exact_decisions_have_no_positive_source_quote');
});
test('stamp cohort must retain every originally audited parent',()=>{
 assert.throws(()=>census([row()],0,['missing-parent']));
});
