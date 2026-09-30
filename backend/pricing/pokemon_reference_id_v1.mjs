// Preserve exact provider identities, including Unseen Forces Unown punctuation.
// These two IDs are published in PokemonTCG/pokemon-tcg-data/cards/en/ex10.json.
// Do not trim, rewrite, infer or admit arbitrary URL/query syntax.
export function isPokemonReferenceIdV1(id) {
  return typeof id === 'string' &&
    (/^[a-zA-Z0-9_-]{1,100}$/.test(id) || id === 'ex10-?' || id === 'ex10-!');
}
