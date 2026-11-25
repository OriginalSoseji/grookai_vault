import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import {STAMP_SCHEMA_521_CONTEXT_V1 as CONTEXT,assertStampSchema521FrameV1,assertStampExecutionSchemaContextV1,assertStampSchema521QualificationV1,stampPhysicalDescriptorV1,assertStampReviewedDescriptorContinuityV1,assertStampPhysicalDescriptorContinuityV1} from '../../backend/catalog/stamp_schema_521_continuity_v1.mjs';
import {qualifyPlayStampTransaction as canonical28} from '../../backend/catalog/play_stamp_normal_recovery_execution_v3.mjs';
import {qualifyPlayStampTransaction as canonical4} from '../../backend/catalog/play_stamp_series5_normal_execution_v1.mjs';
import {qualifyPlayMarketMapping as mapping28,assertMappingInsertEffects as effects28} from '../../backend/pricing/play_stamp_normal_recovery_market_mapping_v2.mjs';
import {qualifyPlayMarketMapping as mapping4,assertMappingInsertEffects as effects4} from '../../backend/pricing/play_stamp_series5_normal_market_mapping_v1.mjs';

// Metadata and proposed physical facts only; no protected database state.
const baseline=JSON.parse(fs.readFileSync(new URL('../fixtures/stamp_schema_519_baseline_metadata_v1.json',import.meta.url)));
const physical=JSON.parse(fs.readFileSync(new URL('../fixtures/stamp_original_physical_descriptors_v1.json',import.meta.url)));
const scopes={canonical28:['canonical','play_stamp_normal_recovery_qualification_521_v1',canonical28],canonical4:['canonical','play_stamp_series5_normal_qualification_521_v1',canonical4],mapping28:['mapping','play_stamp_normal_recovery_mapping_qualification_521_v1',mapping28],mapping4:['mapping','play_stamp_series5_normal_mapping_qualification_521_v1',mapping4]};
const frame=key=>({...structuredClone(baseline[scopes[key][0]]),ledger:[...baseline[scopes[key][0]].ledger,'20261123050000','20261123190000']});
const seal=body=>({...body,fingerprint:hash(body)});
const client=(key,overrides={},actual=scopes[key][1])=>({connectionParameters:{host:'127.0.0.1',port:55320,user:'postgres',database:scopes[key][1],...overrides},async query(sql){assert.equal(sql,'select current_database() name');return{rows:[{name:actual}]};}});

for(const key of Object.keys(scopes)){
 test(`${key}: accepts only the exact 521 extension and confers no execution authority`,()=>{
  const schema=frame(key),proof=assertStampExecutionSchemaContextV1({schema},CONTEXT,key);
  assert.equal(proof.execution_authority,false);assert.equal(proof.current_schema_fingerprint,hash(schema));
  assert.deepEqual(proof.appended_ids,['20261123050000','20261123190000']);
 });
 for(const variant of ['520','522','prefix','order','replacement'])test(`${key}: rejects ${variant} migration context`,()=>{
  const schema=frame(key);
  if(variant==='520')schema.ledger.pop();
  if(variant==='522')schema.ledger.push('20261124000000');
  if(variant==='prefix')schema.ledger[0]='20000101000000';
  if(variant==='order')schema.ledger.splice(519,2,'20261123190000','20261123050000');
  if(variant==='replacement')schema.ledger[520]='20261123200000';
  assert.throws(()=>assertStampSchema521FrameV1(schema,key));
 });
 for(const field of Object.keys(baseline[scopes[key][0]]).filter(k=>k!=='ledger'))test(`${key}: rejects changed scoped ${field}`,()=>{
  const schema=frame(key);schema[field]=Array.isArray(schema[field])?[...schema[field],{unreviewed:true}]:{unreviewed:true};
  assert.throws(()=>assertStampSchema521FrameV1(schema,key),/schema\/security\/RPC changed/);
 });
 test(`${key}: requires the explicit named context and preserves the legacy path`,()=>{
  assert.equal(assertStampExecutionSchemaContextV1({schema:baseline[scopes[key][0]]},undefined,key),null);
  for(const context of [undefined,null,true,'521','override'])assert.throws(()=>assertStampExecutionSchemaContextV1({schema:frame(key)},context,key));
  assert.throws(()=>assertStampExecutionSchemaContextV1({schema:baseline[scopes[key][0]]},CONTEXT,key));
 });
 test(`${key}: validates both owned connection parameters and actual database`,async()=>{
  assert.equal((await assertStampSchema521QualificationV1(client(key),{schema:frame(key)},key)).qualification_port,55320);
  for(const override of [{host:'localhost'},{host:'db.ycdxbpibncqcchqiihfz.supabase.co'},{port:55240},{port:5432},{user:'service_role'},{database:'postgres'}])await assert.rejects(assertStampSchema521QualificationV1(client(key,override),{schema:frame(key)},key));
  await assert.rejects(assertStampSchema521QualificationV1(client(key,{},'postgres'),{schema:frame(key)},key));
 });
 test(`${key}: original transaction entry rejects unapproved context before any SQL`,async()=>{
  let calls=0;
  const c={connectionParameters:client(key).connectionParameters,query(){calls++;throw Error('unexpected SQL');}};
  await assert.rejects(scopes[key][2]({client:c,plan:{schema:frame(key)}}));assert.equal(calls,0);
  await assert.rejects(scopes[key][2]({client:c,plan:{schema:frame(key)},schemaContext:'override'}));assert.equal(calls,0);
 });
}

