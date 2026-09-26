import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { scanTextEvidence, chooseEvidenceMatches, scanOrientations } from '../../apps/web/src/lib/stores/scanMatchV2.mjs';
import { scanDescriptor } from '../../apps/web/src/lib/stores/visualMatchCore.mjs';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = require('sharp');
const catalog = [{ id: 'mew', name: 'Mew ex', number: '151' }, { id: 'tentacruel', name: 'Tentacruel', number: '073' }];
const observation = (title, footer, score, rest = {}) => ({ rotation: 180, title, footer, ranked: [{ id: 'tentacruel', distance: score, ...rest }, { id: 'mew', distance: 1.2 }] });

test('printed names use whole tokens; suffix marks do not establish a finish', () => {
  assert.equal(scanTextEvidence('Mewtwo ex', '151/165', 'Mew ex', '151').nameMatch, false);
  assert.equal(scanTextEvidence('Mew 180', '151/165', 'Mew ex', '151').nameMatch, true);
  assert.equal(scanTextEvidence("Farfetch’d", '083/165', "Farfetch'd", '083').nameMatch, true);
});
test('recognizable foreign card numbers veto weak visual guesses', () => {
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '128/198', .07)], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('Greedent', '128/198', .275)], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('Revavroom', '142/198', .292)], catalog).status, 'no_match');
});
test('looser image evidence needs both printed name and number', () => {
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '', .55)], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('', '073/165', .55)], catalog).status, 'no_match');
  const result = chooseEvidenceMatches([observation('Tentacruel', '073/165', .55)], catalog);
  assert.equal(result.candidates[0].id, 'tentacruel');
  assert.equal(result.candidates[0].rotation, 180);
  assert.ok(!('printing' in result.candidates[0]));
});
test('separated illustration evidence needs an exact title and a large runner-up gap', () => {
  assert.equal(chooseEvidenceMatches([observation('', '', .4, { artDistance: .2, artGap: .6 })], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '', .4, { artDistance: .2, artGap: .1 })], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '', .4, { artDistance: .2, artGap: .6 })], catalog).status, 'suggestions');
});
test('different canonical candidates stay ambiguous and orientations never duplicate one identity', () => {
  const observations = [observation('Tentacruel', '073/165', .2), { ...observation('Mew', '151/165', .2), rotation: 0, ranked: [{ id: 'mew', distance: .2 }] }];
  const result = chooseEvidenceMatches([...observations, observations[0]], catalog);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidates.length, 2);
});
test('extreme noise, impossible OCR fractions and missing catalog records cannot mint identities', () => {
  assert.equal(scanTextEvidence('Tentacruel', '702/165', 'Tentacruel', '073').numberConflict, false);
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '073/165', 1.3)], catalog).status, 'no_match');
  assert.equal(chooseEvidenceMatches([observation('Tentacruel', '073/165', .01)], []).status, 'no_match');
});
test('all quarter turns are compared without changing caller bytes', async () => {
  const pixels = Buffer.alloc(280 * 400 * 3);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 280; x++) { const i = (y * 280 + x) * 3; pixels[i] = y % 256; pixels[i + 1] = x % 256; pixels[i + 2] = (x + y) % 256; }
  const original = await sharp(pixels, { raw: { width: 280, height: 400, channels: 3 } }).png().toBuffer();
  for (const angle of [0, 90, 180, 270]) {
    const bytes = await sharp(original).rotate(angle).png().toBuffer(), copy = Buffer.from(bytes);
    const scans = await scanOrientations(bytes);
    assert.deepEqual(scans.map(s => s.rotation), angle % 180 ? [90, 270] : [0, 180]);
    const restored = scans.find(s => (s.rotation + angle) % 360 === 0);
    const expected = await sharp(original).resize({ width: 1000 }).png().toBuffer();
    assert.equal(restored.descriptor, await scanDescriptor(expected));
    assert.deepEqual(bytes, copy);
  }
});
test('decode bounds still reject damaged, blank, multi-card and oversized inputs', async () => {
  await assert.rejects(scanOrientations(Buffer.from('broken')));
  await assert.rejects(scanOrientations(Buffer.alloc(4 * 1024 * 1024 + 1)), /4 MB/);
  await assert.rejects(scanOrientations(await sharp({ create: { width: 900, height: 450, channels: 3, background: '#fff' } }).png().toBuffer()), /one card/);
  await assert.rejects(scanOrientations(await sharp({ create: { width: 280, height: 400, channels: 3, background: '#fff' } }).png().toBuffer()), /detail/);
});
