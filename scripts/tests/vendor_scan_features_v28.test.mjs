import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { runtime, read, assertFeaturesEqual } from './vendor_scan_features_support_v28.mjs';
import { encodeReferenceFeaturesV28 as encode, decodeReferenceFeaturesV28 as decode, featureHashV28 as hash, MAX_FEATURE_BYTES } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { prepareGeometryImage, verifyGeometryV23 } from '../../apps/web/src/lib/stores/scanGeometryV23.mjs';
const { cv, sharp } = await runtime();
const entry = read('.local/integration/vendor-scan-release-20260924/image-plan.private.json').images[0];
const image = fs.readFileSync(entry.source); assert.equal(hash(image), entry.sha256);
const reference = await prepareGeometryImage(cv, image), packed = encode(reference, entry.sha256);
const expected = { imageSha256: entry.sha256, artifactSha256: hash(packed) };
const raw = gunzipSync(packed), length = raw.readUInt32LE(), header = JSON.parse(raw.subarray(4, 4 + length));
function envelope(h, body = raw.subarray(4 + length)) {
  const text = Buffer.from(JSON.stringify(h)), size = Buffer.alloc(4); size.writeUInt32LE(text.length);
  return gzipSync(Buffer.concat([size, text, body]));
}
let allocations = 0;
const noCv = new Proxy({}, { get() { allocations++; throw new Error('Must reject before allocation'); } });
function reject(bytes, binding = { ...expected, artifactSha256: hash(bytes) }) {
  allocations = 0; assert.throws(() => decode(noCv, bytes, binding)); assert.equal(allocations, 0);
}
test('actual reference preserves pixels, every keypoint field, descriptors and matching result', () => {
  const restored = decode(cv, packed, expected);
  try {
    assertFeaturesEqual(reference, restored);
    assert.deepEqual(verifyGeometryV23(cv, reference, reference), verifyGeometryV23(cv, restored, reference));
    assert.deepEqual(encode(restored, entry.sha256), packed);
  } finally { restored.dispose(); restored.dispose(); }
});
test('blank and landscape references restore including zero descriptors and rotation', async () => {
  for (const [width, height] of [[640, 880], [880, 640]]) {
    const bytes = await sharp({ create: { width, height, channels: 3, background: '#ddd' } }).png().toBuffer();
    const prepared = await prepareGeometryImage(cv, bytes);
    let restored;
    try {
      assert.equal(prepared.points.size(), 0); const cache = encode(prepared, hash(bytes));
      restored = decode(cv, cache, { imageSha256: hash(bytes), artifactSha256: hash(cache) });
      assertFeaturesEqual(prepared, restored); assert.equal(restored.baseRotation, width > height ? 90 : 0);
    } finally { restored?.dispose(); prepared.dispose(); }
  }
});
for (const [name, h] of [
  ['wrong version', { ...header, version: 29 }], ['wrong contract', { ...header, contract: '0'.repeat(64) }],
  ['wrong image', { ...header, imageSha256: '0'.repeat(64) }], ['extra key', { ...header, extra: true }],
  ['dimensions', { ...header, width: 641 }], ['rotation', { ...header, baseRotation: 180 }],
  ['original count bound', { ...header, originalRows: 2049 }], ['balanced count bound', { ...header, balancedRows: 1153 }],
  ['negative count', { ...header, originalRows: -1 }], ['fractional count', { ...header, originalRows: 1.5 }],
]) test(name, () => reject(envelope(h)));
test('trusted digest mandatory and artifact tampering rejected', () => {
  reject(packed, {}); reject(packed, { ...expected, imageSha256: 'invalid' });
  const changed = Buffer.from(packed); changed[changed.length - 1] ^= 1; reject(changed, expected);
});
test('compressed and decoded limits, truncated bytes and trailing data', () => {
  for (const b of [Buffer.alloc(0), Buffer.alloc(MAX_FEATURE_BYTES + 1), gzipSync(Buffer.alloc(MAX_FEATURE_BYTES + 1)),
    packed.subarray(0, packed.length - 5), gzipSync(raw.subarray(0, raw.length - 1)), gzipSync(Buffer.concat([raw, Buffer.of(0)])), gzipSync(Buffer.alloc(3))]) reject(b);
});
test('invalid point coordinates, NaN, scale, angle and octave reject before allocation', () => {
  for (const [offset, value, integer] of [[0, NaN], [0, 640], [4, -1], [8, 0], [12, 361], [16, Infinity], [20, 32, true]]) {
    const changed = Buffer.from(raw), at = 4 + length + 640 * 880 + offset;
    if (integer) changed.writeInt32LE(value, at); else changed.writeFloatLE(value, at);
    reject(gzipSync(changed));
  }
});
for (let failAt = 1; failAt <= 5; failAt++) test('native allocation failure cleanup at object ' + failAt, () => {
  let attempts = 0, created = 0, deleted = 0;
  function allocate() { if (++attempts === failAt) throw new Error('allocation failure'); created++; }
  const fake = { CV_8UC1: 0, matFromArray() { allocate(); return { delete() { deleted++; } }; },
    KeyPointVector: class { constructor() { allocate(); } push_back() {} delete() { deleted++; } },
    Mat: class { constructor(n) { allocate(); this.data = new Uint8Array(n * 32); } delete() { deleted++; } } };
  assert.throws(() => decode(fake, packed, expected), /allocation failure/);
  assert.equal(created, failAt - 1); assert.equal(deleted, created);
});
test('point insertion failure also releases the image, vector and descriptor', () => {
  let deleted = 0;
  const fake = { CV_8UC1: 0, matFromArray() { return { delete() { deleted++; } }; },
    KeyPointVector: class { push_back() { throw new Error('point failure'); } delete() { deleted++; } },
    Mat: class { constructor(n) { this.data = new Uint8Array(n * 32); } delete() { deleted++; } } };
  assert.throws(() => decode(fake, packed, expected), /point failure/); assert.equal(deleted, 3);
});
test('all native objects are released once on successful disposal', () => {
  let deleted = 0;
  const fake = { CV_8UC1: 0, matFromArray() { return { delete() { deleted++; } }; },
    KeyPointVector: class { push_back() {} delete() { deleted++; } },
    Mat: class { constructor(n) { this.data = new Uint8Array(n * 32); } delete() { deleted++; } } };
  const value = decode(fake, packed, expected); value.dispose(); value.dispose(); assert.equal(deleted, 5);
});
test.after(() => reference.dispose());
