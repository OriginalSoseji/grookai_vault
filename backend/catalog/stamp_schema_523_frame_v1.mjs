import assert from 'node:assert/strict';
import {printingManifestHash as hash} from './printing_completeness_gate_v1.mjs';
import {assertStampSchema522FrameV1} from './stamp_schema_522_continuity_v1.mjs';

export const STAMP_SCHEMA_523_FRAME_V1='STAMP_SCHEMA_523_FRAME_V1';
export const STAMP_SCHEMA_523_MIGRATION_V1='20261124040000_catalog_bulk_alias_visibility_v1.sql';
export const STAMP_SCHEMA_523_MIGRATION_SHA256_V1='3d633cc8e1f59a56c1f0e76e25f4c0f4945674f17a8289d367e1be3e1ee6c19e';

// Metadata comparison only. This does not extend execution/qualification routes
// for the held32 stamp programmes or change any reviewed physical descriptor.
export function assertStampSchema523FrameV1(schema,scope){
 assert.ok(Array.isArray(schema?.ledger));assert.equal(schema.ledger.length,523,'Exact523 ledger required');
 assert.equal(schema.ledger[522],'20261124040000','Unreviewed appended migration');
 const prior=assertStampSchema522FrameV1({...schema,ledger:schema.ledger.slice(0,522)},scope);
 return {...prior,version:STAMP_SCHEMA_523_FRAME_V1,current_schema_fingerprint:hash(schema),appended_ids:[...prior.appended_ids,'20261124040000'],migration_sha256:STAMP_SCHEMA_523_MIGRATION_SHA256_V1,execution_authority:false};
}
