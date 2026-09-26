import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { scanTextEvidence, chooseEvidenceMatches, scanOrientations } from '../../apps/web/src/lib/stores/scanMatchV6.mjs';
import { scanOrientations as priorOrientations } from '../../apps/web/src/lib/stores/scanMatchV5.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = require('sharp');

test('split letters retain complete name and token boundaries', () => {
  assert.equal(scanTextEvidence('Rapid Strike E n e rgy', '', 'Rapid Strike Energy', '140').nameMatch, true);
  assert.equal(scanTextEvidence('M e w t w o', '', 'Mew', '1').nameMatch, false);
  assert.equal(scanTextEvidence('Mewtwo', '', 'Mew', '1').nameMatch, false);
  assert.equal(scanTextEvidence('Rapid Strike Enrgy', '', 'Rapid Strike Energy', '140').nameMatch, false);
  assert.equal(scanTextEvidence('Raticate', '', 'Alolan Raticate', '42').nameMatch, false);
  assert.equal(scanTextEvidence('Aloln Raticate', '', 'Alolan Raticate', '42').nameMatch, false);
  assert.equal(scanTextEvidence('', '', '', '42').nameMatch, false);
});

const catalog = [{ id: 'a', name: 'Electrode', number: '31' }, { id: 'b', name: 'Electrode', number: '22' }];
const score = { id: 'a', distance: .30, artDistance: .18, artGap: .50 };
const run = (title, footer, ranked) => chooseEvidenceMatches([{ title, footer, rotation: 0, ranked }], catalog);

test('moderate foil variation needs name, number, close illustration and separation together', () => {
  assert.equal(run('Electrode', '31/73', [score]).candidates[0].id, 'a');
  for (const patch of [{ distance: .401 }, { artDistance: .201 }, { artGap: .299 }]) {
    assert.equal(run('Electrode', '31/73', [{ ...score, ...patch }]).status, 'no_match');
  }
  assert.equal(run('Electrode', '', [score]).status, 'no_match');
  assert.equal(run('', '31/73', [score]).status, 'no_match');
  assert.equal(run('Electrode', '22/73', [score]).status, 'no_match');
});

test('shared artwork does not become a uniquely separated suggestion', () => {
  const shared = catalog.map(c => ({ id: c.id, distance: .4, artDistance: .01, artGap: 0 }));
  assert.equal(run('Electrode', '', shared).status, 'no_match');
  assert.deepEqual(run('Electrode', '31/73', shared).candidates.map(c => c.id), ['a']);
  assert.equal(run('Electrode', '31/73 22/73', shared).status, 'ambiguous');
});

test('canonical duplicates stay distinct and ambiguous', () => {
  const cards = [{ id: 'a', name: 'Alolan Raticate', number: '42' }, { id: 'b', name: 'Alolan Raticate', number: '042' }];
  const ranked = cards.map(c => ({ id: c.id, distance: .09, artDistance: .04, artGap: 0 }));
  const result = chooseEvidenceMatches([{ title: 'Alolan Raticate', footer: '042/078', rotation: 180, ranked }], cards);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every(c => !('printing' in c)));
});

test('larger internal OCR bitmap retains the upload bound and identical V5 descriptors', async () => {
  const pixels = Buffer.alloc(1400 * 2000 * 3); let seed = 19;
  for (let i = 0; i < pixels.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; pixels[i] = (seed >>> 25) + (Math.floor(i / 3 / 1400 / 150) % 2) * 100; }
  const upload = await sharp(pixels, { raw: { width: 1400, height: 2000, channels: 3 } }).jpeg({ quality: 80 }).toBuffer();
  assert.ok(upload.length < 4 * 1024 * 1024);
  const next = await scanOrientations(upload), previous = await priorOrientations(upload);
  assert.ok(next.some(r => r.bytes.length > 4 * 1024 * 1024));
  assert.deepEqual(next.map(r => ({ rotation: r.rotation, descriptor: r.descriptor })), previous.map(r => ({ rotation: r.rotation, descriptor: r.descriptor })));
  await assert.rejects(scanOrientations(Buffer.alloc(4 * 1024 * 1024 + 1)), /at most 4 MB/);
});
