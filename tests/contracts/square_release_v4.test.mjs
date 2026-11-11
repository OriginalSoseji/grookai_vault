import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateSquareReleaseArgs,validateSquareReleaseSources,squareReleaseIds} from '../../scripts/schema/verify_square_release_v4.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../../docs/audits/square_commerce_20261111/release-manifest-v4.json',import.meta.url)));
const files=Object.fromEntries(Object.keys({...manifest.history,...manifest.candidates}).map(name=>[name,fs.readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url))]));
test('release gate permits exact seven immutable candidates and rejects changed history, omissions and extras',()=>{
 assert.deepEqual(validateSquareReleaseSources(files,manifest).slice(-7),squareReleaseIds);
 const first=Object.keys(files)[0];assert.throws(()=>validateSquareReleaseSources({...files,[first]:Buffer.from('altered')},manifest));
 const missing={...files};delete missing[first];assert.throws(()=>validateSquareReleaseSources(missing,manifest));
 assert.throws(()=>validateSquareReleaseSources({...files,'20261111999999_unreviewed.sql':Buffer.from('select 1')},manifest));
});
test('release invocation rejects apply, target overrides, output traversal and combined arguments',()=>{
 const out='--out-dir=C:/grookai_vault_operator_artifacts/square_sync_20261110/release-gate-test';
 assert.equal(validateSquareReleaseArgs(['PrePush',out]).phase,'PrePush');
 for(const args of [['Apply',out],['PrePush',out,'--target=elsewhere'],['PrePush','--out-dir=C:/elsewhere/release-gate-test'],['PrePush',out+'/../x']])assert.throws(()=>validateSquareReleaseArgs(args));
});
