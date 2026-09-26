import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateFeatureManifestV29, loadFeatureManifestV29 } from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { METADATA_SOURCE_SHA256, loadReferenceMetadataV27 } from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const byId = new Map(Array.from({ length: 20079 }, (_, i) => {
  const id = '00000000-0000-4000-8000-' + i.toString(16).padStart(12, '0'); return [id, { sha256: 'a'.repeat(64) }];
}));
const value = { version: 'scan_reference_features_v29', sourceSha256: METADATA_SOURCE_SHA256, contractSha256: FEATURE_CONTRACT_SHA256,
  rows: [...byId.keys()].map(id => ({ id, imageSha256: 'a'.repeat(64), artifactSha256: 'b'.repeat(64), bytes: 100 })) };
test('all identities are bound to their original image hashes with immutable rows', () => {
  const result = validateFeatureManifestV29(value, byId); assert.equal(result.size, 20079);
  assert.ok(Object.isFrozen(result.values().next().value));
});
test('catalog, engine, version and envelope schema must match', () => {
  for (const changed of [{ ...value, sourceSha256: '0'.repeat(64) }, { ...value, contractSha256: '0'.repeat(64) },
    { ...value, version: 'v99' }, { ...value, extra: true }, { ...value, rows: value.rows.slice(1) }])
    assert.throws(() => validateFeatureManifestV29(changed, byId));
});
test('duplicate, foreign, wrong-image, malformed and oversized rows cannot enter a manifest', () => {
  const row = value.rows[0];
  for (const changed of [value.rows[1], { ...row, id: 'unknown' }, { ...row, imageSha256: 'c'.repeat(64) },
    { ...row, artifactSha256: ['b'.repeat(64)] }, { ...row, artifactSha256: 'x' }, { ...row, bytes: 0 },
    { ...row, bytes: 1048577 }, { ...row, bytes: NaN }, { ...row, bytes: 1.5 }, { ...row, path: '../forged' }])
    assert.throws(() => validateFeatureManifestV29({ ...value, rows: [changed, ...value.rows.slice(1)] }, byId));
});
test('actual pinned full manifest loads, missing/truncated/same-size tampered files fail', () => {
  const metadata = loadReferenceMetadataV27(new URL('../../apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz', import.meta.url));
  const file = new URL('../../apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz', import.meta.url);
  const valid = fs.readFileSync(file); assert.equal(loadFeatureManifestV29(file, metadata).size, 20079);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gv-features-v29-'));
  assert.throws(() => loadFeatureManifestV29(path.join(dir, 'absent'), metadata));
  for (const [name, bytes] of [['truncated', valid.subarray(1)], ['tampered', Buffer.from(valid)]]) {
    if (name === 'tampered') bytes[100] ^= 1; const target = path.join(dir, name); fs.writeFileSync(target, bytes);
    assert.throws(() => loadFeatureManifestV29(target, metadata));
  }
});
