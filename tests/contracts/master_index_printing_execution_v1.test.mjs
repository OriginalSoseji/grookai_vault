import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {printingManifestHash as hash,PRINTING_COMPLETENESS_VERSION,buildPrintingAdmissionPlan} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {MASTER_PRINTING_AUTHORITY_VERSION} from '../../backend/catalog/master_index_printing_authority_v1.mjs';
import {buildMasterPrintingRepairPlan} from '../../backend/catalog/master_index_printing_repair_plan_v1.mjs';
import {freezePrintingExecution,assertPrintingExecution,classifyPrintingExecution,executePrintingRepair} from '../../backend/catalog/master_index_printing_execution_v1.mjs';
import {assertPrintingDatabaseTarget,assertPrintingExecutionAuthority,assertPrintingRollbackReceipt} from '../../backend/catalog/master_index_printing_execution_guard_v1.mjs';

const digest=v=>createHash('sha256').update(v).digest('hex');
const seal=v=>{const {fingerprint,...body}=v;return {...body,fingerprint:hash(body)};};
const sort=rows=>[...rows].sort((a,b)=>a.id.localeCompare(b.id));
const now='2026-09-17T05:00:00.000Z';
const imageFields=['image_source','image_path','image_url','image_alt_url','image_status','image_note'];
function fixture() {
 const setId='05b97782-d4b8-49eb-8030-7f990cdd6776';
 const parents=Array.from({length:25},(_,i)=>({id:`11111111-1111-4111-8111-${String(i+1).padStart(12,'0')}`,set_id:setId,
  gv_id:`GV-PK-MCD-2021-${i+1}`,name:`Fixture card ${i+1}`,number:String(i+1),identity_domain:'pokemon_eng_standard',variant_key:'',printed_identity_modifier:null}));
 const master=Buffer.from('synthetic master fixture, not production evidence'),source=Buffer.from('synthetic checklist fixture, not production evidence');
 let manifest={version:PRINTING_COMPLETENESS_VERSION,game:'pokemon',language:'en',set_code:'mcd21',scope:'base_release',identity_policy_version:'POKEMON_EN_PHYSICAL_V1',
  master_index_ref:'master',master_index_sha256:digest(master),parents:parents.map(({number,...p})=>({...p,printed_coordinate:number})),
  printings:parents.flatMap(p=>['normal','holo'].map(finish=>({card_print_id:p.id,finish_key:finish,printing_gv_id:p.gv_id+(finish==='holo'?'-HOLO':'-STD'),review_status:'verified',
   evidence:[{kind:'checked_checklist',source_ref:'checklist',sha256:digest(source),card_print_id:p.id,finish_key:finish}]}))),
  unresolved_variants:[],suppressed_printing_facts:[],expected:{parents:25,printings:50,finishes:{normal:25,holo:25}},
  authority:{version:MASTER_PRINTING_AUTHORITY_VERSION,status:'verified_scope',set_id:setId,source_artifacts:[{ref:'checklist',sha256:digest(source),kind:'checked_checklist',url_or_identifier:'test:fixture',retrieved_at:now}],protected_facts:[],forbidden_facts:[],conflicts:[]}};
 const review=Buffer.from(JSON.stringify({status:'verified_scope',master_index_sha256:digest(master),game:'pokemon',language:'en',set_code:'mcd21',scope:'base_release',reviewer:'synthetic-test',reviewed_at:now,projection_sha256:hash(manifest)}));
 const dependencies=Buffer.from('synthetic dependencies');
 const artifacts=new Map([['master',master],['checklist',source],['review',review],['dependencies',dependencies]]);
 manifest.authority.review={ref:'review',sha256:digest(review)};manifest=seal(manifest);
 const children=parents.map((p,i)=>({id:`22222222-2222-4222-8222-${String(i+1).padStart(12,'0')}`,card_print_id:p.id,finish_key:'normal',printing_gv_id:p.gv_id+'-STD',
  is_provisional:false,provenance_source:null,provenance_ref:null,created_by:'old-import',created_at:'2020-01-01T00:00:00.123456+00:00',
  ...Object.fromEntries(imageFields.map(field=>[field,null])),image_path:'preserved/image/'+p.id}));
 const snapshot=seal({version:'MASTER_PRINTING_DB_SNAPSHOT_V1',project_ref:'ycdxbpibncqcchqiihfz',observed_at:now,set_id:setId,game:'pokemon',language:'en',set_code:'mcd21',
  parents:manifest.parents,printings:children.map(p=>({...p,active:null,review_status:null,public_visibility:null})),public_options:children.map(p=>({...p,finish_is_active:true})),global_printing_identities:children,
  coverage:{parents:true,printings:true,public_options:true,global_printing_identities:true}});
 const proposed=buildPrintingAdmissionPlan(manifest,children).inserts;
 const candidate=buildMasterPrintingRepairPlan({manifest,artifacts,snapshot,fullPrintings:children,reviews:[],asOf:now,
  dependencyEvidence:{inventory_ref:'dependencies',inventory_sha256:digest(dependencies),foreign_keys:[],protected_footprints:[],proposed_uuid_collisions:[],checked_proposed_ids:proposed.map(p=>p.id)}});
 const schema={columns:[],constraints:[],indexes:[],triggers:[],rules:[],public_rpc:[{definition:'synthetic RPC fixture'}]};
 const footprints=['vault_item_instances','binder_custom_slots','vault_item_instance_dispositions','external_mappings','external_printing_mappings'].map(table=>({table,rows:0,digest:'empty'}));
 const inputs={candidate,manifest,artifacts,parents,schema,protectedFootprints:footprints};
 const plan=freezePrintingExecution(inputs);
 const before=structuredClone({parents:sort(parents),children:sort(children),reviews:[],raw:[],footprints});
 return {inputs,plan,before};
}
function exact(plan) {
 return {parents:structuredClone(plan.parents_before),children:sort([...plan.updates.map(p=>({...p.before,...p.patch})),...plan.children.map(p=>({...p,...Object.fromEntries(imageFields.map(k=>[k,null]))}))]),
  reviews:structuredClone(plan.reviews),raw:[structuredClone(plan.raw)],footprints:structuredClone(plan.protected_footprints)};
}

