import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';

export const STAMP_SCHEMA_521_CONTEXT_V1='STAMP_SCHEMA_521_CONTEXT_V1';
const LEGACY_LEDGER='22d4618b5636e420447b41d92633d10729ad155b1f2c4461677714f39bd6cb28';
const APPEND_ONLY_IDS=['20261123050000','20261123190000'];
const CANONICAL_BASELINE='7cb2fa0b262d328b5120b845df396061eafabefb28910be1476091d4034028ae';
const MAPPING_BASELINE='538c4e98d126f6e53f3f7724276bdbe7b77baa724d357a55bcec27bfe4e9cd6f';
const SCOPES=Object.freeze({
 canonical28:{kind:'canonical',database:'play_stamp_normal_recovery_qualification_521_v1',reviewPlan:'711cb06754c4f51adc4e9ef230d3def2ca708b79e79921a2b73b5c1b5f8782a8',descriptor:'b505940c655aae4a956d1a24a251bc078f753e40d8fc8e739542b4a0424bc6a9'},
 canonical4:{kind:'canonical',database:'play_stamp_series5_normal_qualification_521_v1',reviewPlan:'56d4f8c0740477111871884b45181feeba2228ff60c3704f24e586abcbbb13e5',descriptor:'ab5c89e8c3732b4f3fbffaca9cf5fc170a06b09aad3d4d385ba6ff123ec623d6'},
 mapping28:{kind:'mapping',database:'play_stamp_normal_recovery_mapping_qualification_521_v1'},
 mapping4:{kind:'mapping',database:'play_stamp_series5_normal_mapping_qualification_521_v1'},
});
function scope(key){assert.ok(Object.hasOwn(SCOPES,key),'Unknown stamp continuity scope');return SCOPES[key];}

// Compatibility evidence only. These scoped readers exclude the catalog count
// index: only their ledger may differ from the originally reviewed 519 frame.
export function assertStampSchema521FrameV1(schema,key){
 const selected=scope(key);assert.ok(schema&&typeof schema==='object'&&!Array.isArray(schema));
 assert.ok(Array.isArray(schema.ledger));assert.equal(schema.ledger.length,521,'Exact 521 ledger required');
 const original=schema.ledger.slice(0,519);assert.equal(hash(original),LEGACY_LEDGER,'Original migration prefix changed');
 assert.deepEqual(schema.ledger.slice(519),APPEND_ONLY_IDS,'Unexpected migration context');
 const expected=selected.kind==='canonical'?CANONICAL_BASELINE:MAPPING_BASELINE;
 assert.equal(hash({...schema,ledger:original}),expected,'Reviewed writer schema/security/RPC changed');
 return {version:STAMP_SCHEMA_521_CONTEXT_V1,scope:key,baseline_schema_fingerprint:expected,
  current_schema_fingerprint:hash(schema),original_ledger_fingerprint:LEGACY_LEDGER,
  appended_ids:[...APPEND_ONLY_IDS],execution_authority:false};
}

export function assertStampExecutionSchemaContextV1(plan,context,key){
 scope(key);
 if(context===undefined&&(!Array.isArray(plan?.schema?.ledger)||plan.schema.ledger.length<=519))return null;
 assert.equal(context,STAMP_SCHEMA_521_CONTEXT_V1,'Explicit reviewed 521 schema context required');
 return assertStampSchema521FrameV1(plan?.schema,key);
}

export async function assertStampSchema521QualificationV1(client,plan,key){
 const selected=scope(key),proof=assertStampSchema521FrameV1(plan?.schema,key),p=client.connectionParameters;
 assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55320);assert.equal(p.user,'postgres');
 assert.equal(p.database,selected.database,'Wrong owned continuity database');
 assert.equal((await client.query('select current_database() name')).rows[0].name,selected.database);
 return {...proof,qualification_database:selected.database,qualification_port:55320};
}

// A reviewed physical descriptor and a current execution context are distinct.
// The new receipt must identify the new plan, never claim the old 519 plan ran.
export function stampPhysicalDescriptorV1(plan){
 return Object.fromEntries(['version','project_ref','program_fingerprint','manifest_fingerprints','children','reviews','raw','expected','boundaries'].map(field=>[field,plan?.[field]]));
}

// This public descriptor contains the proposed facts only, excluding private
// protected state. Its independently pinned hash binds the original review.
export function assertStampReviewedDescriptorContinuityV1(descriptor,execution,key){
 const selected=scope(key);assert.equal(selected.kind,'canonical');
 assert.equal(hash(descriptor),selected.descriptor,'Wrong original physical descriptor');
 const{fingerprint,...body}=execution??{};assert.equal(hash(body),fingerprint,'Plan seal changed');
 const proof=assertStampSchema521FrameV1(execution.schema,key);
 assert.deepEqual(stampPhysicalDescriptorV1(execution),descriptor,'Physical descriptor changed');
 return {...proof,original_review_plan_fingerprint:selected.reviewPlan,current_execution_plan_fingerprint:fingerprint,
  physical_descriptor_fingerprint:selected.descriptor,original_plan_execution_claimed:false};
}

export function assertStampPhysicalDescriptorContinuityV1(reviewed,execution,key){
 const selected=scope(key);assert.equal(selected.kind,'canonical');
 const{fingerprint,...body}=reviewed??{};assert.equal(hash(body),fingerprint,'Plan seal changed');
 assert.equal(reviewed.fingerprint,selected.reviewPlan,'Wrong original physical review plan');
 assert.equal(hash(reviewed.schema),CANONICAL_BASELINE,'Original reviewed schema changed');
 return assertStampReviewedDescriptorContinuityV1(stampPhysicalDescriptorV1(reviewed),execution,key);
}
