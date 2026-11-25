import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import{randomUUID}from'node:crypto';import{spawnSync}from'node:child_process';
import{printingManifestHash as hash,assertPrintingManifest,printingCandidateId}from'../../backend/catalog/printing_completeness_gate_v1.mjs';
import{assertRetailCosmosSubsetManifest,assertRetailCosmosSourceAuthority,assertRetailCosmosOutsideHeldStampTargets,retailCosmosSubsetReadiness}from'../../backend/catalog/retail_stamp_cosmos_four_source_authority_v1.mjs';
import{SCOPE,EXPECTED,BOUNDARIES,classifyRetailCosmosState,qualifyRetailCosmosTransaction,executeRetailCosmosTransaction,assertRetailCosmosProfiles,readRetailCosmosState}from'../../backend/catalog/retail_stamp_cosmos_four_execution_v1.mjs';
import{retailCosmosCodeBindingV1}from'../../scripts/audits/retail_stamp_cosmos_four_execution_v1.mjs';
const directory=new URL('../../docs/catalog/retail_stamp_cosmos_four_v2/',import.meta.url),manifests=SCOPE.map(s=>JSON.parse(fs.readFileSync(new URL(s.code+'/manifest.json',directory))));
const reseal=m=>{delete m.fingerprint;m.fingerprint=hash(m);return m;};

test('four positive Cosmos facts retain four unresolved Reverses without a complete-family claim',()=>{
 assert.equal(manifests.length,4);for(const m of manifests){assert.equal(assertRetailCosmosSubsetManifest(m),m);assert.equal(m.printings[0].finish_key,'cosmos');assert.equal(m.unresolved_variants[0].status,'needs_review');assert.throws(()=>assertPrintingManifest(m),'This is not a V1 family manifest');}
 assert.deepEqual(retailCosmosSubsetReadiness(),{authority_version:'RETAIL_COSMOS_FINISH_SUBSET_AUTHORITY_V1',admitted_cosmos_facts:4,retained_unadjudicated_reverse_facts:4,collector_ready:false,whole_set_complete:false,database_write_authority:false});
 assert.equal(EXPECTED.retained_parents,776);assert.equal(EXPECTED.retained_children,1409);assert.equal(EXPECTED.children_after,1413);assert.equal(EXPECTED.printing_inserts,4);assert.equal(EXPECTED.reviews,4);assert.ok(Object.values(BOUNDARIES).every(n=>n===0));
});
for(const [name,mutate]of [['remove unresolved Reverse',m=>m.unresolved_variants=[]],['pretend base release',m=>m.scope='base_release'],['replace Cosmos by Reverse',m=>m.printings[0].finish_key='reverse'],['different parent',m=>m.parents[0].id=randomUUID()],['different stamp',m=>m.parents[0].variant_key='play_pokemon_stamp'],['different public ID',m=>m.printings[0].printing_gv_id+='-OTHER'],['extra finish',m=>m.printings.push({...m.printings[0],finish_key:'holo'})]])test('resealing cannot '+name,()=>{for(const original of manifests){const m=structuredClone(original);mutate(m);assert.throws(()=>assertRetailCosmosSubsetManifest(reseal(m)));}});

test('reviewed source hashes require actual bytes and cannot be replaced by the existence of a database row',()=>{
 const m=manifests[0],review=fs.readFileSync(new URL(m.set_code+'/review.json',directory)),master=fs.readFileSync(new URL(m.set_code+'/master.json',directory));
 const bytes=new Map([[m.master_index_ref,master],[m.authority.review.ref,review],['exact-human-reference',Buffer.from('Cosmos card exists')],['exact-card-image',Buffer.from('same card')]]);
 assert.throws(()=>assertRetailCosmosSourceAuthority(m,bytes),/Source artifact changed/);assert.throws(()=>assertRetailCosmosSourceAuthority(m,new Map()),/Source artifact missing/);
});
test('target identities cannot overlap the frozen held Play/Prize Pack programme',()=>{assert.deepEqual(assertRetailCosmosOutsideHeldStampTargets(),{held_stamp_admission_unchanged:true,exact_parent_uuid_overlaps:0,execution_authority:false});});

const before=()=>({sets:[],parents:[],mappings:[],identities:[],foreign_footprints:[{digest:'assigned-and-unassigned'}],json_footprints:[{digest:'owned-json'}],insert_effect_proof:{unchanged:true},parent_gvid_collisions:[],children:[{id:'retained-reverse',card_print_id:'existing-parent',finish_key:'reverse',image_url:'original'}],reviews:[],raw:[],options:[{id:'retained-reverse',finish_key:'reverse'}]});
test('the unadjudicated original Reverse stays exact, including artwork and public delivery',()=>{
 const state=before(),plan={state_before:structuredClone(state)};assert.equal(classifyRetailCosmosState(plan,state),'before');
 for(const change of [s=>s.children[0].finish_key='cosmos',s=>s.children[0].image_url='replacement',s=>s.children=[],s=>s.options=[],s=>s.foreign_footprints[0].digest='owner-moved',s=>s.json_footprints[0].digest='copy-reassigned',s=>s.parent_gvid_collisions.push({gv_id:'new-child-id'})]){const changed=structuredClone(state);change(changed);assert.throws(()=>classifyRetailCosmosState(plan,changed));}
});
test('partial additions cannot be mistaken for a resumable clean before-state',()=>{const state=before(),plan={state_before:structuredClone(state),children:[],reviews:[],raw:{id:'-1'}};for(const key of ['children','reviews','raw']){const changed=structuredClone(state);changed[key].push({id:'unexpected'});assert.throws(()=>classifyRetailCosmosState(plan,changed));}});
test('a target-only snapshot cannot omit the other retained set families',()=>{assert.throws(()=>assertRetailCosmosProfiles({parents:manifests.map(m=>m.parents[0]),children:[]},false),/original scoped child disappeared/i);});