// Transaction double exercises control flow; it is not PostgreSQL rollback or RPC proof.
function clientFor(plan,initial,{failAt,commitLost=false,rollbackLost=false,badOptions=false,schemaDrift=false,changeDependency=false}={}) {
 let state=structuredClone(initial),saved;
 const calls=[];
 const client={calls,get state(){return state;},async query(sql,args=[]) {
  calls.push(sql);
  if(failAt&&sql.startsWith(failAt))throw new Error('injected failure');
  if(sql.startsWith('begin')){saved=structuredClone(state);return {rows:[]};}
  if(sql==='rollback'){if(rollbackLost)throw new Error('rollback disconnected');if(saved)state=structuredClone(saved);return {rows:[]};}
  if(sql==='commit'){saved=null;if(commitLost)throw new Error('commit acknowledgement lost');return {rows:[]};}
  if(sql.includes('information_schema.columns'))return {rows:schemaDrift?[{changed:true}]:plan.schema.columns};
  if(sql.includes('from pg_constraint'))return {rows:plan.schema.constraints};
  if(sql.includes('from pg_indexes'))return {rows:plan.schema.indexes};
  if(sql.includes('from pg_trigger'))return {rows:plan.schema.triggers};
  if(sql.includes('from pg_rules'))return {rows:plan.schema.rules};
  if(sql.startsWith('select pg_get_functiondef('))return {rows:plan.schema.public_rpc};
  if(sql.startsWith('select to_jsonb(p) row from public.card_prints'))return {rows:state.parents.map(row=>({row:structuredClone(row)}))};
  if(sql.startsWith('select to_jsonb(p) row from public.card_printings'))return {rows:state.children.map(row=>({row:structuredClone(row)}))};
  if(sql.startsWith('select to_jsonb(r) row from public.card_printing_truth_reviews'))return {rows:state.reviews.map(row=>({row:structuredClone(row)}))};
  if(sql.startsWith("select (to_jsonb(r)-'id')"))return {rows:state.raw.map(row=>({row:structuredClone(row)}))};
  if(sql.startsWith('select count(*)::int rows,md5')) {
   const table=sql.match(/from public\.(\w+)/)[1];const {rows,digest}=state.footprints.find(f=>f.table===table);return {rows:[{rows,digest}]};
  }
  if(sql.startsWith('select key from public.finish_keys'))return {rows:[{key:'holo'},{key:'normal'}]};
  if(sql.startsWith('insert into public.raw_imports')){state.raw=[structuredClone(plan.raw)];return {rowCount:1};}
  if(sql.startsWith('update public.card_printings')) {
   const index=state.children.findIndex(p=>p.id===args[0]&&hash(p)===hash(JSON.parse(args[3])));
   if(index<0)return {rowCount:0};Object.assign(state.children[index],{provenance_source:args[1],provenance_ref:args[2]});return {rowCount:1};
  }
  if(sql.startsWith('insert into public.card_printings')) {
   state.children=sort([...state.children,...JSON.parse(args[0]).map(p=>({...p,...Object.fromEntries(imageFields.map(k=>[k,null]))}))]);return {rowCount:25};
  }
  if(sql.startsWith('insert into public.card_printing_truth_reviews')) {
   state.reviews=JSON.parse(args[0]);if(changeDependency)state.footprints[0].rows++;return {rowCount:50};
  }
  if(sql.includes('from public.get_public_card_printing_options_v1')) {
   const rows=state.children.map(({id,card_print_id,finish_key,printing_gv_id})=>({id,card_print_id,finish_key,printing_gv_id,finish_is_active:true}));
   return {rows:badOptions?rows.slice(1):rows};
  }
  if(sql.startsWith('set local ')||sql.includes('pg_advisory_xact_lock')||sql.endsWith('for update'))return {rows:[]};
  throw new Error('Unexpected SQL: '+sql);
 }};return client;
}
const run=(f,client,mode,extra={})=>executePrintingRepair({client,plan:f.plan,expectedFingerprint:f.plan.fingerprint,mode,...extra});
const writes=client=>client.calls.filter(sql=>/^(insert|update|delete)\b/.test(sql));