for(const [key,effects] of [['mapping28',effects28],['mapping4',effects4]]){
 test(`${key}: insert effects retain the exact legacy guard and require explicit521 context`,()=>{
  const old=effects(baseline.mapping);assert.equal(old.sequence_calls,0);assert.equal(old.other_table_writes,0);
  assert.throws(()=>effects(frame(key)),/Explicit reviewed/);
  const proof=effects(frame(key),{schemaContext:CONTEXT});
  assert.equal(proof.schema_fingerprint,hash(frame(key)));assert.equal(proof.sequence_calls,0);assert.equal(proof.insert_triggers,0);assert.equal(proof.other_table_writes,0);
  const changed=frame(key);changed.columns[0].default_expression='nextval(\'unreviewed\')';
  assert.throws(()=>effects(changed,{schemaContext:CONTEXT}));
  assert.throws(()=>effects(baseline.mapping,{schemaContext:CONTEXT}));
 });
 test(`${key}: execution flag must match the new sealed mapping context before SQL`,async()=>{
  for(const [sealed,requested] of [[CONTEXT,undefined],[undefined,CONTEXT],['override',CONTEXT]]){
   let calls=0;const c={connectionParameters:client(key).connectionParameters,query(){calls++;throw Error('unexpected SQL');}};
   await assert.rejects(scopes[key][2]({client:c,plan:{schema:frame(key),schema_context:sealed},schemaContext:requested}),/Sealed plan/);assert.equal(calls,0);
  }
 });
}

for(const key of ['canonical28','canonical4']){
 const descriptor=physical.scopes[key].descriptor;
 const execution=()=>seal({...structuredClone(descriptor),schema:frame(key),observed_at:'2026-11-23T00:00:00.000Z',state_before:{unit_fixture_only:true}});
 test(`${key}: independently pinned reviewed physical facts survive a new context`,()=>{
  assert.equal(hash(descriptor),physical.scopes[key].descriptor_fingerprint);
  const p=execution(),proof=assertStampReviewedDescriptorContinuityV1(descriptor,p,key);
  assert.equal(proof.original_review_plan_fingerprint,physical.scopes[key].original_review_plan_fingerprint);
  assert.equal(proof.current_execution_plan_fingerprint,p.fingerprint);assert.equal(proof.original_plan_execution_claimed,false);assert.equal(proof.execution_authority,false);
  assert.deepEqual(stampPhysicalDescriptorV1(p),descriptor);
 });
 for(const field of Object.keys(descriptor))test(`${key}: a resealed change to ${field} cannot reuse original review`,()=>{
  const p=execution();delete p.fingerprint;
  p[field]=Array.isArray(p[field])?[...p[field],{unreviewed:true}]:{unreviewed:true};
  assert.throws(()=>assertStampReviewedDescriptorContinuityV1(descriptor,seal(p),key),/Physical descriptor changed/);
 });
 test(`${key}: neither forged descriptor nor private review seal is accepted`,()=>{
  const p=execution(),changed=structuredClone(descriptor);changed.boundaries={new_scope:1};
  assert.throws(()=>assertStampReviewedDescriptorContinuityV1(changed,p,key),/Wrong original/);
  p.observed_at='changed';assert.throws(()=>assertStampReviewedDescriptorContinuityV1(descriptor,p,key),/Plan seal/);
  assert.throws(()=>assertStampPhysicalDescriptorContinuityV1(execution(),execution(),key),/Wrong original/);
  assert.throws(()=>assertStampReviewedDescriptorContinuityV1(descriptor,execution(),'mapping28'));
 });
}

test('unknown, inherited and absent scopes are rejected before legacy handling',()=>{
 for(const key of ['other','toString','__proto__',undefined])assert.throws(()=>assertStampExecutionSchemaContextV1({},undefined,key),/Unknown/);
});
