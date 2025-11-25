// backend/pokemon/pokemonapi_trait_extractors.mjs
//
// Extracts standardized traits (types, rarity, supertype, card_category) from PokemonAPI card payloads.

export function extractTypesRarityCategory(payload) {
  const data = payload?.data ?? payload ?? {};
  const types =
    Array.isArray(data.types) && data.types.length > 0
      ? data.types.map((t) => String(t)).filter(Boolean)
      : null;
  const rarity = data.rarity ? String(data.rarity) : null;
  const supertype = data.supertype ? String(data.supertype) : null;
  const subtypes =
    Array.isArray(data.subtypes) && data.subtypes.length > 0
      ? data.subtypes.map((s) => String(s)).filter(Boolean)
      : [];

  let cardCategory = null;
  if (supertype === 'Pokémon') {
    cardCategory =
      subtypes.find((st) =>
        ['Basic', 'Stage 1', 'Stage 2', 'V', 'VMAX', 'VSTAR', 'ex', 'GX'].includes(st),
      ) ?? null;
  } else if (supertype === 'Trainer') {
    cardCategory = subtypes[0] ?? 'Trainer';
  } else if (supertype === 'Energy') {
    cardCategory = subtypes[0] ?? 'Energy';
  }

  return { types, rarity, supertype, cardCategory };
}
