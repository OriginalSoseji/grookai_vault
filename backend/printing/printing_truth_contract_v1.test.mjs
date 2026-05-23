import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeFromPokemonApi,
  normalizeFromTcgDex,
} from './finish_normalizer_v1.mjs';

test('printing truth normalizers fail closed on upstream boolean finish flags', () => {
  const variants = {
    normal: true,
    holo: true,
    reverse: true,
    reverseHolo: true,
  };

  assert.deepEqual(normalizeFromTcgDex(variants), []);
  assert.deepEqual(normalizeFromPokemonApi(variants), []);
});
