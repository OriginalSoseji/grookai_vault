import test from 'node:test';
import assert from 'node:assert/strict';
import {REGISTRY,expectedMappingRows,classifyMappings,assertMappingInsertEffects,qualifyPlayMarketMapping} from '../play_stamp_market_mapping_v1.mjs';

test('exact43 links retain their original source and approved Normal child',()=>{
 const rows=expectedMappingRows();assert.equal(rows.length,43);assert.equal(new Set(rows.map(r=>r.id)).size,43);assert.equal(new Set(rows.map(r=>r.external_id)).size,43);
 for(const t of REGISTRY.targets){const row=rows.find(r=>r.card_print_id===t.parent.id);assert.ok(row);assert.equal(row.source,'tcgplayer');assert.equal(row.external_id,String(t.source_product.product_id));assert.equal(row.meta.approved_printing_id,t.printing.id);assert.equal(row.meta.approved_finish_key,'normal');assert.equal(row.meta.justtcg_mapping_id,t.source_mapping.id);assert.equal(row.meta.source_candidate_id,t.source_mapping.source_candidate_id);assert.equal(row.meta.justtcg_raw_import_id,t.source_review.justtcg_raw_import_id);assert.ok(row.id<0&&Number.isSafeInteger(row.id));assert.equal(row.active,true);assert.ok(!Object.hasOwn(row,'synced_at'));}
});
test('partial, inactive, substituted and competing persistent assertions fail',()=>{
 const plan={mappings:expectedMappingRows()},exact=plan.mappings.map(r=>({...structuredClone(r),synced_at:'2026-11-23T04:00:00Z'}));assert.equal(classifyMappings(plan,[]),'before');assert.equal(classifyMappings(plan,exact),'exact');assert.throws(()=>classifyMappings(plan,exact.slice(1)));assert.throws(()=>classifyMappings(plan,[...exact,{...exact[0],id:999}]));
 for(const mutate of [r=>r.active=false,r=>r.card_print_id=exact[1].card_print_id,r=>r.meta.approved_finish_key='holo',r=>r.synced_at='invalid']){const rows=structuredClone(exact);mutate(rows[0]);assert.throws(()=>classifyMappings(plan,rows));}
});
test('unreviewed schema writers or defaults fail',()=>assert.throws(()=>assertMappingInsertEffects({insert_triggers:[{name:'unknown_writer'}]}),/schema\/security changed/));
test('local qualifier rejects a production host before any query',async()=>{let queries=0;await assert.rejects(qualifyPlayMarketMapping({client:{connectionParameters:{host:'db.ycdxbpibncqcchqiihfz.supabase.co'},query:()=>queries++},plan:null,mode:'apply'}));assert.equal(queries,0);});
