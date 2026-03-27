const STABLE_CHILD_FINISH_KEYS = ['normal', 'holo', 'reverse'];

function normalizeVariantFlags(variants) {
  const finishes = [];

  if (!variants || typeof variants !== 'object') return finishes;

  for (const finishKey of STABLE_CHILD_FINISH_KEYS) {
    if (variants[finishKey] === true) {
      finishes.push(finishKey);
    }
  }

  return finishes;
}

export function normalizeFromTcgDex(variants) {
  return normalizeVariantFlags(variants);
}

export function normalizeFromPokemonApi(variants) {
  return normalizeVariantFlags(variants);
}
