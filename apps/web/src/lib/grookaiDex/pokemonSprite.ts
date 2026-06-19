const POKEAPI_SPRITE_BASE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export function getPokemonSpriteUrl(nationalDexNumber: number | null | undefined) {
  if (!Number.isInteger(nationalDexNumber) || !nationalDexNumber || nationalDexNumber <= 0) {
    return null;
  }

  return `${POKEAPI_SPRITE_BASE_URL}/${nationalDexNumber}.png`;
}