test('local qualification cannot connect to production or a historical lab',async()=>{for(const connectionParameters of [{host:'db.ycdxbpibncqcchqiihfz.supabase.co',port:5432,user:'postgres',database:'postgres'},{host:'127.0.0.1',port:55240,user:'postgres',database:'ex_intrinsic_qualification_v1'}]){let queries=0;await assert.rejects(qualifyRetailCosmosTransaction({client:{connectionParameters,query(){queries++;throw Error('No SQL');}}}));assert.equal(queries,0);}});
test('general repair instructions cannot authorize production SQL',async()=>{let queries=0;const client={connectionParameters:{host:'db.ycdxbpibncqcchqiihfz.supabase.co',port:5432,user:'postgres',database:'postgres',ssl:{rejectUnauthorized:true}},connection:{stream:{authorized:true}},query(){queries++;throw Error('No SQL');}};await assert.rejects(executeRetailCosmosTransaction({client,mode:'apply',plan:{fingerprint:'not-qualified'},codeFingerprint:'a'.repeat(64),authority:{approval_text:'Audit and fix all issues'}}));assert.equal(queries,0);});
test('complete producer binds subset admission, preserved scope and held-program controls',()=>{const binding=retailCosmosCodeBindingV1();assert.equal(new Set(binding.files.map(f=>f.file)).size,binding.files.length);for(const required of ['backend/catalog/retail_stamp_cosmos_four_source_authority_v1.mjs','docs/catalog/retail_stamp_cosmos_four_v2/index.json','docs/contracts/RETAIL_STAMP_COSMOS_FOUR_EXECUTION_V1.md','backend/catalog/stamp_identity_admission_hold_v1.mjs','docs/catalog/stamp_identity_admission_hold_v1/index.json','backend/catalog/master_index_printing_authority_v1.mjs','backend/catalog/master_index_printing_repair_plan_v1.mjs'])assert.ok(binding.files.some(f=>f.file===required&&/^[a-f0-9]{64}$/.test(f.sha256)));});
for(const flag of ['--force=true','--mode=prepare','--target=another-database'])test('operator CLI rejects '+flag+' before access or output creation',()=>{const out=path.join(os.tmpdir(),'retail-cosmos-invalid-'+randomUUID()),result=spawnSync(process.execPath,['scripts/audits/retail_stamp_cosmos_four_execution_v1.mjs',flag,'--out-dir='+out],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,1);assert.equal(fs.existsSync(out),false);});

for(const kind of ['foreign_key','owner_json'])test('retained Reverse references without a parent column are inventoried through '+kind,async()=>{
 const metadata=JSON.parse(fs.readFileSync(new URL('../fixtures/stamp_schema_519_baseline_metadata_v1.json',import.meta.url))).canonical,legacy=SCOPE[0].retainedReverseId;
 const descriptor={children:manifests.map(m=>({...m.printings[0],id:printingCandidateId(m.printings[0])})),reviews:[],raw:{id:'-888'}};
 const schema={...metadata,foreign_keys:kind==='foreign_key'?[{schema:'public',relation:'child_only_fixture',target:'card_printings',column_name:'card_printing_id'}]:[],json_columns:kind==='owner_json'?[{schema:'public',relation:'vault_items',column_name:'metadata'}]:[]};
 const client={async query(sql,args=[]){
  if(sql.includes('from public.sets t'))return{rows:SCOPE.map(s=>({row:{id:s.set}}))};
  if(sql.includes('from public.card_prints t'))return{rows:SCOPE.map(s=>({row:{id:s.parent}}))};
  if(sql.includes('from public.card_printings t'))return{rows:SCOPE.map(s=>({row:{id:s.retainedReverseId,card_print_id:s.parent,finish_key:'reverse'}}))};
  if(sql.includes('"child_only_fixture"')){const included=args[0].includes(legacy);return{rows:[{rows:included?1:0,digest:included?'retained-child-only-reference':'empty'}]};}
  if(sql.includes('"public"."vault_items"')){const included=args[0].includes(legacy);return{rows:[{rows:included?1:0,digest:included?'retained-child-in-owner-json':'empty'}]};}
  return{rows:[]};
 }};
 const state=await readRetailCosmosState(client,descriptor,schema),footprint=kind==='foreign_key'?state.foreign_footprints[0]:state.json_footprints[0];assert.equal(footprint.rows,1);assert.match(footprint.digest,/retained-child/);
});
