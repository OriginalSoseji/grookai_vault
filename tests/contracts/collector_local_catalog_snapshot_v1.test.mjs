import test from 'node:test';
import assert from 'node:assert/strict';
import { guardSourceRequest, guardDestination, sourceOrigin, validateSnapshot } from '../../scripts/preview/load_public_catalog_local.mjs';

test('source allows only bounded public catalog GET endpoints', () => {
  for (const table of ['card_prints', 'sets', 'card_printings']) assert.doesNotThrow(() => guardSourceRequest(`${sourceOrigin}/rest/v1/${table}?limit=20`));
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.throws(() => guardSourceRequest(`${sourceOrigin}/rest/v1/card_prints`, { method }));
  for (const route of ['rpc/apply', 'vault_items', '../auth/v1/user']) assert.throws(() => guardSourceRequest(`${sourceOrigin}/rest/v1/${route}`));
  assert.throws(() => guardSourceRequest('https://elsewhere.example/rest/v1/card_prints'));
});

test('destination refuses production, another port, and deceptive hostnames', () => {
  assert.doesNotThrow(() => guardDestination('http://127.0.0.1:54321'));
  for (const url of [sourceOrigin, 'http://127.0.0.1:54322', 'http://127.0.0.1.evil.test:54321']) assert.throws(() => guardDestination(url));
});

function fixture() {
  const sets = ['sv03.5', 'sv02', 'sv06', 'sv08', 'sv8pt5'].map((code, id) => ({ id: String(id), code, game: 'pokemon' }));
  return { sets, cards: Array.from({ length: 20 }, (_, id) => ({ id: String(id), gv_id: `GV-${id}`, set_id: '0', set_code: 'sv03.5' })), printings: [{ id: 'printing', card_print_id: '0' }] };
}

test('snapshot preserves unique identity and foreign-key membership', () => {
  assert.doesNotThrow(() => validateSnapshot(fixture()));
  const duplicate = fixture(); duplicate.cards[1] = duplicate.cards[0];
  assert.throws(() => validateSnapshot(duplicate));
  const detached = fixture(); detached.printings[0].card_print_id = 'missing';
  assert.throws(() => validateSnapshot(detached));
  const wrongGame = fixture(); wrongGame.sets[0].game = 'mtg';
  assert.throws(() => validateSnapshot(wrongGame));
});
