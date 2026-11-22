import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBestOfGameAuthority,prepareBestOfGamePrintingRepair} from '../../scripts/audits/best_of_game_printing_repair_prepare_v1.mjs';
import {printingManifestHash as hash,printingCandidateId} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {freezeBestOfGameRehearsal,assertBestOfGameRehearsal,classifyBestOfGameState,executeBestOfGameRehearsal,LOCAL_DATABASE} from '../../backend/catalog/best_of_game_printing_rehearsal_v1.mjs';
import {assertRehearsalConnection,bestOfGameRehearsalCodeBinding} from '../../scripts/audits/best_of_game_printing_rehearsal_v1.mjs';
const {manifest,artifacts}=loadBestOfGameAuthority(),now='2026-11-19T05:01:00Z';
const family=JSON.parse(fs.readFileSync(new URL('../fixtures/best_of_game_rehearsal_v1/family.json',import.meta.url)));
const seal=value=>{const c=structuredClone(value);delete c.fingerprint;return {...c,fingerprint:hash(c)};};
function fixture() {
 const snapshot=seal({version:'MASTER_PRINTING_DB_SNAPSHOT_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:now,set_id:manifest.authority.set_id,game:'pokemon',language:'en',set_code:'bp',parents:manifest.parents,printings:[],public_options:[],global_printing_identities:[],coverage:{parents:true,printings:true,public_options:true,global_printing_identities:true}});
 const inventory={version:'BEST_OF_GAME_DEPENDENCY_INVENTORY_V1',project_ref:snapshot.project_ref,observed_at:now,foreign_keys:Array.from({length:95},(_,i)=>({name:`synthetic_fk_${i}`})),protected_footprints:Object.entries({sets:2,parents:22,children:16,mappings:30,identities:22,owned:1}).map(([name,rows])=>({name,rows,sha256:'a'.repeat(64)})),proposed_uuid_collisions:[],checked_proposed_ids:manifest.printings.map(printingCandidateId)};
 const candidate=prepareBestOfGamePrintingRepair({snapshot,fullPrintings:[],reviews:[],inventoryBytes:Buffer.from(JSON.stringify(inventory)),asOf:now});
 const input={candidate,manifest,artifacts,family:structuredClone(family),schema:{columns:[],constraints:[],indexes:[],triggers:[],rules:[],public_rpc:[],protected_relations:[]},protectedFootprints:[]};
 return {input,plan:freezeBestOfGameRehearsal(input)};
}
function state(plan,exact=false) {
 const children=exact?[...plan.children_before,...plan.children.map(c=>({...c,image_source:null,image_path:null,image_url:null,image_alt_url:null,image_status:null,image_note:null}))].sort((a,b)=>a.id.localeCompare(b.id)):plan.children_before;
 return structuredClone({sets:plan.sets_before,parents:plan.parents_before,children,reviews:exact?plan.reviews:[],raw:exact?[plan.raw]:[],footprints:plan.protected_footprints});
}

test('new bounded path retains all family rows and stages exactly two source-backed reverse children',()=>{
 const {input,plan}=fixture();assert.deepEqual(freezeBestOfGameRehearsal(input),plan);
 assertBestOfGameRehearsal(plan,plan.fingerprint);assert.equal(plan.production_apply_available,false);
 assert.equal(plan.parents_before.length,22);assert.equal(plan.children_before.length,16);
 assert.deepEqual(plan.children.map(c=>c.printing_gv_id).sort(),['GV-PK-BP-8-RH','GV-PK-BP-9-RH']);
 assert.ok(Object.values(plan.boundaries).every(v=>v===0));
 assert.equal(classifyBestOfGameState(plan,state(plan)),'before');assert.equal(classifyBestOfGameState(plan,state(plan,true)),'exact');
});

for(const defect of ['stamp_reinterpretation','missing_winner','partial_children','wrong_candidate_uuid','candidate_hash','wrong_source_bytes'])test(`freezing rejects ${defect}`,()=>{
 const {input}=fixture();
 if(defect==='stamp_reinterpretation')input.family.parents.find(p=>p.id===manifest.parents[0].id).printed_identity_modifier='winner_stamp';
 if(defect==='missing_winner')input.family.parents.find(p=>p.variant_key==='winner_stamp').variant_key='';
 if(defect==='partial_children')input.family.children.pop();
 if(defect==='wrong_candidate_uuid'){input.candidate.printing_inserts[0].id='11111111-1111-4111-8111-111111111111';input.candidate=seal(input.candidate);}
 if(defect==='candidate_hash')input.candidate.fingerprint='a'.repeat(64);
 if(defect==='wrong_source_bytes'){input.artifacts=new Map(artifacts);input.artifacts.set('pricedex-checklist',Buffer.from('unreviewed metadata'));}
 assert.throws(()=>freezeBestOfGameRehearsal(input));
});

for(const defect of ['parent_change','retained_child_image','partial_raw','partial_review','partial_child','foreign_uuid_collision','new_image','changed_stamp_review'])test(`readback rejects ${defect}`,()=>{
 const {plan}=fixture(),s=state(plan,true);
 if(defect==='parent_change')s.parents[0].name='different';
 if(defect==='retained_child_image')s.children.find(c=>plan.children_before.some(p=>p.id===c.id)).image_path='changed';
 if(defect==='partial_raw')s.raw=[];
 if(defect==='partial_review')s.reviews.pop();
 if(defect==='partial_child')s.children=s.children.filter(c=>c.id!==plan.children[0].id);
 if(defect==='foreign_uuid_collision')s.children.find(c=>c.id===plan.children[0].id).card_print_id=family.parents.find(p=>p.variant_key==='winner_stamp').id;
 if(defect==='new_image')s.children.find(c=>c.id===plan.children[0].id).image_path='invented';
 if(defect==='changed_stamp_review')s.reviews[0].evidence.finish_key='stamped';
 assert.throws(()=>classifyBestOfGameState(plan,s));
});

for(const host of ['db.ycdxbpibncqcchqiihfz.supabase.co','aws-1-us-east-2.pooler.supabase.com','192.168.1.2'])test(`execution rejects non-loopback ${host} before querying`,async()=>{
 const {plan}=fixture();let queries=0;const client={connectionParameters:{host,database:LOCAL_DATABASE},query:async()=>{queries++;throw Error('must not connect');}};
 await assert.rejects(executeBestOfGameRehearsal({client,plan,expectedFingerprint:plan.fingerprint,mode:'apply'}),/Local loopback/);assert.equal(queries,0);
});

test('execution rejects an existing local database and live-server routing mismatch',async()=>{
 const {plan}=fixture();let queries=0;const client={connectionParameters:{host:'127.0.0.1',database:'postgres'},query:async()=>{queries++;}};
 await assert.rejects(executeBestOfGameRehearsal({client,plan,expectedFingerprint:plan.fingerprint,mode:'apply'}),/Dedicated rehearsal/);assert.equal(queries,0);
 client.connectionParameters.database=LOCAL_DATABASE;client.query=async()=>({rows:[{database:'postgres',address:'127.0.0.1'}]});
 await assert.rejects(executeBestOfGameRehearsal({client,plan,expectedFingerprint:plan.fingerprint,mode:'apply'}));
});

test('strict new schema gate refuses PrePush and unrelated switches before connection',()=>{
 const source=fs.readFileSync(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url),'utf8');
 assert.match(source,/if \(\$BestOfGamePrintingBaselineV1\)[\s\S]*?\$Phase -ne 'AuditLinkedSchema'/);
 assert.match(source,/Best of Game printing baseline V1 is read-only at canonical511; no PrePush or apply authority/);
});

test('local CLI validates the exact isolated connection before authentication',()=>{
 const connection={host:'127.0.0.1',port:64240,user:'postgres',password:'synthetic-local-fixture-password',database:LOCAL_DATABASE};
 assertRehearsalConnection(connection);
 for(const patch of [{host:'db.ycdxbpibncqcchqiihfz.supabase.co'},{port:5432},{database:'postgres'},{options:'-c default_transaction_read_only=off'},{ssl:false},{user:'another_user'},{password:''}])assert.throws(()=>assertRehearsalConnection({...connection,...patch}));
 const binding=bestOfGameRehearsalCodeBinding();assert.equal(binding.files.length,11);assert.equal(binding.fingerprint,hash(binding.files));
});
