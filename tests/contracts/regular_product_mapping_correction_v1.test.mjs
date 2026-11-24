import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import * as m from '../../backend/pricing/regular_product_mapping_correction_v1.mjs';

const now=Date.parse('2026-11-24T06:00:00.000Z');
const time=new Date(now).toISOString();
const schema=JSON.parse(fs.readFileSync(new URL('../../docs/catalog/regular_product_mapping_correction_v1/schema523.json',import.meta.url)));
const id=n=>'10000000-0000-4000-8000-'+n.toString(16).padStart(12,'0');
function fixture(){
 const parentMap=new Map(m.PARENTS.map(id=>[id,{id,synthetic_preserved_metadata:{historical:true}}]));
 const identities=[],mappings=[],printings=[];
 for(const t of m.REGISTRY.targets){
  for(const p of[t.regular,t.stamp])parentMap.set(p.id,{...p,identity_domain:'pokemon_eng_standard',printed_identity_modifier:p.printed_identity_modifier??null});
  identities.push({...t.identity,card_print_id:t.regular.id,is_active:true});
  for(const a of t.anchors)mappings.push({...a,active:true,meta:{preserved_source_member:'original'},synced_at:'2026-11-20T00:00:00Z'});
  mappings.push({id:t.mapping_id,source:'tcgplayer',external_id:String(t.product_id),card_print_id:t.stamp.id,active:true,synced_at:'2026-11-20T00:00:00Z',meta:{tcgcsv_group_id:String(t.group_id),preserved_source_member:'original'}});
  printings.push(...structuredClone(t.printings));
 }
 mappings.sort((a,b)=>Number(BigInt(a.id)-BigInt(b.id)));
 const run={id:m.REGISTRY.source_run,status:'completed',sync_mode:'current_full_sync',failed_count:0,observed_on:'2026-11-23',price_row_count:571181,artifact_hash:'b65e44152a31307e134e7c927a0d07e0cb10a4d3dbae6372d4cb1b4394c42294',finished_at:'2026-11-23T21:08:53.629Z'};
 const groups=[...new Set(m.REGISTRY.targets.map(t=>t.group_id))].sort((a,b)=>a-b).map(group_id=>({group_id,category_id:3,name:'Synthetic qualification group'}));
 const artifacts=groups.map((g,i)=>({id:id(100+i),sync_run_id:run.id,artifact_kind:'prices',category_id:3,group_id:g.group_id,http_status:200,byte_size:1,sha256:'a'.repeat(64)}));
 let serial=1;
 const products=m.REGISTRY.targets.map(t=>({product_id:t.product_id,name:t.source_name,category_id:3,group_id:t.group_id,source_active:true,catalog_metadata_status:'current',last_seen_run_id:run.id,extended_data:t.source_number.map(value=>({name:'Number',value}))}));
 const observations=m.REGISTRY.targets.flatMap(t=>t.subtypes.map(subtype_name=>({id:id(serial++),product_id:t.product_id,subtype_name,category_id:3,group_id:t.group_id,currency:'USD',market_price:'1.23',last_seen_run_id:run.id,observed_on:run.observed_on,payload_hash:'b'.repeat(64),source_artifact_id:artifacts.find(a=>a.group_id===t.group_id).id})));
 observations.sort((a,b)=>a.product_id-b.product_id||a.subtype_name.localeCompare(b.subtype_name));
 const effect=m.assertRepairSchemaV1(schema);
 return{effect_proof:effect,parents:[...parentMap.values()].sort((a,b)=>a.id.localeCompare(b.id)),identities,printings,reviews:[],aliases:[],mapping_aliases:[],printing_assertions:[],mappings,raw:[],source:{run,categories:[{category_id:3,name:'Pokemon'}],groups,products:products.sort((a,b)=>a.product_id-b.product_id),observations,artifacts},foreign_footprints:schema.canonical.foreign_keys.map(k=>({...k,rows:[]})),owner_json_effect_proof:{mode:'preserved_by_reviewed_bounded_update_effects',effect_fingerprint:hash(effect),owner_row_writes:0,owner_json_writes:0,global_json_scan_performed:false}};
}
const freeze=state=>m.freezeRepairPlanV1({schema:structuredClone(schema),state,observedAt:time});
const after=(p)=>{const s=structuredClone(p.state_before);s.mappings=s.mappings.map(x=>p.after.find(a=>String(a.id)===String(x.id))??x);s.raw=[structuredClone(p.raw)];return s;};
test('existing stamped modifiers are pinned literally and never normalized into equivalence',()=>{
 const t=m.REGISTRY.targets.find(t=>t.stamp.printed_identity_modifier!==null);assert.ok(t);
 const s=fixture();s.parents.find(p=>p.id===t.stamp.id).printed_identity_modifier=null;
 assert.throws(()=>freeze(s));
});
test('source freshness cannot be extended beyond36h or accepted from the future',()=>{
 const s=fixture(),finished=Date.parse(s.source.run.finished_at);
 assert.throws(()=>m.assertRepairSourceV1(s.source,{now:finished+36*3600000}));
 assert.throws(()=>m.assertRepairSourceV1(s.source,{now:finished-1}));
});
test('the exported review registry cannot be changed by a caller',()=>{
 assert.throws(()=>{m.REGISTRY.targets[0].regular.id=id(999);});
 assert.throws(()=>{m.REGISTRY.targets.push({});});
});
test('all29 regular products re-anchor without creating a printing or modifying old source fields',()=>{
 const state=fixture(),p=freeze(state);
 assert.deepEqual(p.expected,{raw_inserts:1,mapping_updates:29});
 assert.equal(p.after.length,29);assert.equal(p.before.length,29);
 for(const a of p.after){const b=p.before.find(b=>b.id===a.id),t=m.REGISTRY.targets.find(t=>t.mapping_id===a.id);assert.equal(a.card_print_id,t.regular.id);for(const key of Object.keys(b).filter(k=>!['meta','card_print_id'].includes(k)))assert.deepEqual(a[key],b[key]);for(const[key,value]of Object.entries(b.meta))assert.deepEqual(a.meta[key],value);assert.equal(a.meta.mapping_correction_prior_card_print_id,t.stamp.id);}
 assert.deepEqual(state,p.state_before);assert.equal(state.printings.length,47);assert.equal(p.raw.payload.mapping_before.length,29);assert.equal(p.raw.payload.mapping_after.length,29);assert.equal(m.classifyRepairStateV1(p,state),'before');assert.equal(m.classifyRepairStateV1(p,after(p)),'exact');
});
for(const t of m.REGISTRY.targets)test('rejects an incorrect source parent for '+t.source_name,()=>{
 const s=fixture();s.mappings.find(m=>m.id===t.mapping_id).card_print_id=t.regular.id;assert.throws(()=>freeze(s));
});
for(const[key,change]of Object.entries({
 'already applied Fighting subset':s=>{s.mappings.find(x=>x.id==='132361').meta.reviewed_correction={prior:true};},
 'hidden regular printing':s=>{s.reviews.push({active:true,card_printing_id:m.REGISTRY.targets[0].printings[0].id,public_visibility:'hidden_pending_review'});},
 'provisional existing child':s=>{s.printings[0].is_provisional=true;},
 'other regular identity':s=>{s.identities[0].card_print_id=m.REGISTRY.targets[1].regular.id;},
 'inactive independent anchor':s=>{s.mappings.find(x=>x.id===m.REGISTRY.targets[0].anchors[0].id).active=false;},
 'identity alias':s=>{s.aliases.push({id:id(999)});},
 'mapping sidecar alias':s=>{s.mapping_aliases.push({id:123});},
 'competing printing assertion':s=>{s.printing_assertions.push({id:1});},
 'extra regular child':s=>{s.printings.push({...s.printings[0],id:id(999)});},
 'incomplete foreign-reference census':s=>{s.foreign_footprints.pop();},
 'currency substitution':s=>{s.source.observations[0].currency='EUR';},
 'missing Market with retained mid':s=>{s.source.observations[0].market_price=null;s.source.observations[0].mid_price=99;},
 'nonpositive Market':s=>{s.source.observations[0].market_price=0;},
 'wrong regular Number literal':s=>{s.source.products[0].extended_data=[{name:'Number',value:'999/999'}];},
 'wrong quoted finish':s=>{s.source.observations[0].subtype_name='Cosmos Holofoil';},
 'different generation':s=>{s.source.run.id=id(998);},
 'duplicate observation identity':s=>{s.source.observations[1].id=s.source.observations[0].id;},
 'replaced source product':s=>{s.source.products[0].product_id=999;},
 'missing source artifact':s=>{s.source.artifacts.pop();},
 'wrong artifact group':s=>{s.source.artifacts[0].group_id=999;},
 'unreviewed owner effect':s=>{s.owner_json_effect_proof.owner_json_writes=1;}
}))test('fails closed for '+key,()=>{const s=fixture();change(s);assert.throws(()=>freeze(s));});
test('exact523 metadata rejects a later ledger and mutation-table effects',()=>{
 for(const edit of[s=>s.canonical.ledger.push('20261125000000'),s=>s.rules.push({unexpected:true}),s=>s.mapping_inbound.push({target_columns:['meta']})]){const s=structuredClone(schema);edit(s);assert.throws(()=>m.assertRepairSchemaV1(s));}
});
test('actual schema fingerprint and dependency binding include the dedicated programme',()=>{
 assert.equal(hash(schema),m.REGISTRY.schema_fingerprint);const b=m.repairCodeBindingV1();assert.equal(b.files.length,580);assert.equal(new Set(b.files.map(f=>f.file)).size,580);for(const suffix of['regular_product_mapping_correction_v1.mjs','regular_product_mapping_correction_v1/index.json','regular_product_mapping_correction_v1/schema523.json','REGULAR_PRODUCT_MAPPING_CORRECTION_V1.md','stamp_identity_admission_hold_v1.mjs'])assert.ok(b.files.some(f=>f.file.endsWith(suffix)));
});
test('partial29 update and missing audit cannot be counted as a repeat success',()=>{
 const p=freeze(fixture()),s=after(p);s.mappings=s.mappings.map(x=>x.id===p.before[0].id?p.before[0]:x);assert.throws(()=>m.classifyRepairStateV1(p,s),/Partial/);const missing=after(p);missing.raw=[];assert.throws(()=>m.classifyRepairStateV1(p,missing),/Missing/);
});
for(const key of['parents','identities','printings','reviews','aliases','mapping_aliases','printing_assertions','source','foreign_footprints','effect_proof','owner_json_effect_proof'])test('retains protected '+key+' on readback',()=>{
 const p=freeze(fixture()),s=after(p);if(Array.isArray(s[key]))s[key].push({unexpected:true});else s[key].unexpected=true;assert.throws(()=>m.classifyRepairStateV1(p,s),/Protected drift/);
});
test('unchanged non-target source mappings are independently preserved',()=>{
 const p=freeze(fixture()),s=after(p);s.mappings.find(x=>!m.MAPPING_IDS.includes(x.id)).active=false;assert.throws(()=>m.classifyRepairStateV1(p,s),/Other mappings/);
});
function authority(p,edit={}){
 const body={version:'REGULAR_PRODUCT_MAPPING_AUTHORITY_V1',status:'explicit_founder_approval',project_ref:m.PROJECT,plan_fingerprint:p.fingerprint,code_fingerprint:'c'.repeat(64),expected:m.EXPECTED,boundaries:m.BOUNDARIES,modes:['rollback','apply'],owner_decision_sha256:'d'.repeat(64),issued_at:new Date(now-1000).toISOString(),expires_at:new Date(now+3600000).toISOString(),...edit};return{...body,fingerprint:hash(body)};
}
test('ordinary exact approval is bound to this29-row plan, producer and original decision',()=>{
 const p=freeze(fixture());m.assertRepairAuthorityV1(authority(p),{plan:p,codeFingerprint:'c'.repeat(64),mode:'rollback',now});
 for(const edit of[{plan_fingerprint:'f'.repeat(64)},{code_fingerprint:'f'.repeat(64)},{expected:{raw_inserts:1,mapping_updates:1}},{modes:['apply']},{owner_decision_sha256:''},{expires_at:new Date(now-1).toISOString()},{expires_at:new Date(now+25*3600000).toISOString()}])assert.throws(()=>m.assertRepairAuthorityV1(authority(p,edit),{plan:p,codeFingerprint:'c'.repeat(64),mode:'apply',now}));
 assert.throws(()=>m.assertRepairAuthorityV1(null,{plan:p,codeFingerprint:'c'.repeat(64),mode:'apply',now}));
});
test('apply requires its own matching production rollback, not a local or partial receipt',()=>{
 const p=freeze(fixture()),r={version:m.VERSION,project_ref:m.PROJECT,mode:'rollback',environment:'production',rollback_proven:true,committed:false,commit_uncertain:false,plan_fingerprint:p.fingerprint,code_fingerprint:'c'.repeat(64),writes:m.EXPECTED,before_state_fingerprint:'a',rollback_state_fingerprint:'a',finished_at:new Date(now-1000).toISOString()};m.assertRepairRollbackV1(r,{plan:p,codeFingerprint:'c'.repeat(64),now});for(const change of[{environment:'local_qualification'},{writes:{raw_inserts:1,mapping_updates:1}},{plan_fingerprint:'f'.repeat(64)},{commit_uncertain:true},{finished_at:new Date(now-3600001).toISOString()}])assert.throws(()=>m.assertRepairRollbackV1({...r,...change},{plan:p,codeFingerprint:'c'.repeat(64),now}));
});
for(const connectionParameters of[{host:'localhost',port:55340,user:'postgres',database:m.QUALIFICATION_DATABASE},{host:'127.0.0.1',port:5432,user:'postgres',database:m.QUALIFICATION_DATABASE},{host:'127.0.0.1',port:55340,user:'postgres',database:'postgres'}])test('local qualification cannot target '+connectionParameters.host+':'+connectionParameters.port+'/'+connectionParameters.database,async()=>{
 let queries=0;await assert.rejects(m.qualifyRepairV1({client:{connectionParameters,query:async()=>{queries++;throw Error('Unexpected SQL');}},plan:freeze(fixture()),mode:'preflight',codeFingerprint:'c'.repeat(64)}));assert.equal(queries,0);
});

