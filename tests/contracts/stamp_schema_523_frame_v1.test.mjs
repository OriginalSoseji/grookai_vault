import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertStampSchema523FrameV1,STAMP_SCHEMA_523_MIGRATION_V1,STAMP_SCHEMA_523_MIGRATION_SHA256_V1} from '../../backend/catalog/stamp_schema_523_frame_v1.mjs';
import {createHash} from 'node:crypto';
const metadata=JSON.parse(fs.readFileSync(new URL('../fixtures/stamp_schema_519_baseline_metadata_v1.json',import.meta.url)));
const fixture=scope=>({...structuredClone(metadata[scope.startsWith('canonical')?'canonical':'mapping']),ledger:[...metadata.canonical.ledger,'20261123050000','20261123190000','20261123220000','20261124040000']});
for(const scope of ['canonical28','canonical4','mapping28','mapping4']){
 test(scope+' exact523 metadata is comparison evidence only',()=>{const proof=assertStampSchema523FrameV1(fixture(scope),scope);assert.equal(proof.execution_authority,false);assert.equal(proof.appended_ids.at(-1),'20261124040000');});
 for(const [name,change]of [['later ledger',s=>s.ledger.push('20261125000000')],['old522',s=>s.ledger.pop()],['unreviewed appended ID',s=>s.ledger[522]='20261124030000'],['changed original prefix',s=>s.ledger[0]='wrong'],['changed scoped metadata',s=>s.columns[0].name='unreviewed']])test(scope+' rejects '+name,()=>{const s=fixture(scope);change(s);assert.throws(()=>assertStampSchema523FrameV1(s,scope));});
}
test('523 source is the exact real catalog candidate, not a copied minimum-version allowance',()=>{const bytes=fs.readFileSync(new URL('../../supabase/migrations/'+STAMP_SCHEMA_523_MIGRATION_V1,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),STAMP_SCHEMA_523_MIGRATION_SHA256_V1);assert.throws(()=>assertStampSchema523FrameV1(fixture('canonical28'),'unknown'));});
