import test from 'node:test';import assert from 'node:assert/strict';
import {buildDiscoveryIntakePlan,assertIntakePlan,rawPayload,hash} from '../../backend/catalog/pokemon_warehouse_discovery_intake_v1.mjs';
const at='2026-10-01T00:00:00Z';
function fixture(){const products=[{product_id:1,category_id:3,group_id:5,name:'Pikachu',image_url:'https://example.test/1.jpg',source_url:'https://example.test/1',extended_data:[{name:'Number',value:'025/100'}],payload_hash:'a'.repeat(64),source_active:true,raw_payload:{productId:1,name:'Pikachu',extendedData:[{name:'Number',value:'025/100'}]}}];return {products,parents:[],mappings:[],discovery:[],warehouse:[],sealed:[]};}
const plan=s=>buildDiscoveryIntakePlan(s,s.products,{observedAt:at});
test('full preserved source enters review with no invented set, parent or finish',()=>{const s=fixture(),p=plan(s);assertIntakePlan(p);assert.equal(p.entries.length,1);const e=p.entries[0];assert.equal(e.normalization.number_plain,'25');assert.equal(e.normalization.printed_total,'100');assert.equal(e.gate.finish_key,null);assert.equal(e.gate.canonical_parent_id,null);assert.equal(e.gate.canonical_set_code,null);assert.equal(e.gate.candidate_bucket,'PRINTED_IDENTITY_REVIEW');assert.deepEqual(rawPayload(e,p.fingerprint)._source_warehouse_snapshot.raw_payload,s.products[0].raw_payload);});
test('Japanese source remains Japanese and retailer evidence has priority without becoming a stamp',()=>{const s=fixture();s.products.push({...s.products[0],product_id:2,category_id:85,name:'Ho-Oh (GameStop Exclusive)',raw_payload:{productId:2}});const p=plan(s);assert.equal(p.entries[0].source.product_id,2);assert.equal(p.entries[0].normalization.language,'ja');assert.equal(p.entries[0].retailer,'gamestop');assert.equal(p.entries[0].gate.finish_key,null);});
for(const [label,mutate]of [
 ['existing discovery',s=>s.discovery.push({id:'d',tcgplayer_id:'1'})],
 ['existing warehouse candidate',s=>s.warehouse.push({id:'w',tcgplayer_id:'1'})],
 ['existing mapped parent',s=>{s.parents.push({id:'p',tcgplayer_id:'1',game:'pokemon',language:'en',printing_count:1});}],
 ['existing exact source mapping',s=>{s.parents.push({id:'p',game:'pokemon',language:'en',printing_count:1});s.mappings.push({active:true,source:'tcgplayer',external_id:'1',card_print_id:'p'});}],
 ['mapped sealed product',s=>s.sealed.push({source_provider:'tcgplayer',source_category_id:3,source_product_id:'1',mapping_status:'exact_reviewed',promotion_authorized:true})],
 ['existing identity review',s=>s.parents.push({id:'p',name:'Pikachu',number:'25',game:'pokemon',language:'en',printing_count:1})],
 ])test(`${label} is not duplicated`,()=>{const s=fixture();mutate(s);assert.equal(plan(s).entries.length,0);});
for(const [label,mutate]of [
 ['inactive source',p=>p.source_active=false],['upstream ID mismatch',p=>p.raw_payload.productId=9],['missing raw payload',p=>p.raw_payload=null],['unsupported collector number',p=>p.extended_data[0].value='booster pack'],['duplicate number field',p=>p.extended_data.push({...p.extended_data[0]})],['missing image',p=>p.image_url=null],['invalid source hash',p=>p.payload_hash='bad'],
 ])test(`${label} remains an explicit hold`,()=>{const s=fixture();mutate(s.products[0]);const p=plan(s);assert.equal(p.entries.length,0);assert.equal(p.held.length,1);assert.ok(p.held[0].reason);});
test('changed evidence invalidates the frozen plan',()=>{const p=plan(fixture());p.entries[0].source.name='Changed';assert.throws(()=>assertIntakePlan(p),/plan_fingerprint_drift/);});
test('rehashed plan cannot invent canonical or finish authority',()=>{const p=plan(fixture());p.entries[0].gate.finish_key='normal';const {fingerprint,...body}=p;p.fingerprint=hash(body);assert.throws(()=>assertIntakePlan(p),/entry_semantics_drift/);});
test('candidate ID is stable across observation time, with distinct review-plan receipts',()=>{const s=fixture(),a=plan(s),b=buildDiscoveryIntakePlan(s,s.products,{observedAt:'2026-10-02T00:00:00Z'});assert.equal(a.entries[0].candidate_id,b.entries[0].candidate_id);assert.notEqual(a.fingerprint,b.fingerprint);});
test('database timestamps survive a persisted plan roundtrip',()=>{const s=fixture();s.products[0].source_modified_on=new Date(at);const p=JSON.parse(JSON.stringify(plan(s)));assertIntakePlan(p);assert.equal(p.entries[0].source.source_modified_on,'2026-10-01T00:00:00.000Z');});
