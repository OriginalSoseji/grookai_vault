import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { balancedFeatureIndices } from '../../apps/web/src/lib/stores/scanGeometryV19.mjs';

test('dense title text cannot consume artwork feature slots', () => {
  const points = Array.from({ length: 500 }, (_, i) => ({ pt: { x: 20 + i % 100, y: 40 }, response: 1000 - i }));
  points.push({ pt: { x: 200, y: 300 }, response: .001 });
  const indices = balancedFeatureIndices(points);
  assert.equal(indices.length, 49);
  assert.ok(indices.includes(500));
  assert.deepEqual(indices.slice(0, 48), Array.from({ length: 48 }, (_, i) => i));
});

test('feature count stays bounded, deterministic and free of duplicate rows', () => {
  const points = [];
  for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) for (let i = 0; i < 100; i++) {
    points.push({ pt: { x: x * 160 + 20, y: y * 880 / 6 + 20 }, response: 1 });
  }
  const indices = balancedFeatureIndices(points);
  assert.equal(indices.length, 24 * 48);
  assert.equal(new Set(indices).size, indices.length);
  assert.deepEqual(balancedFeatureIndices(points), indices);
});

test('invalid or outside-image features cannot supply geometry evidence', () => {
  assert.deepEqual(balancedFeatureIndices([
    { pt: { x: -1, y: 20 }, response: 1 }, { pt: { x: 640, y: 20 }, response: 1 },
    { pt: { x: 20, y: 880 }, response: 1 }, { pt: { x: NaN, y: 20 }, response: 1 },
    { pt: { x: 20, y: 20 }, response: NaN },
  ]), []);
});