test('frozen McDonalds lane preserves 25 existing IDs and adds exactly 25 supported Holos',()=>{
 const f=fixture();assert.deepEqual(f.plan,freezePrintingExecution(f.inputs));assertPrintingExecution(f.plan,f.plan.fingerprint);
 assert.equal(classifyPrintingExecution(f.plan,f.before),'before');assert.equal(classifyPrintingExecution(f.plan,exact(f.plan)),'exact');
 assert.equal(f.plan.raw.payload.master_manifest.fingerprint,f.inputs.manifest.fingerprint);
 assert.ok(f.plan.raw.id.startsWith('-'));assert.ok(f.plan.updates.every(p=>p.before.image_path.startsWith('preserved/')));
});
for(const defect of ['fingerprint','finish','parent','provenance_patch','counts','review','duplicate_child','image_field'])test(`frozen execution rejects ${defect}`,()=>{
 const {plan}=fixture();
 if(defect==='fingerprint')plan.fingerprint='a'.repeat(64);
 if(defect==='finish')plan.children[0].finish_key='reverse';
 if(defect==='parent')plan.children[0].card_print_id='other';
 if(defect==='provenance_patch')plan.updates[0].patch.image_path='repointed';
 if(defect==='counts')plan.expected.printing_inserts=24;
 if(defect==='review')plan.reviews[0].review_status='unsupported';
 if(defect==='duplicate_child')plan.children[1]=plan.children[0];
 if(defect==='image_field')plan.children[0].image_path='new/path';
 const modified=defect==='fingerprint'?plan:seal(plan);assert.throws(()=>assertPrintingExecution(modified,modified.fingerprint));
});
test('freezing requires unchanged actual source bytes',()=>{
 const f=fixture();f.inputs.artifacts.set('checklist',Buffer.from('different source'));assert.throws(()=>freezePrintingExecution(f.inputs));
});
for(const defect of ['parent','existing_image','new_image','missing_child','extra_child','missing_review','raw_payload'])test(`readback rejects ${defect} drift`,()=>{
 const f=fixture(),state=exact(f.plan);
 if(defect==='parent')state.parents[0].name='different';
 if(defect==='existing_image')state.children.find(p=>p.finish_key==='normal').image_path='changed';
 if(defect==='new_image')state.children.find(p=>p.finish_key==='holo').image_path='unapproved';
 if(defect==='missing_child')state.children.pop();
 if(defect==='extra_child')state.children.push({...state.children[0],id:'other'});
 if(defect==='missing_review')state.reviews.pop();
 if(defect==='raw_payload')state.raw[0].payload={};
 assert.throws(()=>classifyPrintingExecution(f.plan,state));
});
test('preflight issues no mutation and rejects stale dependency footprints',async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before);const result=await run(f,client,'preflight');
 assert.equal(result.after,'before');assert.equal(writes(client).length,0);
 f.before.footprints[0].rows=1;const drift=clientFor(f.plan,f.before);
 await assert.rejects(run(f,drift,'preflight'),/Dependency footprint drift/);assert.equal(writes(drift).length,0);
});
test('rollback mode verifies complete result then restores exact before state',async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before);const result=await run(f,client,'rollback');
 assert.deepEqual(result.writes,{raw:1,printing_inserts:25,provenance_updates:25,reviews:50});
 assert.equal(result.rollback_proven,true);assert.equal(result.committed,false);assert.deepEqual(client.state,f.before);
});
test('apply commits once; exact-state rerun performs zero writes',async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before);let checked=0;
 const result=await run(f,client,'apply',{beforeCommit:async r=>{assert.equal(r.exact_readback,true);checked++;}});
 assert.equal(result.committed,true);assert.equal(checked,1);
 const again=clientFor(f.plan,client.state);const replay=await run(f,again,'apply');
 assert.deepEqual(replay.writes,{raw:0,printing_inserts:0,provenance_updates:0,reviews:0});assert.equal(writes(again).length,0);
});
for(const fault of ['schemaDrift','badOptions','changeDependency','beforeCommit','insertFailure'])test(`transaction rolls back on ${fault}`,async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before,{[fault]:true,failAt:fault==='insertFailure'?'insert into public.card_printings':null});
 await assert.rejects(run(f,client,'apply',fault==='beforeCommit'?{beforeCommit:async()=>{throw new Error('code drift');}}:{}));
 assert.deepEqual(client.state,f.before);assert.ok(!client.calls.includes('commit'));
});
test('partial prior execution is never repaired by blind retry',async()=>{
 const f=fixture();f.before.raw=[f.plan.raw];const client=clientFor(f.plan,f.before);
 await assert.rejects(run(f,client,'apply'));assert.equal(writes(client).length,0);
});
test('lost commit acknowledgement is uncertain and independent readback can establish exact state',async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before,{commitLost:true});
 await assert.rejects(run(f,client,'apply'),e=>e.commit_uncertain===true);
 const independent=clientFor(f.plan,client.state);const readback=await run(f,independent,'readback');
 assert.equal(readback.exact_readback,true);assert.equal(writes(independent).length,0);
});
test('failed rollback is reported rather than assumed successful',async()=>{
 const f=fixture(),client=clientFor(f.plan,f.before,{failAt:'insert into public.card_printings',rollbackLost:true});
 await assert.rejects(run(f,client,'apply'),e=>e.rollback_uncertain===true&&e.commit_uncertain===false);
});

