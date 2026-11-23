import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{printingManifestHash as hash,assertPrintingManifest}from'../../backend/catalog/printing_completeness_gate_v1.mjs';
import{SCOPE,EXPECTED,BOUNDARIES,PROGRAM,classifyPlayStampState,assertPlayStampPlan,assertPlayStampAuthority,qualifyPlayStampTransaction}from'../../backend/catalog/play_stamp_normal_execution_v1.mjs';
const dir=new URL('../../docs/catalog/play_pokemon_stamp_normal_completion_v1/',import.meta.url),index=JSON.parse(fs.readFileSync(new URL('index.json',dir)));
function fixture(){
 const visible={id:'a',card_print_id:'p',finish_key:'holo',printing_gv_id:'OLD',finish_is_active:true},hidden={id:'b',card_print_id:'p',finish_key:'reverse',image_url:'retained',is_provisional:true};
 const before={sets:[{id:'set',code:'test'}],parents:[{id:'p',set_id:'set'},{id:'target',set_id:'set'}],mappings:[],identities:[],foreign_footprints:[{relation:'vault',digest:'assigned-and-unassigned'}],json_footprints:[{relation:'binder',digest:'target-id-in-json'}],insert_effect_proof:{fingerprint:'reviewed'},children:[{...visible,image_url:'retained'},hidden],reviews:[],raw:[],options:[visible]};
 return{state_before:before,children:[{id:'c',card_print_id:'target',finish_key:'normal',printing_gv_id:'NEW'}],reviews:[],raw:{id:'-1'},set_invariants:[{set_id:'set',parent_count:2,before_printings:2,after_printings:3,before_finishes:{holo:1,reverse:1},after_finishes:{holo:1,normal:1,reverse:1}}]};
}
test('the reviewed43-parent source package proves only Normal on exact generic Play stamp identities',()=>{
 assert.equal(SCOPE.length,43);assert.equal(new Set(SCOPE.map(s=>s.parent)).size,43);assert.equal(new Set(SCOPE.map(s=>s.set)).size,9);
 const{fingerprint,...body}=index;assert.equal(fingerprint,PROGRAM);assert.equal(hash(body),PROGRAM);assert.equal(index.executionAuthority,false);
 for(const s of index.scopes){const m=JSON.parse(fs.readFileSync(new URL(s.setCode+'/manifest.json',dir)));assertPrintingManifest(m);assert.equal(m.fingerprint,s.manifestFingerprint);assert.deepEqual(m.parents.map(p=>p.id),s.parents);for(const p of m.parents){assert.equal(p.variant_key,'play_pokemon_stamp');assert.equal(m.printings.filter(c=>c.card_print_id===p.id).length,1);}assert.ok(m.printings.every(c=>c.finish_key==='normal'));const facts=JSON.parse(fs.readFileSync(new URL(s.setCode+'/master_facts.json',dir)));assert.equal(facts.complete_printing_inventory,false);assert.equal(facts.foil_pattern_adjudicated,false);assert.ok(facts.records.every(r=>r.source_count===2));}
 assert.equal(EXPECTED.printing_inserts,43);assert.equal(EXPECTED.retained_children,3557);assert.equal(EXPECTED.children_after,3600);assert.ok(Object.values(BOUNDARIES).every(n=>n===0));
});
test('Normal-only source admission rejects a resealed replacement foil fact',()=>{
 const m=JSON.parse(fs.readFileSync(new URL(index.scopes[0].setCode+'/manifest.json',dir)));m.printings[0].finish_key='cosmos';delete m.fingerprint;m.fingerprint=hash(m);assert.notEqual(m.fingerprint,index.scopes[0].manifestFingerprint);
 assert.throws(()=>assertPlayStampPlan({fingerprint:'a'.repeat(64)},'a'.repeat(64)));
});
test('stored hidden children remain outside actual public options',()=>{
 const p=fixture();assert.equal(classifyPlayStampState(p,structuredClone(p.state_before)),'before');const changed=structuredClone(p.state_before);changed.options.push({id:'b'});assert.throws(()=>classifyPlayStampState(p,changed),/public-option/);
});
test('retained image and provisional state cannot change during additive repair',()=>{
 for(const field of['image_url','is_provisional']){const p=fixture(),s=structuredClone(p.state_before);s.children[1][field]='changed';assert.throws(()=>classifyPlayStampState(p,s),/Retained child/);}
});
test('existing mapping, identity and owner-reference digests are protected',()=>{
 for(const field of['mappings','identities','foreign_footprints','json_footprints','insert_effect_proof']){const p=fixture(),s=structuredClone(p.state_before);s[field]={changed:true};assert.throws(()=>classifyPlayStampState(p,s),/Protected drift/);}
});
test('partial child, review and raw states are never accepted as before states',()=>{
 for(const field of['children','reviews','raw']){const p=fixture(),s=structuredClone(p.state_before);s[field].push({id:'partial'});assert.throws(()=>classifyPlayStampState(p,s));}
});
test('per-set stored printing and finish counts are asserted independently of visible count',()=>{
 for(const field of['before_printings','parent_count','before_finishes']){const p=fixture();p.set_invariants[0][field]=field==='before_finishes'?{normal:2}:999;assert.throws(()=>classifyPlayStampState(p,structuredClone(p.state_before)));}
});
test('general completion instructions cannot grant exact canonical write authority',()=>{
 assert.throws(()=>assertPlayStampAuthority({approval_text:'finish them'},{plan:{fingerprint:'not-a-plan'},codeFingerprint:'a'.repeat(64),mode:'apply'}));
});
test('local qualification refuses another local database and any remote host before SQL',async()=>{
 for(const connectionParameters of[{host:'127.0.0.1',port:55240,user:'postgres',database:'postgres'},{host:'db.ycdxbpibncqcchqiihfz.supabase.co',port:5432,user:'postgres',database:'postgres'}])await assert.rejects(qualifyPlayStampTransaction({client:{connectionParameters,query(){throw Error('SQL must not execute');}}}));
});
