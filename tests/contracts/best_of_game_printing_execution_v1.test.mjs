import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {printingManifestHash as hash,printingCandidateId} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {loadBestOfGameAuthority,prepareBestOfGamePrintingRepair} from '../../scripts/audits/best_of_game_printing_repair_prepare_v1.mjs';
import {freezeBestOfGameExecution,assertBestOfGameExecution,classifyBestOfGameExecution,executeBestOfGamePrintingRepair,qualifyBestOfGamePrintingTransaction,QUALIFICATION_DATABASE} from '../../backend/catalog/best_of_game_printing_execution_v1.mjs';
import {assertBestOfGameDatabaseTarget,assertBestOfGameExecutionAuthority,assertBestOfGameRollbackReceipt,assertBestOfGameProductionClient} from '../../backend/catalog/best_of_game_printing_execution_guard_v1.mjs';
import {assertBestOfGameBaselineReceipt,bestOfGameExecutionCodeBinding} from '../../scripts/audits/best_of_game_printing_execution_v1.mjs';
const {manifest,artifacts}=loadBestOfGameAuthority(),at='2026-11-19T05:01:00Z',now=Date.parse(at),code='a'.repeat(64);
const family=JSON.parse(fs.readFileSync(new URL('../fixtures/best_of_game_rehearsal_v1/family.json',import.meta.url)));
const seal=body=>{const {fingerprint,...rest}=structuredClone(body);return {...rest,fingerprint:hash(rest)};};
function fixture(){
 const snapshot=seal({version:'MASTER_PRINTING_DB_SNAPSHOT_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:at,set_id:manifest.authority.set_id,game:'pokemon',language:'en',set_code:'bp',parents:manifest.parents,printings:[],public_options:[],global_printing_identities:[],coverage:{parents:true,printings:true,public_options:true,global_printing_identities:true}});
 const inventory={version:'BEST_OF_GAME_DEPENDENCY_INVENTORY_V1',project_ref:snapshot.project_ref,observed_at:at,foreign_keys:Array.from({length:95},(_,i)=>({name:`test_fk_${i}`})),protected_footprints:Object.entries({sets:2,parents:22,children:16,mappings:30,identities:22,owned:1}).map(([name,rows])=>({name,rows,sha256:'a'.repeat(64)})),proposed_uuid_collisions:[],checked_proposed_ids:manifest.printings.map(printingCandidateId)};
 const candidate=prepareBestOfGamePrintingRepair({snapshot,fullPrintings:[],reviews:[],inventoryBytes:Buffer.from(JSON.stringify(inventory)),asOf:at});
 const schema={columns:[],constraints:[],indexes:[],triggers:[],rules:[],public_rpc:[],foreign_keys:Array.from({length:95},(_,i)=>({schema:'public',relation:`test_${i%79}`,column_name:'card_print_id',target:'card_prints',keys:1,target_column:'id'})),json_columns:[],ledger:Array.from({length:511},(_,i)=>String(i))};
 const input={candidate,manifest,artifacts,family:structuredClone(family),schema,protectedFootprints:[]};return {input,plan:freezeBestOfGameExecution(input)};
}
function authority(plan){return seal({version:'BEST_OF_GAME_PRINTING_EXECUTION_AUTHORITY_V1',status:'explicit_founder_approval',project_ref:plan.project_ref,execution_version:plan.version,plan_fingerprint:plan.fingerprint,code_fingerprint:code,expected:plan.expected,boundaries:plan.boundaries,modes:['rollback','apply'],approval_record_ref:'unit-test synthetic approval, never a production artifact',approval_text:`SYNTHETIC UNIT TEST ONLY ${plan.fingerprint} ${code}`,approved_at:at,expires_at:new Date(now+3600000).toISOString()});}
function receipt(plan){return {version:plan.version,environment:'production',project_ref:plan.project_ref,mode:'rollback',fingerprint:plan.fingerprint,code:{fingerprint:code},rollback_proven:true,exact_readback:true,committed:false,commit_uncertain:false,finished_at:at};}
test('bounded production plan proposes only BP8/9 reverses and preserves every family identity',()=>{
 const {plan}=fixture();assertBestOfGameExecution(plan,plan.fingerprint);assert.equal(plan.environment,'canonical_production');assert.equal(plan.production_apply_requires_exact_authority,true);
 assert.deepEqual(plan.children.map(c=>c.printing_gv_id).sort(),['GV-PK-BP-8-RH','GV-PK-BP-9-RH']);assert.equal(plan.parents_before.length,22);assert.equal(plan.children_before.length,16);
 const state={sets:plan.sets_before,parents:plan.parents_before,children:plan.children_before,reviews:[],raw:[],footprints:[]};assert.equal(classifyBestOfGameExecution(plan,state),'before');
 assert.ok(plan.raw.id.startsWith('-'));assert.ok(!plan.raw.notes.includes('Local-only'));assert.equal(plan.raw.source,'BEST_OF_GAME_PRINTING_EXECUTION_V1');
});
for(const defect of ['missing','wrong_plan','wrong_code','wrong_scope','wrong_version','general_instruction','expired','future','overlong','wrong_modes'])test(`production authority rejects ${defect}`,()=>{
 const {plan}=fixture();let a=authority(plan);
 if(defect==='missing')a=undefined;
 if(defect==='wrong_plan')a.plan_fingerprint='b'.repeat(64);
 if(defect==='wrong_code')a.code_fingerprint='b'.repeat(64);
 if(defect==='wrong_scope')a.expected.printing_inserts=25;
 if(defect==='wrong_version')a.version='MASTER_PRINTING_EXECUTION_AUTHORITY_V1';
 if(defect==='general_instruction')a.approval_text='Next step';
 if(defect==='expired')a.expires_at=at;
 if(defect==='future')a.approved_at=new Date(now+1000).toISOString();
 if(defect==='overlong')a.expires_at=new Date(now+86400001).toISOString();
 if(defect==='wrong_modes')a.modes=['prepare','apply'];
 if(a)a=seal(a);
 assert.throws(()=>assertBestOfGameExecutionAuthority(a,{plan,codeFingerprint:code,mode:'apply',now}));
});
test('exact scoped authority is accepted only for its allowed modes and time window',()=>{
 const {plan}=fixture(),a=authority(plan);for(const mode of ['rollback','apply'])assertBestOfGameExecutionAuthority(a,{plan,codeFingerprint:code,mode,now});
});
for(const patch of [{environment:'local_qualification'},{committed:true},{commit_uncertain:true},{rollback_proven:false},{finished_at:'2020-01-01'},{finished_at:new Date(now+1).toISOString()},{fingerprint:'b'.repeat(64)},{code:{fingerprint:'b'.repeat(64)}}])test(`apply rejects mismatched or stale rollback proof ${JSON.stringify(patch)}`,()=>{
 const {plan}=fixture();assert.throws(()=>assertBestOfGameRollbackReceipt({...receipt(plan),...patch},{plan,codeFingerprint:code,now}));
});
test('rollback proof accepts an actual-production-shaped exact receipt, never a local receipt',()=>{const {plan}=fixture();assertBestOfGameRollbackReceipt(receipt(plan),{plan,codeFingerprint:code,now});});
test('canonical target rejects URL startup overrides, loopback, wrong projects and databases',()=>{
 assertBestOfGameDatabaseTarget('postgresql://postgres.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require');
 for(const url of ['postgresql://postgres:p@127.0.0.1:5432/postgres','postgresql://postgres:p@db.other.supabase.co:5432/postgres','postgresql://postgres:p@db.ycdxbpibncqcchqiihfz.supabase.co:5432/other','postgresql://postgres:p@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?options=-c%20default_transaction_read_only=off'])assert.throws(()=>assertBestOfGameDatabaseTarget(url));
});
test('production engine rejects local routing or missing authority before any query',async()=>{
 const {plan}=fixture();let queries=0;const client={connectionParameters:{host:'127.0.0.1',database:QUALIFICATION_DATABASE},query:async()=>{queries++;throw Error('must not query');}};
 await assert.rejects(executeBestOfGamePrintingRepair({client,plan,expectedFingerprint:plan.fingerprint,mode:'apply'}));assert.equal(queries,0);
 client.connectionParameters={host:'db.ycdxbpibncqcchqiihfz.supabase.co',database:'postgres',user:'postgres',port:5432,ssl:{rejectUnauthorized:true}};client.connection={stream:{authorized:true}};
 assertBestOfGameProductionClient(client);await assert.rejects(executeBestOfGamePrintingRepair({client,plan,expectedFingerprint:plan.fingerprint,mode:'apply',codeFingerprint:code}));assert.equal(queries,0);
});
test('separate local qualification never admits a production or populated rehearsal target',async()=>{
 const {plan}=fixture();let queries=0;
 for(const connectionParameters of [{host:'db.ycdxbpibncqcchqiihfz.supabase.co',database:QUALIFICATION_DATABASE},{host:'127.0.0.1',database:'bog_printing_rehearsal_20261118_v1'}]){
  await assert.rejects(qualifyBestOfGamePrintingTransaction({client:{connectionParameters,query:async()=>{queries++;}},plan,expectedFingerprint:plan.fingerprint,mode:'apply'}));
 }assert.equal(queries,0);
});
test('read-only recovery permits an old strict receipt, write admission requires a fresh strict receipt',()=>{
 const baseline={version:'BEST_OF_GAME_PRINTING_BASELINE_V1',project:'ycdxbpibncqcchqiihfz',phase:'AuditLinkedSchema',pass:true,productionWrites:0,migrations:511,remainingSqlBytes:0,securityExact:true,allAppliedSourceBytesExact:true,sanity:{cards:173837,sets:3420,traits:47409},finishedAt:at};
 assertBestOfGameBaselineReceipt(baseline,{mode:'apply',now});assertBestOfGameBaselineReceipt(baseline,{mode:'readback',now:now+7200000});assert.throws(()=>assertBestOfGameBaselineReceipt(baseline,{mode:'apply',now:now+7200000}));
});
test('producer binding includes the separate production guards and leaves older execution guards untouched',()=>{
 const code=bestOfGameExecutionCodeBinding();assert.equal(code.fingerprint,hash(code.files));assert.ok(code.files.some(f=>f.file==='backend/catalog/best_of_game_printing_execution_guard_v1.mjs'));
 const old=fs.readFileSync(new URL('../../backend/catalog/best_of_game_printing_rehearsal_v1.mjs',import.meta.url),'utf8');assert.match(old,/Local loopback client required/);assert.match(old,/production_apply_available:false/);
});
