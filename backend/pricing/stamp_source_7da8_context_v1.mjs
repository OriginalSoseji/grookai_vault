import assert from 'node:assert/strict';
import {STAMP_SCHEMA_522_CONTEXT_V1,assertStampSchema522FrameV1} from '../catalog/stamp_schema_522_continuity_v1.mjs';

export const STAMP_SOURCE_7DA8_CONTEXT_V1='STAMP_SOURCE_7DA8_CONTEXT_V1';
const DATABASES=Object.freeze({mapping28:'play_stamp_normal_recovery_mapping_7da8_522_v1',mapping4:'play_stamp_series5_normal_mapping_7da8_522_v1'});
export function assertStampSourceContextV1(context){
 assert.ok(context===undefined||context===STAMP_SOURCE_7DA8_CONTEXT_V1,'Unknown reviewed stamp source context');
 return context===undefined?null:context;
}
export function assertStampSource7da8RunV1(run){
 assert.ok(run);for(const[key,value]of Object.entries({id:'7da8a525-2fdb-4437-9cb5-3daa2d11e0a5',status:'completed',sync_mode:'current_full_sync',failed_count:0,observed_on:'2026-11-23',price_row_count:571181,artifact_hash:'b65e44152a31307e134e7c927a0d07e0cb10a4d3dbae6372d4cb1b4394c42294'}))assert.equal(run[key],value,'Reviewed source generation changed: '+key);
 return {version:STAMP_SOURCE_7DA8_CONTEXT_V1,source_run_id:run.id,observed_on:run.observed_on,source_bundle_sha256:run.artifact_hash,source_price_row_count:run.price_row_count,execution_authority:false};
}
export function assertStampSourceExecutionContextV1(plan,context,schemaContext,key){
 assert.ok(Object.hasOwn(DATABASES,key),'Unknown stamp mapping source scope');
 assert.equal(plan.source_context,context,'Sealed plan and requested source context differ');
 if(!assertStampSourceContextV1(context))return null;
 assert.equal(schemaContext,STAMP_SCHEMA_522_CONTEXT_V1,'Current source requires exact reviewed522 schema context');
 assertStampSchema522FrameV1(plan.schema,key);return assertStampSource7da8RunV1(plan.source_snapshot?.run);
}
export async function assertStampSource7da8QualificationV1(client,plan,context,schemaContext,key){
 const proof=assertStampSourceExecutionContextV1(plan,context,schemaContext,key);assert.ok(proof,'Explicit current source qualification required');
 const p=client.connectionParameters;assert.equal(p.host,'127.0.0.1');assert.equal(Number(p.port),55340);assert.equal(p.user,'postgres');assert.equal(p.database,DATABASES[key]);
 assert.equal((await client.query('select current_database() name')).rows[0].name,DATABASES[key]);
 return {...proof,qualification_database:DATABASES[key],qualification_port:55340};
}
