import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {STAMP_SCHEMA_521_CONTEXT_V1,assertStampSchema521FrameV1,assertStampExecutionSchemaContextV1,assertStampSchema521QualificationV1,stampPhysicalDescriptorV1} from './stamp_schema_521_continuity_v1.mjs';

export const STAMP_SCHEMA_522_CONTEXT_V1='STAMP_SCHEMA_522_CONTEXT_V1';
export const STAMP_SCHEMA_522_MIGRATION_V1='20261123220000_catalog_direct_visibility_evaluation_v1.sql';
export const STAMP_SCHEMA_522_MIGRATION_SHA256_V1='23784d76689a326ee343e95435367ba61f8a6b0f04576dce820f096b3bab7811';
const SCOPES=Object.freeze({
 canonical28:{database:'play_stamp_normal_recovery_qualification_522_v1',review:'711cb06754c4f51adc4e9ef230d3def2ca708b79e79921a2b73b5c1b5f8782a8',descriptor:'b505940c655aae4a956d1a24a251bc078f753e40d8fc8e739542b4a0424bc6a9'},
 canonical4:{database:'play_stamp_series5_normal_qualification_522_v1',review:'56d4f8c0740477111871884b45181feeba2228ff60c3704f24e586abcbbb13e5',descriptor:'ab5c89e8c3732b4f3fbffaca9cf5fc170a06b09aad3d4d385ba6ff123ec623d6'},
 mapping28:{database:'play_stamp_normal_recovery_mapping_qualification_522_v1'},
 mapping4:{database:'play_stamp_series5_normal_mapping_qualification_522_v1'},
});
const scope=key=>{assert.ok(Object.hasOwn(SCOPES,key),'Unknown stamp continuity scope');return SCOPES[key];};

export function assertStampSchema522FrameV1(schema,key){
 scope(key);assert.ok(Array.isArray(schema?.ledger));assert.equal(schema.ledger.length,522,'Exact 522 ledger required');
 assert.equal(schema.ledger[521],'20261123220000','Unreviewed appended migration');
 const prior=assertStampSchema521FrameV1({...schema,ledger:schema.ledger.slice(0,521)},key);
 return {...prior,version:STAMP_SCHEMA_522_CONTEXT_V1,current_schema_fingerprint:hash(schema),
  appended_ids:[...prior.appended_ids,'20261123220000'],migration_sha256:STAMP_SCHEMA_522_MIGRATION_SHA256_V1,
  execution_authority:false};
}

// Preserve the complete original519 and explicit521 paths. A later ledger or
// unknown context remains ineligible; no minimum-version schema comparison.
export function assertStampExecutionSchemaContextV2(plan,context,key){
 if(context===STAMP_SCHEMA_522_CONTEXT_V1)return assertStampSchema522FrameV1(plan?.schema,key);
 return assertStampExecutionSchemaContextV1(plan,context,key);
}

export async function assertStampQualificationContextV2(client,plan,key,context){
 if(context===STAMP_SCHEMA_521_CONTEXT_V1)return assertStampSchema521QualificationV1(client,plan,key);
 assert.equal(context,STAMP_SCHEMA_522_CONTEXT_V1,'Explicit qualification context required');
 const selected=scope(key),proof=assertStampSchema522FrameV1(plan?.schema,key),p=client.connectionParameters;
 assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55330);assert.equal(p.user,'postgres');
 assert.equal(p.database,selected.database,'Wrong owned522 database');
 assert.equal((await client.query('select current_database() name')).rows[0].name,selected.database);
 return {...proof,qualification_database:selected.database,qualification_port:55330};
}

export function assertStampReviewedDescriptorContinuity522V1(descriptor,execution,key){
 const selected=scope(key);assert.ok(selected.descriptor,'Canonical descriptor scope required');
 assert.equal(hash(descriptor),selected.descriptor,'Wrong original physical descriptor');
 const{fingerprint,...body}=execution??{};assert.equal(hash(body),fingerprint,'Plan seal changed');
 const proof=assertStampSchema522FrameV1(execution.schema,key);
 assert.deepEqual(stampPhysicalDescriptorV1(execution),descriptor,'Physical descriptor changed');
 return {...proof,original_review_plan_fingerprint:selected.review,current_execution_plan_fingerprint:fingerprint,
  physical_descriptor_fingerprint:selected.descriptor,original_plan_execution_claimed:false};
}

export function assertStampPhysicalDescriptorContinuity522V1(reviewed,execution,key){
 const selected=scope(key),{fingerprint,...body}=reviewed??{};
 assert.equal(hash(body),fingerprint,'Plan seal changed');assert.equal(fingerprint,selected.review,'Wrong original review plan');
 assert.equal(hash(reviewed.schema),'7cb2fa0b262d328b5120b845df396061eafabefb28910be1476091d4034028ae','Original reviewed schema changed');
 return assertStampReviewedDescriptorContinuity522V1(stampPhysicalDescriptorV1(reviewed),execution,key);
}