test('production transport refuses local, other-project and unverified startup targets',()=>{
 const target='postgresql://postgres.ycdxbpibncqcchqiihfz:fixture-password@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
 assert.equal(assertPrintingDatabaseTarget(target+'?sslmode=require').search,'');
 for(const bad of [target.replace('ycdxbpibncqcchqiihfz','other'),target.replace('aws-1-us-east-2.pooler.supabase.com','localhost'),target.replace('/postgres','/other'),target+'?options=-c%20search_path=other',target.replace(':5432/',':1234/')])assert.throws(()=>assertPrintingDatabaseTarget(bad));
});

function approval(plan) {
 return seal({version:'MASTER_PRINTING_EXECUTION_AUTHORITY_V1',status:'explicit_founder_approval',project_ref:plan.project_ref,execution_version:plan.version,
  plan_fingerprint:plan.fingerprint,code_fingerprint:'a'.repeat(64),expected:structuredClone(plan.expected),boundaries:structuredClone(plan.boundaries),
  modes:['rollback','apply'],approval_record_ref:'test:synthetic-only',approval_text:`Synthetic approval fixture ${plan.fingerprint} ${'a'.repeat(64)}`,
  approved_at:now,expires_at:'2026-09-17T06:00:00Z'});
}
test('authority binds exact plan, producer, counts, boundaries and modes',()=>{
 const {plan}=fixture(),authority=approval(plan);
 assertPrintingExecutionAuthority(authority,{plan,codeFingerprint:'a'.repeat(64),mode:'apply',now:Date.parse(now)});
});
for(const defect of ['draft','producer','plan','counts','boundaries','mode','expired','future','unbound_text','missing_record'])test(`execution refuses ${defect} authority`,()=>{
 const {plan}=fixture();let a=approval(plan);
 if(defect==='draft')a.status='prepared_not_authorized';
 if(defect==='producer')a.code_fingerprint='b'.repeat(64);
 if(defect==='plan')a.plan_fingerprint='b'.repeat(64);
 if(defect==='counts')a.expected.printing_inserts=26;
 if(defect==='boundaries')a.boundaries.deletes=1;
 if(defect==='mode')a.modes=['rollback'];
 if(defect==='expired')a.expires_at=now;
 if(defect==='future')a.approved_at='2026-09-17T05:01:00Z';
 if(defect==='unbound_text')a.approval_text='General permission is not a frozen apply approval';
 if(defect==='missing_record')a.approval_record_ref='';
 a=seal(a);assert.throws(()=>assertPrintingExecutionAuthority(a,{plan,codeFingerprint:'a'.repeat(64),mode:'apply',now:Date.parse(now)}));
});
test('apply requires a fresh matching production rollback receipt, not local proof',()=>{
 const {plan}=fixture();const receipt={mode:'rollback',fingerprint:plan.fingerprint,project_ref:plan.project_ref,code:{fingerprint:'a'.repeat(64)},rollback_proven:true,exact_readback:true,committed:false,commit_uncertain:false,finished_at:now};
 const options={plan,codeFingerprint:'a'.repeat(64),now:Date.parse(now)};
 assertPrintingRollbackReceipt(receipt,options);
 for(const patch of [{mode:'apply'},{fingerprint:'other'},{project_ref:'local'},{rollback_proven:false},{exact_readback:false},{committed:true},{commit_uncertain:true},{finished_at:'2026-09-17T03:00:00Z'},{finished_at:'2026-09-17T05:01:00Z'},{code:{fingerprint:'different'}}])assert.throws(()=>assertPrintingRollbackReceipt({...receipt,...patch},options));
});
test('CLI fails before opening output or database when required options are absent',()=>{
 const result=spawnSync(process.execPath,['scripts/audits/master_index_printing_execution_v1.mjs','--mode=apply'],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/Missing out-dir/);
});

test('checked-in McDonalds authority preserves the exact reviewed 25 Normal and 25 Holo scope',()=>{
 const root='docs/catalog/master_printing_authority_v1/mcd21';
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
 assert.equal(manifest.fingerprint,'43a3cb1d42323acbc4ef03d3ed331e4429f16ae08ae8e421d6f0ed72075c42a8');
 const {fingerprint,...body}=manifest;assert.equal(hash(body),fingerprint);
 assert.equal(digest(fs.readFileSync(root+'/master.json')),manifest.master_index_sha256);
 const reviewBytes=fs.readFileSync(root+'/review.json');assert.equal(digest(reviewBytes),manifest.authority.review.sha256);
 const projection=structuredClone(body);delete projection.authority.review;
 assert.equal(JSON.parse(reviewBytes).projection_sha256,hash(projection));
 assert.equal(manifest.parents.length,25);assert.equal(manifest.printings.length,50);
 for(const parent of manifest.parents)assert.deepEqual(manifest.printings.filter(p=>p.card_print_id===parent.id).map(p=>p.finish_key).sort(),['holo','normal']);
});
