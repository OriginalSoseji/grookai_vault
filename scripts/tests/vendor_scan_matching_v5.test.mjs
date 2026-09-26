import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseEvidenceMatches } from '../../apps/web/src/lib/stores/scanMatchV5.mjs';

const catalog = [{ id: 'a', name: 'Staryu', number: '28' }, { id: 'b', name: 'Staryu', number: '13' }];
const run = (footer, scores, title = 'Staryu') => chooseEvidenceMatches([{ title, footer, rotation: 180, ranked: scores }], catalog);
const sameArtwork = catalog.map(c => ({ id: c.id, distance: .40, artDistance: .01, artGap: 0 }));
const unique = [{ id: 'a', distance: .70, artDistance: .02, artGap: .5 }];

test('foil differences allow number and close illustration to resolve same-art reprints', () => {
  assert.deepEqual(run('028/181', sameArtwork).candidates.map(c => c.id), ['a']);
  assert.deepEqual(run('013/068', sameArtwork).candidates.map(c => c.id), ['b']);
  assert.equal(run('', sameArtwork).status, 'no_match');
});

test('two readable reprint identities stay ambiguous', () => {
  const result = run('028/181 013/068', sameArtwork);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidates.length, 2);
});

test('exact name and uniquely close artwork may suggest a parent without guessing a number', () => {
  const result = run('', unique);
  assert.equal(result.candidates[0].evidence, 'name_unique_close_artwork');
  assert.equal(result.candidates[0].rotation, 180);
  assert.ok(!('printing' in result.candidates[0]));
});

test('readable conflicting number vetoes even uniquely close artwork', () => {
  assert.equal(run('013/068', unique).status, 'no_match');
});

test('unreadable number needs both a strict artwork distance and a large margin', () => {
  for (const values of [{ artDistance: .051 }, { artGap: .299 }, { artDistance: undefined }, { artGap: undefined }, { artGap: Infinity }]) {
    assert.equal(run('', [{ ...unique[0], ...values }]).status, 'no_match');
  }
});

test('similar names, missing titles, or body-only names cannot rescue a scan', () => {
  assert.equal(run('Staryu 028/181', unique, '').status, 'no_match');
  assert.equal(run('028/181', unique, 'Starmie').status, 'no_match');
  const cards = [{ id: 'a', name: 'Mew', number: '28' }];
  assert.equal(chooseEvidenceMatches([{ title: 'Mewtwo', footer: '028/181', rotation: 0, ranked: unique }], cards).status, 'no_match');
});

test('coincidental name and number do not rescue distant illustration and whole card', () => {
  assert.equal(run('028/181', [{ ...unique[0], artDistance: .1, artGap: .5 }]).status, 'no_match');
});

test('two canonical identities with identical artwork and number remain ambiguous', () => {
  const duplicateCatalog = catalog.map(c => ({ ...c, number: '28' }));
  const result = chooseEvidenceMatches([{ title: 'Staryu', footer: '028/181', rotation: 0, ranked: sameArtwork }], duplicateCatalog);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidates.length, 2);
});
