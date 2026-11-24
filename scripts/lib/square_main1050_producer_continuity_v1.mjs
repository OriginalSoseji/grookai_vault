import fs from 'node:fs';
import assert from 'node:assert/strict';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const manifest=JSON.parse(fs.readFileSync(new URL('../../docs/audits/fixtures/square_main1050_producers_v1.json',import.meta.url)));
const {fingerprint,...body}=manifest;
assert.equal(fingerprint,'078208136583f4ce424874bf5fddf35086bf8cd8f73d4a40f3b8ab453878d7de');
assert.equal(hash(body),fingerprint);
assert.equal(manifest.acceptedSource,'136d987981bffb338dc94c11e33ef882e78397d6');
assert.equal(manifest.historicalFiles.length,600);
assert.equal(manifest.additional.length,6);
assert.equal(hash(manifest.historicalFiles),'b55f2e21decb8115c55bc9f5d6068dd346e5d0aac1fa0fb615802ebf2cd9c893');
assert.equal(hash(manifest.historicalFiles.slice(0,594)),'d012a831cda2ae59d3d040dcf71981c6f7065b85ddcf59f4a50080beda9b4559');

/** Exact source-only composition. No plan, schema, SQL or execution authority. */
export function assertSquareMain1050ProducerContinuityV1(binding,programme){
 assert.ok(['japaneseV1','japaneseV2'].includes(programme),'Unknown frozen programme');
 const baseline=manifest.baseline[programme],current=manifest.expectedCurrent[programme];
 assert.equal(binding.files.length,current.fileCount,'Exact combined producer required');
 assert.equal(new Set(binding.files.map(x=>x.file)).size,binding.files.length,'Duplicate producer path');
 const additional=new Set(manifest.additional.map(x=>x.file));
 const original=binding.files.filter(x=>!additional.has(x.file));
 assert.deepEqual(original,manifest.historicalFiles.slice(0,baseline.fileCount),'Accepted producer bytes/order changed');
 assert.equal(hash(original),baseline.fingerprint,'Accepted producer fingerprint changed');
 const extra=binding.files.filter(x=>additional.has(x.file));
 assert.deepEqual(extra,manifest.additional,'Missing, changed or unexpected Square migration');
 assert.equal(hash(binding.files),binding.fingerprint,'Producer fingerprint mismatch');
 assert.equal(binding.fingerprint,current.fingerprint,'Unqualified combined source');
 return {historicalFiles:baseline.fileCount,additionalFiles:6,currentFiles:current.fileCount,historicalFingerprint:baseline.fingerprint,currentFingerprint:current.fingerprint};
}
