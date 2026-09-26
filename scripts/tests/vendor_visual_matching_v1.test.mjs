import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { scanDescriptor, prepareVisualIndex, rankVisualScan, MAX_SCAN_BYTES } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = require('sharp');
const artifact = JSON.parse(fs.readFileSync(new URL('../../apps/web/src/lib/stores/visualMatchIndex.json', import.meta.url)));
const index = prepareVisualIndex(artifact);

test('V2 requires its new flag and isolated pilot; the retired V1 flag cannot reopen matching', () => {
  const ts = require('typescript');
  const source = fs.readFileSync(new URL('../../apps/web/src/lib/stores/visualMatchServer.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const scenarios = [
    { enabled: undefined, url: `https://${artifact.database}.supabase.co`, pilot: true, expected: false },
    { enabled: 'true', url: `https://${artifact.database}.supabase.co`, pilot: true, expected: true },
    { enabled: 'true', url: 'https://wrong-database.supabase.co', pilot: true, expected: false },
    { enabled: 'true', url: `https://${artifact.database}.supabase.co`, pilot: false, expected: false },
  ];
  for (const scenario of scenarios) {
    const exports = {};
    vm.runInNewContext(code, { exports, Map, Date, process: { env: {
    GROOKAI_STORE_VISUAL_MATCH_ENABLED: 'true', GROOKAI_VENDOR_PILOT: 'true',
    GROOKAI_STORE_SCAN_MATCH_V2_ENABLED: scenario.enabled, SUPABASE_URL: scenario.url,
  } }, require: name => {
    if (name === 'server-only') return {};
    if (name === './visualMatchIndex.json') return artifact;
    if (name === './visualMatchCatalog.json') return [];
    if (name === 'node:path') return require('node:path');
    if (name === './scanProcessV1.mjs') return {runScanProcess:async()=>({candidates:[]})};
    if (name === './scanExpandedManifestV13.json') return {database:artifact.database};
    if (name === '@/lib/collectorStaging.mjs') return {vendorBatchLocalTest:false};
    if (name === './scanMatchV2.mjs') return { matchScanV2: async () => ({ candidates: [] }) };
    if (name === './visualMatchCore.mjs') return { prepareVisualIndex, rankVisualScan, scanDescriptor };
    if (name === '@/lib/vendorPilot.mjs') return { vendorPilot: scenario.pilot, VENDOR_PILOT_DATABASE: `https://${artifact.database}.supabase.co` };
    throw new Error(`Unexpected dependency: ${name}`);
  } });
    assert.equal(exports.visualMatchingEnabled(), scenario.expected);
  }
});

test('ambiguous identical artwork preserves distinct canonical candidates', () => {
  const one = artifact.references[0];
  const two = { ...one, id: '11111111-1111-4111-8111-111111111111', gv_id: 'GV-PK-TEST-002' };
  const result = rankVisualScan(one.descriptor, prepareVisualIndex({ ...artifact, references: [one, two] }));
  assert.equal(result.status, 'ambiguous');
  assert.deepEqual(new Set(result.candidates.map(c => c.id)), new Set([one.id, two.id]));
  assert.ok(result.candidates.every(c => !('printing' in c) && !('confidence' in c)));
});
test('every reference retrieves its own canonical identity in the bounded shortlist', () => {
  for (const ref of artifact.references) {
    const result = rankVisualScan(ref.descriptor, index);
    assert.ok(result.candidates.some(c => c.id === ref.id), ref.gv_id);
    assert.ok(result.candidates.length <= 5);
  }
});
test('malformed and duplicate reference identities fail closed', () => {
  assert.throws(() => prepareVisualIndex({ ...artifact, references: [artifact.references[0], artifact.references[0]] }));
  assert.throws(() => rankVisualScan('bad', index));
  assert.throws(() => prepareVisualIndex({ ...artifact, version: 'fixture-zero-vectors' }));
});
test('oversized, corrupt, vector and animated inputs cannot enter matching', async () => {
  await assert.rejects(scanDescriptor(Buffer.alloc(MAX_SCAN_BYTES + 1)), /4 MB/);
  await assert.rejects(scanDescriptor(Buffer.from('not an image')));
  await assert.rejects(scanDescriptor(Buffer.from('<svg width="300" height="420"></svg>')), /JPEG/);
  const gif = await sharp({ create: { width: 300, height: 420, channels: 3, background: '#aaaaaa' } }).gif().toBuffer();
  await assert.rejects(scanDescriptor(gif), /JPEG/);
});
test('blank, tiny and multi-card aspect scans abstain', async () => {
  const make = async (width, height) => sharp({ create: { width, height, channels: 3, background: '#dddddd' } }).png().toBuffer();
  await assert.rejects(scanDescriptor(await make(300, 420)), /detail/);
  await assert.rejects(scanDescriptor(await make(100, 140)), /one card/);
  await assert.rejects(scanDescriptor(await make(1000, 500)), /one card/);
});
test('irrelevant visual noise does not produce a forced nearest match', () => {
  const bytes = Buffer.alloc(24 * 32 * 3);
  let state = 4217;
  for (let i = 0; i < bytes.length; i++) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; bytes[i] = state >>> 24; }
  assert.equal(rankVisualScan(bytes.toString('base64'), index).status, 'no_match');
});
