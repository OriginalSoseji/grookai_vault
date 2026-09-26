// Offline proof helpers. Import the network guard before loading the runtime.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { FEATURE_CONTRACT_V28 as contract, featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
export const read = p => JSON.parse(fs.readFileSync(p));
export async function runtime() {
  const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
  assert.equal(hash(fs.readFileSync(require.resolve('@techstark/opencv-js'))), contract.opencvSha256);
  assert.equal(require('@techstark/opencv-js/package.json').version, contract.opencv);
  const sharp = require('sharp');
  for (const key of ['sharp', 'vips', 'webp', 'mozjpeg']) assert.equal(sharp.versions[key], contract[key]);
  for (const n of [16, 19]) assert.equal(hash(fs.readFileSync(`apps/web/src/lib/stores/scanGeometryV${n}.mjs`)), contract[`prepare${n}`]);
  const cv = require('@techstark/opencv-js');
  if (!cv.Mat) await new Promise(resolve => { cv.onRuntimeInitialized = resolve; });
  return { cv, sharp, versions: sharp.versions, node: process.version, platform: process.platform, arch: process.arch };
}
export function assertFeaturesEqual(a, b) {
  assert.equal(a.baseRotation, b.baseRotation);
  assert.equal(b.image, b.original.image);
  assert.deepEqual(Buffer.from(a.image.data), Buffer.from(b.image.data));
  for (const [x, y] of [[a.original, b.original], [a, b]]) {
    assert.equal(x.points.size(), y.points.size());
    assert.equal(x.descriptor.rows, y.descriptor.rows);
    assert.deepEqual(Buffer.from(x.descriptor.data), Buffer.from(y.descriptor.data));
    for (let i = 0; i < x.points.size(); i++) assert.deepEqual(x.points.get(i), y.points.get(i));
  }
}
