import test from 'node:test';
import assert from 'node:assert/strict';
import { collectrPokemonEdition, matchesCollectrPokemonEdition } from '../../supabase/functions/vault-import-collection-v2/pokemon_edition.ts';
import { matchesCollectrPokemonName } from '../../supabase/functions/vault-import-collection-v2/pokemon_name.ts';

test('Collectr edition variance preserves edition and finish separately', () => {
  const cases = [
    ['1st Edition', 'first_edition', 'normal'],
    ['First Edition Holofoil', 'first_edition', 'holo'],
    ['Shadowless', 'shadowless', 'normal'],
    ['Unlimited', 'unlimited', 'normal'],
    ['Unlimited Holofoil', 'unlimited', 'holo'],
  ];
  for (const [variance, editionKey, finishKey] of cases) {
    assert.deepEqual(collectrPokemonEdition({ set: 'Jungle', variance }), {
      editionKey, finishKey, recognizedVariance: true,
    });
  }
  assert.deepEqual(collectrPokemonEdition({ set: 'Base Set (Unlimited)', variance: 'Holofoil' }), {
    editionKey: 'unlimited', finishKey: null, recognizedVariance: false,
  });
});

test('catalog edition matcher accepts only governed Base Set and Jungle identities', () => {
  const matches = (editionKey, set_code, printed_identity_modifier = null, variant_key = null) =>
    matchesCollectrPokemonEdition({ editionKey, card: { set_code, printed_identity_modifier, variant_key } });
  assert.equal(matches('unlimited', 'base1'), true);
  assert.equal(matches('unlimited', 'base1', 'e3_stamp', 'e3_stamp'), false);
  assert.equal(matches('first_edition', 'base1', 'edition:first_edition;print_run:shadowless;color:yellow_cheeks', 'first_edition_yellow_cheeks'), true);
  assert.equal(matches('shadowless', 'base1', 'print_run:shadowless;color:red_cheeks', 'shadowless_red_cheeks'), true);
  assert.equal(matches('shadowless', 'base1', 'print_run:shadowless;stamp_error:ghost_first_edition', 'ghost_stamp_shadowless'), false);
  assert.equal(matches('first_edition', 'base2', 'edition:first_edition'), true);
  assert.equal(matches('unlimited', 'base2', 'edition:first_edition'), false);
  assert.equal(matches('first_edition', 'base3'), false);
});

test('Base Set cheek labels require matching printed color evidence', () => {
  const card = {
    name: 'Pikachu', number: '58', set_code: 'base1', identity_domain: 'pokemon_eng_standard', language: 'en',
    variant_key: 'first_edition_yellow_cheeks',
    printed_identity_modifier: 'edition:first_edition;print_run:shadowless;color:yellow_cheeks',
  };
  assert.equal(matchesCollectrPokemonName({ sourceName: 'Pikachu (Yellow Cheeks)', sourceNumber: '58', game: 'pokemon', card }), true);
  assert.equal(matchesCollectrPokemonName({ sourceName: 'Pikachu (Red Cheeks)', sourceNumber: '58', game: 'pokemon', card }), false);
});
