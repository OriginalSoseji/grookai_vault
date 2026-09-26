// Publish a local pinned manifest only after complete offline generation.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { featureHashV28 as hash, FEATURE_CONTRACT_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { validateFeatureManifestV29 } from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { loadReferenceMetadataV27, METADATA_SOURCE_SHA256 } from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
const read = p => JSON.parse(fs.readFileSync(p)), base = '.local/integration/vendor-scan-runtime-v29';
const artifact = 'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz', receipt = base + '/manifest.private.json';
assert.ok(!fs.existsSync(artifact) && !fs.existsSync(receipt));
const shards = [0, 1].map(n => read(base + '/windows-generated/shard-' + n + '.json'));
for (const shard of shards) { assert.ok(shard.finishedAt && !shard.error); assert.equal(shard.contractSha256, FEATURE_CONTRACT_SHA256); }
assert.equal(shards[0].planSha256, shards[1].planSha256);
const metadata = loadReferenceMetadataV27(new URL('../../apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz', import.meta.url));
const references = shards.flatMap(r => r.rows).sort((a, b) => a.id.localeCompare(b.id));
assert.equal(references.length, 20079); assert.equal(new Set(references.map(r => r.id)).size, 20079);
for (const row of references) {
  assert.equal(row.imageSha256, metadata.get(row.id)?.sha256); assert.ok(row.localSource.startsWith('.local/integration/vendor-scan-runtime-v28/regression2/features/') || row.localSource.startsWith(base + '/windows-generated/features/'));
  assert.ok(!row.localSource.includes('..')); const bytes = fs.readFileSync(row.localSource);
  assert.equal(bytes.length, row.bytes); assert.equal(hash(bytes), row.artifactSha256);
}
const value = { version: 'scan_reference_features_v29', sourceSha256: METADATA_SOURCE_SHA256, contractSha256: FEATURE_CONTRACT_SHA256,
  rows: references.map(({ id, imageSha256, artifactSha256, bytes }) => ({ id, imageSha256, artifactSha256, bytes })) };
assert.equal(validateFeatureManifestV29(value, metadata).size, 20079);
const raw = Buffer.from(JSON.stringify(value)), packed = gzipSync(raw, { level: 9 });
assert.ok(raw.length <= 8 * 1024 * 1024 && packed.length <= 4 * 1024 * 1024);
const pins = { sha256: hash(packed), bytes: packed.length, decodedBytes: raw.length };
const source = 'apps/web/src/lib/stores/scanFeatureManifestV29.mjs', original = fs.readFileSync(source, 'utf8');
const marker = "Object.freeze({ sha256: 'PENDING', bytes: 0, decodedBytes: 0 })"; assert.ok(original.includes(marker));
fs.writeFileSync(artifact, packed, { flag: 'wx' });
fs.writeFileSync(source, original.replace(marker, 'Object.freeze(' + JSON.stringify(pins) + ')'));
fs.writeFileSync(receipt, JSON.stringify({ at: new Date().toISOString(), pins, platform: 'win32', linuxQualified: false, references,
  summary: { references: references.length, featureBytes: references.reduce((n, r) => n + r.bytes, 0), reusedV28: references.filter(r => r.reusedV28).length,
    maxFeatureBytes: Math.max(...references.map(r => r.bytes)) } }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ ...pins, references: references.length, linuxQualified: false }));
