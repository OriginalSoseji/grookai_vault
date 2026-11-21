import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { collectOfficialJapaneseIdentitySnapshotsV1, officialJapaneseNamesByCoordinateV1 } from '../../backend/catalog/japanese_official_identity_evidence_v1.mjs';
import { isOptionalCatalogSourceFallbackV1 } from '../../backend/catalog/universal_catalog_discovery_v1.mjs';

const pool = async (items, _concurrency, fn) => Promise.all(items.map(fn));
const snapshot = (id, name, number = '039', set = 'SI') => {
  const url = `https://www.pokemon-card.com/card-search/details.php/card/${id}/regu/all`;
  const body = `<h1 class="Heading1">${name}</h1><div class="subtext"><img class="img-regulation" alt="${set}">${number} / 414</div>`;
  return { request_url: url, final_url: url, http_status: 200, body, body_sha256: createHash('sha256').update(body).digest('hex') };
};
test('reparses original official evidence and exposes coordinate conflicts', () => {
  const a = snapshot('40529', 'ワタシラガ');
  const b = snapshot('40530', '違う名前');
  const result = officialJapaneseNamesByCoordinateV1([a, b, snapshot('123', 'wrong set', '039', 'OTHER')], 'SI', (n) => String(Number(n)));
  assert.deepEqual([...result.get('39').names].sort(), ['ワタシラガ', '違う名前'].sort());
  assert.equal(result.get('39').refs.length, 2);
  a.body += 'tamper';
  assert.equal(officialJapaneseNamesByCoordinateV1([a], 'SI', (n) => String(Number(n))).size, 0);
});
test('bounds and deduplicates source requests and isolates failed details', async () => {
  const cache = new Map();
  const calls = [];
  const args = { cards: [{ card_id: '1' }, { card_id: '1' }, { card_id: '2' }, { card_id: 'bad' }], cache, limit: 2, pool, isExpectedFailure: (error) => error.message === 'offline', fetchDetail: async (id) => { calls.push(id); if (id === '2') throw Error('offline'); return snapshot(id, 'name'); } };
  assert.equal((await collectOfficialJapaneseIdentitySnapshotsV1(args)).length, 1);
  assert.deepEqual(calls.sort(), ['1', '2']);
  assert.equal((await collectOfficialJapaneseIdentitySnapshotsV1(args)).length, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(await collectOfficialJapaneseIdentitySnapshotsV1({ ...args, cards: [{card_id:'3'}] }), []);
  await assert.rejects(collectOfficialJapaneseIdentitySnapshotsV1({ ...args, cache: new Map(), fetchDetail: async () => { throw Error('unexpected corruption'); } }), /unexpected corruption/);
});
test('official detail access denials fail instead of being cached as missing', async () => {
  for (const status of [401, 403]) {
    const denied = Object.assign(new Error('access denied'), { httpStatus: status, catalogSourceFailureClass: 'SOURCE_ACCESS_DENIED' });
    const cache = new Map();
    await assert.rejects(collectOfficialJapaneseIdentitySnapshotsV1({ cards: [{ card_id: '1' }], cache, limit: 1, pool, isExpectedFailure: isOptionalCatalogSourceFallbackV1, fetchDetail: async () => { throw denied; } }), /access denied/);
    assert.equal(cache.has('1'), false);
  }
  assert.equal(isOptionalCatalogSourceFallbackV1({ httpStatus: 404, catalogSourceFailureClass: 'SOURCE_INTEGRITY_FAILURE' }), true);
  assert.equal(isOptionalCatalogSourceFallbackV1({ httpStatus: 403, catalogSourceFailureClass: 'SOURCE_UNAVAILABLE' }), false);
});
