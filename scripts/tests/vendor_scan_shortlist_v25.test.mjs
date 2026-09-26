import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareVisualIndex, VISUAL_VERSION, scoreVisualScan } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
import { rankStructure } from '../../apps/web/src/lib/stores/scanStructureV12.mjs';
import { rankDescriptorV25 } from '../../apps/web/src/lib/stores/scanShortlistV25.mjs';

function art(descriptor) {
  const b = Buffer.from(descriptor, 'base64'), gray = [];
  for (let y = 4; y < 16; y++) for (let x = 2; x < 22; x++) { const i = (y * 24 + x) * 3; gray.push((b[i] + b[i + 1] + b[i + 2]) / 3); }
  const mean = gray.reduce((a, b) => a + b, 0) / gray.length;
  const sd = Math.sqrt(gray.reduce((a, b) => a + (b - mean) ** 2, 0) / gray.length);
  return gray.map(n => (n - mean) / Math.max(14, sd));
}
let seed = 25;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed >>> 24; }
const base = Buffer.from(Array.from({ length: 2304 }, random));
const rows = Array.from({ length: 180 }, (_, i) => {
  const b = i % 7 === 0 ? Buffer.from(base) : Buffer.from(Array.from({ length: 2304 }, random));
  if (i % 7 === 0) for (let p = 16 * 24 * 3; p < b.length; p++) b[p] = i % 14 === 0 ? base[p] : random();
  return { id: '00000000-0000-4000-8000-' + i.toString(16).padStart(12, '0'), gv_id: 'TEST-' + i, sha256: '0'.repeat(64), descriptor: b.toString('base64') };
});
for (const arrangement of [rows, rows.slice().reverse(), rows.slice(0, 3), [rows[0]]]) {
  test('exact ranked scores, artwork ties and input order; count=' + arrangement.length + ' first=' + arrangement[0].gv_id, () => {
    const refs = prepareVisualIndex({ version: VISUAL_VERSION, references: arrangement });
    for (const descriptor of [base.toString('base64'), rows[5].descriptor, Buffer.alloc(2304, 128).toString('base64')]) {
      const query = art(descriptor), colors = scoreVisualScan(descriptor, refs);
      const arts = colors.map(c => {
        const feature = art(refs.find(r => r.id === c.id).descriptor);
        return { id: c.id, distance: query.reduce((s, n, i) => s + Math.min(4, (n - feature[i]) ** 2), 0) / query.length, color: c.distance };
      }).sort((a, b) => a.distance - b.distance).slice(0, 4);
      assert.deepEqual(rankDescriptorV25(descriptor, refs), [colors.slice(0, 6), rankStructure(descriptor, arrangement).slice(0, 6), arts]);
    }
  });
}
