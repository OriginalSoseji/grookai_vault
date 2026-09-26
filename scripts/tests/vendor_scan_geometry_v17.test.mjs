import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { geometryFrame, regionCorrelation } from '../../apps/web/src/lib/stores/scanGeometryV16.mjs';
import { verifyIdentityRegions } from '../../apps/web/src/lib/stores/scanGeometryV17.mjs';

function texturedFooter() {
  const data = new Uint8Array(640 * 880);
  for (let y = 783; y < 861; y++) for (let x = 20; x < 620; x++) {
    data[y * 640 + x] = 40 + ((x * 31 + y * 17) % 160);
  }
  return data;
}

test('geometry rejects reflected, collapsed, out-of-frame and invalid projections', () => {
  assert.equal(geometryFrame([-1, 0, 640, 0, 1, 0, 0, 0, 1]), null);
  assert.equal(geometryFrame([0, 0, 0, 0, 1, 0, 0, 0, 1]), null);
  assert.equal(geometryFrame([1, 0, 800, 0, 1, 0, 0, 0, 1]), null);
  assert.equal(geometryFrame([1, 0, 0, 0, 1, 0, 0, 0, 0]), null);
  assert.equal(geometryFrame([NaN, 0, 0, 0, 1, 0, 0, 0, 1]), null);
});

test('geometry preserves upright and upside-down orientation', () => {
  assert.deepEqual(geometryFrame([1, 0, 0, 0, 1, 0, 0, 0, 1]), { turn: 0, area: 1 });
  assert.deepEqual(geometryFrame([-1, 0, 640, 0, -1, 880, 0, 0, 1]), { turn: 180, area: 1 });
});

test('matching detailed footer survives a uniform exposure change', () => {
  const reference = texturedFooter(), scan = reference.map(value => value + 15);
  assert.equal(verifyIdentityRegions(reference, scan).length, 12);
});

test('local identity disagreement fails even when broad footer correlation passes', () => {
  const reference = texturedFooter(), scan = reference.slice();
  for (let y = 783; y < 822; y++) for (let x = 20; x < 120; x++) {
    scan[y * 640 + x] = 255 - reference[y * 640 + x];
  }
  assert.ok(regionCorrelation(reference, scan, 640, [20, 783, 620, 862]) > .65);
  assert.equal(verifyIdentityRegions(reference, scan), null);
});

test('blank, obscured, undersized or insufficiently detailed identity regions abstain', () => {
  const reference = texturedFooter(), blank = new Uint8Array(640 * 880);
  assert.equal(verifyIdentityRegions(blank, blank), null);
  assert.equal(verifyIdentityRegions(reference, blank), null);
  assert.equal(verifyIdentityRegions(new Uint8Array(12), new Uint8Array(12)), null);
  const sparse = blank.slice();
  for (let y = 783; y < 822; y++) for (let x = 20; x < 120; x++) sparse[y * 640 + x] = reference[y * 640 + x];
  assert.equal(verifyIdentityRegions(sparse, sparse), null);
});
