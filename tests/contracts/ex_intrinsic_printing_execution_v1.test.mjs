import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{printingManifestHash as hash}from'../../backend/catalog/printing_completeness_gate_v1.mjs';
import{assertExPrintingPlan,classifyExPrintingState,assertExPrintingAuthority,SCOPE,EXPECTED,BOUNDARIES}from'../../backend/catalog/ex_intrinsic_printing_execution_v1.mjs';

// Synthetic retained-state regressions and public reviewed-source facts.
// Retail image byte admission is independently exercised by the local qualifier.
const sourceDir=new URL('../../docs/catalog/ex_intrinsic_printing_completion_v1/',import.meta.url);
function sourceFacts(){return SCOPE.map(s=>({manifest:JSON.parse(fs.readFileSync(new URL(s.code+'/manifest.json',sourceDir))),review:JSON.parse(fs.readFileSync(new URL(s.code+'/review.json',sourceDir)))}));}
function makePlan(){
 const facts=sourceFacts(),children=facts.flatMap(({manifest:m})=>m.printings.map(p=>({id:null,...p}))),version='EX_INTRINSIC_PRINTING_EXECUTION_V1';
 // Use the public deterministic mapper; authority bytes are a runtime gate.
 return {facts,children,version};
}
test('the reviewed program contains exactly three distinct base parents and six explicit finishes',()=>{
 const{facts}=makePlan();assert.equal(new Set(facts.map(x=>x.manifest.parents[0].id)).size,3);
 for(const{manifest:m}of facts){assert.deepEqual(m.printings.map(x=>x.finish_key).sort(),['normal','reverse']);assert.equal(m.parents[0].variant_key,'');for(const p of m.printings)assert.ok(p.evidence.some(e=>e.source_ref==='public-master-printings'&&e.card_print_id===m.parents[0].id&&e.finish_key===p.finish_key));const binding=JSON.parse(fs.readFileSync(new URL(m.set_code+'/source-bindings.json',sourceDir)));assert.equal(binding.physicalImage.parentId,m.parents[0].id);assert.match(binding.physicalImage.sha256,/^[a-f0-9]{64}$/);}
 assert.equal(EXPECTED.printing_inserts,6);assert.equal(EXPECTED.retained_children,620);assert.equal(EXPECTED.children_after,626);assert.ok(Object.values(BOUNDARIES).every(n=>n===0));
});
test('source fingerprints reject an extra generic stamped finish even when plan is resealed',()=>{
 const{facts}=makePlan(),m=facts[0].manifest;m.printings[1].finish_key='stamped';
 const fake={version:'EX_INTRINSIC_PRINTING_EXECUTION_V1',project_ref:'ycdxbpibncqcchqiihfz',manifest_fingerprints:SCOPE.map(s=>s.manifest),expected:EXPECTED,boundaries:BOUNDARIES,state_before:{parents:Array(329).fill({}),children:Array(620).fill({})},children:Array(6).fill({}),reviews:Array(6).fill({}),raw:{payload:{manifests:facts.map(x=>x.manifest)}}};fake.fingerprint=hash(fake);
 assert.throws(()=>assertExPrintingPlan(fake,fake.fingerprint));
});
test('readback preserves the actual public option subset rather than assuming all retained children are visible',()=>{
 const retained={id:'old',card_print_id:'p',finish_key:'holo',printing_gv_id:'OLD',finish_is_active:true},child={id:'new',card_print_id:'target',finish_key:'normal',printing_gv_id:'NEW'};
 const before={sets:[],parents:[],mappings:[],identities:[],foreign_footprints:[],json_footprints:[],children:[{id:'old',image_url:'keep'},{id:'hidden',is_provisional:true}],reviews:[],raw:[],options:[retained]},plan={state_before:before,children:[child],reviews:[{id:'review'}],raw:{}};
 assert.equal(classifyExPrintingState(plan,structuredClone(before)),'before');
 const changed=structuredClone(before);changed.options.push({id:'hidden'});assert.throws(()=>classifyExPrintingState(plan,changed),/public-option/);
 changed.options=[retained];changed.children[0].image_url='overwritten';assert.throws(()=>classifyExPrintingState(plan,changed),/Retained child/);
});
test('partial child, review or raw states never become resumable before states',()=>{
 const before={sets:[],parents:[],mappings:[],identities:[],foreign_footprints:[],json_footprints:[],children:[],reviews:[],raw:[],options:[]},plan={state_before:before,children:[{id:'expected'}],reviews:[{id:'review'}],raw:{id:'-1'}};
 for(const key of['children','reviews','raw']){const changed=structuredClone(before);changed[key]=[{id:'unexpected'}];assert.throws(()=>classifyExPrintingState(plan,changed));}
});
test('relational and stored JSON reference drift both block readback',()=>{
 const before={sets:[],parents:[],mappings:[],identities:[],foreign_footprints:[{relation:'vault',digest:'assigned-and-unassigned'}],json_footprints:[{relation:'binder',digest:'target-id-in-json'}],children:[],reviews:[],raw:[],options:[]},plan={state_before:before};
 for(const key of['foreign_footprints','json_footprints']){const changed=structuredClone(before);changed[key][0].digest='changed';assert.throws(()=>classifyExPrintingState(plan,changed),/Protected drift/);}
});
test('general finish-them text cannot satisfy exact execution authority',()=>{
 // Invalid plans fail before any DB connection, even if approval text exists.
 assert.throws(()=>assertExPrintingAuthority({approval_text:'finish them'},{plan:{fingerprint:'not-a-plan'},codeFingerprint:'a'.repeat(64),mode:'apply'}));
});
